import random
from typing import List
from src.repositories.tournament_repository import TournamentRepository
from src.repositories.video_repository import VideoRepository
from src.models.tournament import VideoItem, TournamentTheme

class TournamentService:
    def __init__(self):
        # Conecta com a camada de banco de dados
        self.tournament_repo = TournamentRepository()
        self.video_repo = VideoRepository()

    def create_new_tournament(self, titulo: str, video_ids: List[str]) -> TournamentTheme:
        """Cria uma nova playlist/torneio no banco de dados"""
        if len(video_ids) < 2:
            raise ValueError("O torneio precisa de pelo menos 2 vídeos para acontecer.")
            
        novo_tema = TournamentTheme(
            titulo=titulo,
            video_ids=video_ids
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

        ids_disponiveis = tema.video_ids.copy()
        random.shuffle(ids_disponiveis)

        videos_para_duelar = []
        for v_id in ids_disponiveis:
            video_data = self.video_repo.get_video(v_id)
            if video_data:
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