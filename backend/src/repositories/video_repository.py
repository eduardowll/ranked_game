from src.database import db
from src.models.tournament import VideoItem

class VideoRepository:
    def __init__(self):
        self.collection = db.collection('videos')

    def save_video(self, video: VideoItem):
        """Salva ou atualiza um vídeo no banco usando o ID do YouTube como chave"""
        doc_ref = self.collection.document(video.video_id)
        doc_ref.set(video.model_dump())
        return video

    def get_video(self, video_id: str) -> VideoItem:
        """Busca um vídeo específico pelo ID"""
        doc = self.collection.document(video_id).get()
        if doc.exists:
            return VideoItem(**doc.to_dict())
        return None

    def get_all_videos(self):
        """Busca todos os vídeos cadastrados para o ranking global"""
        docs = self.collection.stream()
        return [VideoItem(**doc.to_dict()) for doc in docs]
