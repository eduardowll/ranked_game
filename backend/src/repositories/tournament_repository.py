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

    def get_all_tournaments(self):
        """Busca todos os torneios (Ideal para a tela inicial do site)"""
        docs = self.collection.stream()
        tournaments = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            tournaments.append(TournamentTheme(**data))
        return tournaments
