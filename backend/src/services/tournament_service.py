import json
import random
import re
from typing import List
from urllib import request, error

from src.repositories.tournament_repository import TournamentRepository
from src.repositories.video_repository import VideoRepository
from src.models.tournament import VideoItem, TournamentTheme

class TournamentService:
    def __init__(self):
        # Conecta com a camada de banco de dados
        self.tournament_repo = TournamentRepository()
        self.video_repo = VideoRepository()

    @staticmethod
    def normalize_video_id(value: str) -> str:
        """Aceita tanto URL do YouTube quanto ID direto e devolve o ID do vídeo."""
        if value is None:
            raise ValueError("ID ou URL de vídeo inválido.")

        texto = str(value).strip()
        if not texto:
            raise ValueError("ID ou URL de vídeo inválido.")

        padrao_id = r"(?:v=|be/|embed/|shorts/)([A-Za-z0-9_-]{11})"
        match = re.search(padrao_id, texto)
        if match:
            return match.group(1)

        if re.fullmatch(r"[A-Za-z0-9_-]{11}", texto):
            return texto

        raise ValueError(f"URL ou ID de vídeo inválido: {value}")

    @staticmethod
    def get_youtube_title_from_url(video_url: str) -> str:
        """Tenta obter o título real do vídeo via oEmbed do YouTube."""
        try:
            url = f"https://noembed.com/embed?format=json&url={video_url}"
            with request.urlopen(url, timeout=10) as resposta:
                payload = json.loads(resposta.read().decode('utf-8'))
                if payload.get('title'):
                    return payload['title']
        except (error.URLError, error.HTTPError, ValueError, TimeoutError):
            pass
        return ""

    def hydrate_video_title(self, video: VideoItem) -> VideoItem:
        """Atualiza o nome do vídeo quando ele estiver vazio ou genérico."""
        if not video:
            return video

        nome_atual = (video.nome or '').strip()
        if nome_atual and not nome_atual.startswith('Vídeo '):
            return video

        nome_real = self.get_youtube_title_from_url(video.url)
        if not nome_real:
            return video

        video.nome = nome_real
        return self.video_repo.save_video(video)

    def ensure_video_exists(self, raw_value: str) -> VideoItem:
        """Garante que o vídeo exista no banco mesmo quando foi enviado como URL."""
        video_id = self.normalize_video_id(raw_value)
        video_data = self.video_repo.get_video(video_id)
        if video_data:
            return self.hydrate_video_title(video_data)

        video_url = raw_value.strip()
        if "youtube.com" not in video_url and "youtu.be" not in video_url:
            video_url = f"https://www.youtube.com/watch?v={video_id}"

        nome_real = self.get_youtube_title_from_url(video_url)

        video = VideoItem(
            video_id=video_id,
            url=video_url,
            nome=nome_real or f"Vídeo {video_id[:8]}"
        )
        return self.video_repo.save_video(video)

    def create_new_tournament(self, titulo: str, owner_uid: str) -> TournamentTheme:
        """Cria um torneio usando todo o catálogo global de músicas."""
        videos = self.video_repo.get_all_videos()
        if len(videos) < 2:
            raise ValueError("O torneio precisa de pelo menos 2 vídeos para acontecer.")

        ids_normalizados = [video.video_id for video in videos]

        novo_tema = TournamentTheme(
            titulo=titulo,
            video_ids=ids_normalizados,
            owner_uid=owner_uid,
            estatisticas_videos={
                video_id: {
                    'duelos_jogados': 0,
                    'duelos_vencidos': 0,
                    'torneios_vencidos': 0,
                }
                for video_id in ids_normalizados
            },
        )
        return self.tournament_repo.create_tournament(novo_tema)

    def add_video_to_catalog(self, raw_value: str) -> VideoItem:
        """Cadastra uma música global e sincroniza todos os torneios."""
        video = self.ensure_video_exists(raw_value)
        self.tournament_repo.add_video_to_all_tournaments(video.video_id)
        return video

    def update_video(self, old_video_id: str, raw_value: str) -> VideoItem:
        """Troca a URL de uma música e atualiza seu título pelo resultado do YouTube."""
        current_video = self.video_repo.get_video(old_video_id)
        if not current_video:
            raise ValueError('Música não encontrada.')

        new_video_id = self.normalize_video_id(raw_value)
        existing_video = self.video_repo.get_video(new_video_id)
        if existing_video and new_video_id != old_video_id:
            raise ValueError('A nova música já está cadastrada no catálogo.')

        new_url = raw_value.strip()
        if 'youtube.com' not in new_url and 'youtu.be' not in new_url:
            new_url = f'https://www.youtube.com/watch?v={new_video_id}'
        new_title = self.get_youtube_title_from_url(new_url)
        if not new_title:
            raise ValueError('Não foi possível obter o título da nova URL.')

        updated_video = VideoItem(video_id=new_video_id, url=new_url, nome=new_title)
        self.tournament_repo.replace_video_in_open_tournaments(old_video_id, new_video_id)
        self.video_repo.replace_video(old_video_id, updated_video)
        return updated_video

    def delete_video_from_catalog(self, video_id: str):
        if not self.video_repo.get_video(video_id):
            raise ValueError('Música não encontrada.')
        self.tournament_repo.remove_video_from_tournaments(video_id)
        self.video_repo.delete_video(video_id)

    def delete_tournament(self, tournament_id: str, owner_uid: str):
        tournament = self.tournament_repo.get_tournament(tournament_id)
        if not tournament:
            raise ValueError('Torneio não encontrado.')
        if tournament.owner_uid != owner_uid:
            raise PermissionError('Somente o proprietário pode excluir este torneio.')
        self.tournament_repo.delete_tournament(tournament_id)

    def get_shuffled_videos_for_tournament(self, tournament_id: str) -> List[VideoItem]:
        """
        Busca todos os vídeos do torneio e devolve uma lista 100% embaralhada.
        A lógica de byes (pular rodada) para números ímpares ou listas 
        gigantes será gerenciada pela Fila (Queue) no Frontend React.
        """
        tema = self.tournament_repo.get_tournament(tournament_id)
        if not tema:
            raise ValueError("Torneio não encontrado.")

        ids_disponiveis = []
        for valor in tema.video_ids:
            ids_disponiveis.append(self.normalize_video_id(valor))

        random.shuffle(ids_disponiveis)

        videos_para_duelar = []
        for v_id in ids_disponiveis:
            video_data = self.video_repo.get_video(v_id)
            if not video_data:
                video_data = self.ensure_video_exists(v_id)
            else:
                video_data = self.hydrate_video_title(video_data)
            videos_para_duelar.append(video_data)

        return videos_para_duelar

    def start_tournament(self, tournament_id: str):
        tema = self.tournament_repo.get_tournament(tournament_id)
        if not tema:
            raise ValueError('Torneio não encontrado.')

        video_ids = list(tema.video_ids)
        random.shuffle(video_ids)
        partida = {
            'fila_ids': video_ids,
            'vencedores_ids': [],
            'rodada': 1,
            'duelo_atual': 1,
            'duelos_na_rodada': (len(video_ids) + 1) // 2,
        }
        tema.partida = partida
        return self._build_match_response(tema)

    def _build_match_response(self, tema: TournamentTheme):
        partida = tema.partida or {}
        videos = []
        for video_id in partida.get('fila_ids', []):
            video = self.video_repo.get_video(video_id)
            if video:
                videos.append(self.hydrate_video_title(video))
        return {
            'torneio_id': tema.id,
            'videos': videos,
            'partida': partida,
            'estado': tema.estado,
        }

    def get_all_tournaments(self) -> List[TournamentTheme]:
        return self.tournament_repo.get_all_tournaments()

    def get_tournament_ranking(self, tournament_id: str, page: int = 1, page_size: int = 20):
        tema = self.tournament_repo.get_tournament(tournament_id)
        if not tema:
            raise ValueError("Torneio não encontrado.")

        statistics = tema.estatisticas_videos or {}
        ordered_ids = sorted(
            tema.video_ids,
            key=lambda video_id: (
                statistics.get(video_id, {}).get('torneios_vencidos', 0),
                statistics.get(video_id, {}).get('duelos_vencidos', 0),
            ),
            reverse=True,
        )
        total = len(ordered_ids)
        start = (page - 1) * page_size
        ranking = []
        for video_id in ordered_ids[start:start + page_size]:
            video = self.video_repo.get_video(self.normalize_video_id(video_id))
            if not video:
                continue

            stats = statistics.get(video.video_id, {})
            duelos = stats.get('duelos_jogados', 0)
            duelos_vencidos = stats.get('duelos_vencidos', 0)
            porcentagem_vitoria = (duelos_vencidos / duelos * 100) if duelos else 0
            ranking.append({
                "video_id": video.video_id,
                "nome": video.nome,
                "url": video.url,
                "torneios_vencidos": stats.get('torneios_vencidos', 0),
                "duelos_jogados": duelos,
                "duelos_vencidos": duelos_vencidos,
                "porcentagem_vitoria": round(porcentagem_vitoria, 1),
            })

        return {
            'items': ranking,
            'total': total,
            'page': page,
            'page_size': page_size,
        }

    def register_match_winner(self, tournament_id: str, vencedor_id: str, perdedor_id: str):
        tema = self.tournament_repo.register_match(tournament_id, vencedor_id, perdedor_id)
        return self._build_match_response(tema)

    def save_tournament_result(self, tournament_id: str, champion_id: str, statistics: dict):
        tema = self.tournament_repo.get_tournament(tournament_id)
        if not tema:
            raise ValueError('Torneio não encontrado.')
        if champion_id not in tema.video_ids:
            raise ValueError('Campeão não pertence a este torneio.')

        current_statistics = dict(tema.estatisticas_videos or {})
        for video_id, result in statistics.items():
            if video_id not in tema.video_ids:
                raise ValueError('Estatística contém vídeo fora do torneio.')
            previous = current_statistics.setdefault(video_id, {
                'duelos_jogados': 0,
                'duelos_vencidos': 0,
                'torneios_vencidos': 0,
            })
            previous['duelos_jogados'] += int(result.get('duelos_jogados', 0))
            previous['duelos_vencidos'] += int(result.get('duelos_vencidos', 0))

        champion_statistics = current_statistics.setdefault(champion_id, {
            'duelos_jogados': 0,
            'duelos_vencidos': 0,
            'torneios_vencidos': 0,
        })
        champion_statistics['torneios_vencidos'] += 1
        self.tournament_repo.complete_local_tournament(tournament_id, current_statistics)

    def finish_tournament(self, tournament_id: str, campeao_id: str):
        raise ValueError('A finalização é feita automaticamente ao registrar o último duelo.')