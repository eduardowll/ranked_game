from src.models.tournament import TournamentTheme
from src.services.tournament_service import TournamentService


class DummyTournamentRepo:
    def __init__(self):
        self.store = {}

    def create_tournament(self, theme):
        if theme.id is None:
            theme.id = "tournament-1"
        self.store[theme.id] = theme
        return theme

    def get_tournament(self, tournament_id):
        return self.store.get(tournament_id)


class DummyVideoRepo:
    def __init__(self):
        self.store = {}

    def get_video(self, video_id):
        return self.store.get(video_id)

    def save_video(self, video):
        self.store[video.video_id] = video
        return video


def test_create_new_tournament_converts_urls_to_video_ids():
    service = TournamentService()
    service.tournament_repo = DummyTournamentRepo()
    service.video_repo = DummyVideoRepo()

    theme = service.create_new_tournament(
        "Teste",
        [
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtu.be/abc123xyz",
        ],
    )

    assert theme.video_ids == ["dQw4w9WgXcQ", "abc123xyz"]


def test_get_shuffled_videos_for_tournament_builds_missing_video_data():
    service = TournamentService()
    service.tournament_repo = DummyTournamentRepo()
    service.video_repo = DummyVideoRepo()

    theme = TournamentTheme(
        id="tournament-1",
        titulo="Teste",
        video_ids=["dQw4w9WgXcQ", "abc123xyz"],
    )
    service.tournament_repo.store[theme.id] = theme

    videos = service.get_shuffled_videos_for_tournament(theme.id)

    assert len(videos) == 2
    assert {video.video_id for video in videos} == {"dQw4w9WgXcQ", "abc123xyz"}
