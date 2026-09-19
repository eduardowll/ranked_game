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

    def create_new_tournament(self, titulo: str) -> TournamentTheme:
        """Cria um torneio usando todo o catálogo global de músicas."""
        videos = self.video_repo.get_all_videos()
        if len(videos) < 2:
            raise ValueError("O torneio precisa de pelo menos 2 vídeos para acontecer.")

        ids_normalizados = [video.video_id for video in videos]

        novo_tema = TournamentTheme(
            titulo=titulo,
            video_ids=ids_normalizados,
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

    def get_all_tournaments(self) -> List[TournamentTheme]:
        return self.tournament_repo.get_all_tournaments()

    def get_tournament_ranking(self, tournament_id: str):
        tema = self.tournament_repo.get_tournament(tournament_id)
        if not tema:
            raise ValueError("Torneio não encontrado.")

        ranking = []
        for video_id in tema.video_ids:
            video = self.video_repo.get_video(self.normalize_video_id(video_id))
            if not video:
                continue

            stats = tema.estatisticas_videos.get(video.video_id, {})
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

        return sorted(
            ranking,
            key=lambda item: (item["torneios_vencidos"], item["porcentagem_vitoria"]),
            reverse=True,
        )

    def register_match_winner(self, tournament_id: str, vencedor_id: str, perdedor_id: str):
        """Atualiza estatísticas somente dentro do torneio atual."""
        tema = self.tournament_repo.get_tournament(tournament_id)
        if not tema:
            raise ValueError("Torneio não encontrado.")
        if vencedor_id not in tema.video_ids or perdedor_id not in tema.video_ids:
            raise ValueError("Os vídeos não pertencem a este torneio.")

        statistics = tema.estatisticas_videos or {}
        for video_id in (vencedor_id, perdedor_id):
            statistics.setdefault(video_id, {
                'duelos_jogados': 0,
                'duelos_vencidos': 0,
                'torneios_vencidos': 0,
            })
            statistics[video_id]['duelos_jogados'] += 1
        statistics[vencedor_id]['duelos_vencidos'] += 1
        self.tournament_repo.update_video_statistics(tournament_id, statistics)

    def finish_tournament(self, tournament_id: str, campeao_id: str):
        """Finaliza o torneio, somando +1 nas estatísticas da playlist e do vídeo campeão"""
        tema = self.tournament_repo.get_tournament(tournament_id)
        if not tema or campeao_id not in tema.video_ids:
            raise ValueError("Campeão não pertence a este torneio.")
        statistics = tema.estatisticas_videos or {}
        statistics.setdefault(campeao_id, {
            'duelos_jogados': 0,
            'duelos_vencidos': 0,
            'torneios_vencidos': 0,
        })
        statistics[campeao_id]['torneios_vencidos'] += 1
        self.tournament_repo.update_video_statistics(tournament_id, statistics)