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

    def delete_video(self, video_id: str):
        self.collection.document(video_id).delete()

    def replace_video(self, old_video_id: str, video: VideoItem):
        batch = db.batch()
        if old_video_id != video.video_id:
            batch.delete(self.collection.document(old_video_id))
        batch.set(self.collection.document(video.video_id), video.model_dump())
        batch.commit()
