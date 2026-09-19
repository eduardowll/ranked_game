import random

from google.cloud import firestore
from src.database import db
from src.models.tournament import TournamentTheme

class TournamentRepository:
    def __init__(self):
        # Aponta para a coleção 'tournaments' no Firestore
        self.collection = db.collection('tournaments')

    def create_tournament(self, theme: TournamentTheme):
        """Cria um novo torneio e deixa o Firebase gerar um ID único automaticamente"""
        data = theme.model_dump(exclude={'id'})
        
        doc_time, doc_ref = self.collection.add(data)
        
        theme.id = doc_ref.id
        return theme

    def update_video_statistics(self, tournament_id: str, statistics: dict):
        doc_ref = self.collection.document(tournament_id)
        doc_ref.update({'estatisticas_videos': statistics})
        return self.get_tournament(tournament_id)

    def get_tournament(self, tournament_id: str) -> TournamentTheme:
        """Busca os detalhes de um torneio específico pelo ID"""
        doc = self.collection.document(tournament_id).get()
        if doc.exists:
            data = doc.to_dict()
            if data.get('estado') == 'finalizado':
                data['estado'] = 'aberto'
            data['id'] = doc.id 
            return TournamentTheme(**data)
        return None

    def update_video_ids(self, tournament_id: str, video_ids):
        """Atualiza a lista de vídeos sem criar outro torneio."""
        doc_ref = self.collection.document(tournament_id)
        doc_ref.update({'video_ids': video_ids})
        return self.get_tournament(tournament_id)

    def add_video_to_all_tournaments(self, video_id: str):
        """Adiciona uma música nova a todos os torneios existentes."""
        for tournament in self.get_all_tournaments():
            if tournament.estado != 'aberto':
                continue

            video_ids = list(tournament.video_ids)
            if video_id in video_ids:
                continue

            video_ids.append(video_id)
            statistics = dict(tournament.estatisticas_videos or {})
            statistics[video_id] = {
                'duelos_jogados': 0,
                'duelos_vencidos': 0,
                'torneios_vencidos': 0,
            }
            self.collection.document(tournament.id).update({
                'video_ids': video_ids,
                'estatisticas_videos': statistics,
            })

    def start_tournament(self, tournament_id: str):
        """Cria ou recupera a partida persistida do torneio."""
        transaction = db.transaction()
        document = self.collection.document(tournament_id)

        @firestore.transactional
        def start(transaction):
            snapshot = document.get(transaction=transaction)
            if not snapshot.exists:
                return None

            data = snapshot.to_dict()
            estado = data.get('estado', 'aberto')
            if estado == 'em_andamento' and data.get('partida'):
                return TournamentTheme(id=snapshot.id, **data)

            video_ids = list(data.get('video_ids', []))
            random.shuffle(video_ids)
            partida = {
                'fila_ids': video_ids,
                'vencedores_ids': [],
                'rodada': 1,
                'duelo_atual': 1,
                'duelos_na_rodada': (len(video_ids) + 1) // 2,
            }
            transaction.update(document, {'estado': 'em_andamento', 'partida': partida})
            data['estado'] = 'em_andamento'
            data['partida'] = partida
            return TournamentTheme(id=snapshot.id, **data)

        return start(transaction)

    def register_match(self, tournament_id: str, winner_id: str, loser_id: str):
        """Registra duelo, atualiza estatísticas e avança a partida atomicamente."""
        transaction = db.transaction()
        document = self.collection.document(tournament_id)

        @firestore.transactional
        def update(transaction):
            snapshot = document.get(transaction=transaction)
            if not snapshot.exists:
                raise ValueError('Torneio não encontrado.')

            data = snapshot.to_dict()
            if data.get('estado', 'aberto') != 'em_andamento':
                raise ValueError('Torneio não está em andamento.')

            partida = dict(data.get('partida') or {})
            fila_ids = list(partida.get('fila_ids', []))
            if fila_ids[:2] != [winner_id, loser_id] and fila_ids[:2] != [loser_id, winner_id]:
                raise ValueError('Duelo inválido para a partida atual.')

            statistics = dict(data.get('estatisticas_videos') or {})
            for video_id in (winner_id, loser_id):
                statistics.setdefault(video_id, {
                    'duelos_jogados': 0,
                    'duelos_vencidos': 0,
                    'torneios_vencidos': 0,
                })
                statistics[video_id]['duelos_jogados'] += 1
            statistics[winner_id]['duelos_vencidos'] += 1

            vencedores = list(partida.get('vencedores_ids', []))
            vencedores.append(winner_id)
            fila_restante = fila_ids[2:]
            rodada = int(partida.get('rodada', 1))

            if fila_restante:
                nova_fila = fila_restante
                nova_rodada = rodada
                novo_duelo = int(partida.get('duelo_atual', 1)) + 1
                vencedores_da_rodada = vencedores

                if len(nova_fila) == 1:
                    nova_fila = vencedores + nova_fila
                    vencedores_da_rodada = []
                    nova_rodada += 1
                    novo_duelo = 1
            else:
                if len(vencedores) == 1:
                    campeao = vencedores[0]
                    statistics[campeao]['torneios_vencidos'] += 1
                    data['estado'] = 'aberto'
                    data['partida'] = {
                        'fila_ids': [campeao],
                        'vencedores_ids': [],
                        'rodada': rodada,
                        'duelo_atual': 1,
                        'duelos_na_rodada': 1,
                    }
                    transaction.update(document, {
                        'estado': 'aberto',
                        'partida': data['partida'],
                        'estatisticas_videos': statistics,
                    })
                    return TournamentTheme(id=snapshot.id, **data)

                nova_fila = vencedores
                vencedores_da_rodada = []
                nova_rodada = rodada + 1
                novo_duelo = 1

            partida = {
                'fila_ids': nova_fila,
                'vencedores_ids': vencedores_da_rodada,
                'rodada': nova_rodada,
                'duelo_atual': novo_duelo,
                'duelos_na_rodada': (len(nova_fila) + 1) // 2,
            }
            data['partida'] = partida
            data['estatisticas_videos'] = statistics
            transaction.update(document, {
                'partida': partida,
                'estatisticas_videos': statistics,
            })
            return TournamentTheme(id=snapshot.id, **data)

        return update(transaction)

    def get_all_tournaments(self):
        """Busca todos os torneios (Ideal para a tela inicial do site)"""
        docs = self.collection.stream()
        tournaments = []
        for doc in docs:
            data = doc.to_dict()
            if data.get('estado') == 'finalizado':
                data['estado'] = 'aberto'
            data['id'] = doc.id
            tournaments.append(TournamentTheme(**data))
        return tournaments
