"""Importa uma playlist exportada pelo Exportify para a coleção global videos.

Uso:
    python scripts/seed_spotify_playlist.py playlist.csv
    python scripts/seed_spotify_playlist.py playlist.csv --dry-run
"""

import argparse
import csv
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from yt_dlp import YoutubeDL

# Permite executar o script diretamente a partir de backend/.
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from src.database import db  # noqa: E402
from src.repositories.tournament_repository import TournamentRepository  # noqa: E402

COLLECTION_NAME = "videos"
DEFAULT_DELAY_SECONDS = 1.5
VIDEO_ID_PATTERN = re.compile(r"(?:v=|youtu\.be/|embed/|shorts/)([A-Za-z0-9_-]{11})")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", type=Path, help="Arquivo CSV exportado pelo Exportify")
    parser.add_argument("--delay", type=float, default=DEFAULT_DELAY_SECONDS)
    parser.add_argument("--dry-run", action="store_true", help="Busca resultados sem salvar no Firestore")
    return parser.parse_args()


def get_column(row: dict[str, str], *names: str) -> str:
    for name in names:
        value = row.get(name, "")
        if value:
            return value.strip()
    return ""


def extract_video_id(url: str) -> str | None:
    match = VIDEO_ID_PATTERN.search(url)
    if match:
        return match.group(1)

    parsed = urlparse(url)
    if parsed.hostname in {"youtube.com", "www.youtube.com"}:
        value = parsed.path.removeprefix("/")
        if re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
            return value
    return None


def search_youtube(track_name: str, artist_name: str) -> tuple[str, str, str] | None:
    query = f"{track_name} {artist_name} official audio"
    options = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "skip_download": True,
    }

    with YoutubeDL(options) as youtube:
        result = youtube.extract_info(f"ytsearch1:{query}", download=False)

    videos = result.get("entries", []) if result else []
    if not videos or not videos[0]:
        return None

    first_result = videos[0]
    video_id = first_result.get("id")
    url = first_result.get("webpage_url") or f"https://www.youtube.com/watch?v={video_id}"
    if not video_id:
        return None
    video_title = str(first_result.get("title") or track_name).strip()
    return video_id, url, video_title


def save_video(video_id: str, url: str, video_title: str) -> bool:
    document = db.collection(COLLECTION_NAME).document(video_id)
    if document.get().exists:
        return False

    document.set({
        "video_id": video_id,
        "url": url,
        "nome": video_title,
    })
    return True


def main() -> None:
    args = parse_args()
    if not args.csv_path.is_file():
        raise SystemExit(f"Arquivo CSV não encontrado: {args.csv_path}")

    print(f"Lendo arquivo do Spotify: {args.csv_path}")
    with args.csv_path.open('r', encoding='utf-8-sig', newline='') as csv_file:
        rows = list(csv.DictReader(csv_file))

    required_columns = {"Track Name"}
    available_columns = set(rows[0].keys()) if rows else set()
    missing_columns = required_columns - available_columns
    if missing_columns:
        raise SystemExit(f"Colunas ausentes no CSV: {', '.join(sorted(missing_columns))}")

    saved = 0
    skipped = 0
    not_found = 0
    tournament_repository = None if args.dry_run else TournamentRepository()

    print("Iniciando busca no YouTube...")
    for index, row in enumerate(rows):
        track_name = get_column(row, "Track Name")
        artist_name = get_column(row, "Artist Name", "Artist Name(s)", "Artists")
        if not track_name:
            print(f"[{index + 1}] Ignorada: música sem título")
            continue

        try:
            result = search_youtube(track_name, artist_name)
            if not result:
                not_found += 1
                print(f"[{index + 1}] Não encontrado: {track_name} - {artist_name}")
                continue

            video_id, youtube_url, video_title = result
            if args.dry_run:
                print(f"[{index + 1}] Simulação: {video_title} - {youtube_url}")
            elif save_video(video_id, youtube_url, video_title):
                tournament_repository.add_video_to_all_tournaments(video_id)
                saved += 1
                print(f"[{index + 1}] Salvo: {video_title} - {youtube_url}")
            else:
                skipped += 1
                print(f"[{index + 1}] Já existe: {track_name} - {video_id}")
        except Exception as error:
            print(f"[{index + 1}] Erro ao processar {track_name}: {error}")
        finally:
            time.sleep(max(args.delay, 0))

    print(f"Finalizado. Novas: {saved} | Existentes: {skipped} | Não encontradas: {not_found}")


if __name__ == "__main__":
    main()
