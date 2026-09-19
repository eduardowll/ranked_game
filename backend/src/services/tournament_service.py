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

    def create_new_tournament(self, titulo: str, video_ids: List[str]) -> TournamentTheme:
        """Cria uma nova playlist/torneio no banco de dados"""
        if len(video_ids) < 2:
            raise ValueError("O torneio precisa de pelo menos 2 vídeos para acontecer.")

        ids_normalizados = []
        for valor in video_ids:
            video_id = self.normalize_video_id(valor)
            if video_id not in ids_normalizados:
                ids_normalizados.append(video_id)
                self.ensure_video_exists(valor)

        novo_tema = TournamentTheme(
            titulo=titulo,
            video_ids=ids_normalizados
        )
        return self.tournament_repo.create_tournament(novo_tema)

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

    def register_match_winner(self, vencedor_id: str, perdedor_id: str):
        """Avisa o banco que um duelo 1v1 acabou para atualizar a Taxa de Vitória (Win Rate)"""
        self.video_repo.register_match_result(vencedor_id, perdedor_id)

    def finish_tournament(self, tournament_id: str, campeao_id: str):
        """Finaliza o torneio, somando +1 nas estatísticas da playlist e do vídeo campeão"""
        self.tournament_repo.increment_play_count(tournament_id)
        
        campeao_ref = self.video_repo.collection.document(campeao_id)
        from google.cloud.firestore import Increment
        campeao_ref.update({'torneios_vencidos': Increment(1)})