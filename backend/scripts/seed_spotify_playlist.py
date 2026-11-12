"""Importa uma playlist do Exportify (CSV) para a coleção videos do Firestore.

Prioridade: MV oficial > performance > Studio Choom/1theK > official audio > color coded lyrics.

    python scripts/seed_spotify_playlist.py playlist.csv --dry-run --limit 15
    python scripts/seed_spotify_playlist.py playlist.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # permite importar src/ rodando de backend/

SEARCH_RESULTS = 8
FLUSH_EVERY = 100  # vídeos por gravação em lote (o Firestore aceita até 500)
TIERS = {1: "MV oficial", 2: "Performance", 3: "Studio Choom / 1theK", 4: "Official audio", 5: "Color coded lyrics"}

# Canais aceitos além do canal do próprio artista (todas as palavras precisam estar no nome do canal).
OFFICIAL_CHANNELS = [
    "SMTOWN", "SM Entertainment", "JYP Entertainment", "YG Entertainment", "The Black Label", "HYBE LABELS",
    "BIGHIT MUSIC", "PLEDIS Entertainment", "BELIFT LAB", "ADOR", "SOURCE MUSIC", "Starship Entertainment",
    "KQ Entertainment", "Cube Entertainment", "FNC Entertainment", "RBW", "WM Entertainment", "Genie Music",
    "Stone Music Entertainment", "MODHAUS", "High Up Entertainment", "P NATION", "ATTRAKT", "WAKEONE",
    "Kakao Entertainment", "Fantagio", "Woollim Entertainment", "Swing Entertainment", "THE MUZE ENTERTAINMENT",
    "BPM Entertainment", "IST Entertainment", "MNH Entertainment", "Republic Records", "Universal Music",
    "Sony Music", "Warner Records", "Columbia Records",
]
CURATED_CHANNELS = ("studiochoom", "스튜디오춤", "1thek", "원더케이")  # comparados sem espaços
BLOCKED_CHANNEL_WORDS = {
    "fan", "fans", "fanbase", "fancam", "fancams", "reaction", "reactions", "react", "reacts", "cover",
    "covers", "lyrics", "lyric", "edit", "edits", "unofficial", "archive", "subs", "sub", "subbed", "팬", "리액션",
}
# Conecta solistas/subunits aos canais de seus grupos e siglas aos nomes completos
ARTIST_ALIASES = {
    "minnie": ["i-dle", "g i dle", "여자아이들", "아이들", "민니"],
    "miyeon": ["i-dle", "g i dle", "여자아이들", "아이들", "미연"],
    "yuqi": ["i-dle", "g i dle", "여자아이들", "아이들", "우기"],
    "soyeon": ["i-dle", "g i dle", "여자아이들", "아이들", "소연"],
    "shuhua": ["i-dle", "g i dle", "여자아이들", "아이들", "슈화"],
    "i-dle": ["g i dle", "여자아이들", "아이들"],
    "yeji": ["itzy", "있지", "예지"],
    "yuna": ["itzy", "있지", "유나"],
    "nayeon": ["twice", "트와이스", "나연"],
    "jihyo": ["twice", "트와이스", "지효"],
    "tzuyu": ["twice", "트와이스", "쯔위"],
    "misamo": ["twice", "트와이스", "미사모"],
    "irene": ["red velvet", "레드벨벳", "아이린"],
    "seulgi": ["red velvet", "레드벨벳", "슬기"],
    "wendy": ["red velvet", "레드벨벳", "웬디"],
    "red velvet - irene & seulgi": ["red velvet", "irene", "seulgi", "레드벨벳", "아이린", "슬기"],
    "taemin": ["shinee", "샤이니", "태민"],
    "minho": ["shinee", "샤이니", "민호"],
    "taeyeon": ["girls generation", "소녀시대", "태연"],
    "ten": ["nct", "wayv", "텐"],
    "kai": ["exo", "엑소", "카이"],
    "ningning": ["aespa", "에스파", "닝닝"],
    "anyujin": ["ive", "아이브", "안유진"],
    "liz (ive)": ["ive", "아이브", "리즈"],
    "huh yunjin": ["le sserafim", "르세라핌", "허윤진"],
    "jung kook": ["jungkook", "bts", "방탄소년단", "정국"],
    "jimin": ["bts", "방탄소년단", "지민"],
    "j-hope": ["jhope", "bts", "방탄소년단", "제이홉"],
    "tomorrow x together": ["txt", "투모로우바이투게더"],
    "dxs": ["seventeen", "세븐틴", "도겸", "승관"],
}

# Títulos com estas palavras são descartados, a menos que a palavra faça parte do nome da música.
UNWANTED_RE = re.compile(
    r"(?<!\w)(?:react(?:ion|s)?|cover|sped\s*up|slowed|nightcore|instrumental|inst|karaoke|teaser|highlight|"
    r"making|behind|fan\s*cam|fancam|\d+\s*hours?|reverb|remix|mashup|tiktok|tutorial|mirrored|"
    r"line\s*distribution|commentary|trailer|preview|spoiler|concept|extended|acoustic|8d|bass\s*boosted|shorts?|"
    r"(?:japan(?:ese)?|english|chinese|korean|eng|jpn|chn)\s*ver)(?!\w)",
    re.IGNORECASE,
)
LYRICS_RE = re.compile(r"color\s*coded", re.IGNORECASE)
PERFORMANCE_RE = re.compile(
    r"(?<!\w)(?:performance|dance\s*practice|choreography|choreo|live\s*clip|special\s*clip|dance\s*video|stage\s*mix)(?!\w)",
    re.IGNORECASE,
)
MV_RE = re.compile(r"(?<!\w)(?:m\s*/\s*v|mv|music\s+video|official\s+video)(?!\w)", re.IGNORECASE)
AUDIO_RE = re.compile(r"(?<!\w)(?:official\s+audio|audio|visualizer)(?!\w)", re.IGNORECASE)
NOISE_RE = re.compile(  # palavras de "enfeite" ignoradas ao comparar o título com a música
    r"(?<!\w)(?:official|original|video|audio|visualizer|m\s*/\s*v|mv|music|performance|dance|practice|"
    r"choreography|choreo|live|clip|special|stage|mix|studio|choom|1thek|ver|version)(?!\w)",
    re.IGNORECASE,
)
QUOTED_RE = re.compile(r"""(?:(?<=\s)|^)['‘“"「『《]\s*(.+?)\s*['’”"」』》](?=[\s\]\)|,.\-]|$)""")
VERSION_RE = re.compile(
    r"\b(?:feat|ft|featuring|with|ver|version|from|solo|inst|instrumental|remix|prod|remaster\w*)\b", re.IGNORECASE
)


def tokens(text: str) -> list[str]:
    """Palavras em minúsculas (inclui hangul/kana), sem pontuação."""
    return re.findall(r"[^\W_]+", unicodedata.normalize("NFKC", text).casefold())


def contains_sequence(haystack: list[str], needle: list[str]) -> bool:
    size = len(needle)
    return size > 0 and any(haystack[i:i + size] == needle for i in range(len(haystack) - size + 1))


def track_variants(track_name: str) -> list[str]:
    """Nome base da música (sem feat/versão) e, se ele não for em letras latinas, a tradução entre parênteses."""
    base = re.sub(r"\s*[\(\[][^\)\]]*[\)\]]", "", track_name.strip())
    base = re.split(r"\s+-\s+", base)[0].strip() or track_name.strip()
    variants = [base]
    if re.search(r"[^\x00-\x7f]", base):
        variants += [i.strip() for i in re.findall(r"[\(\[]([^\)\]]+)[\)\]]", track_name)
                     if tokens(i) and not VERSION_RE.search(i)]
    return variants


def query_name(variants: list[str]) -> str:
    return next((v for v in variants if v.isascii()), variants[0])


@dataclass
class Candidate:
    video_id: str
    title: str
    channel: str
    duration: float | None = None
    rank: int = 0


@dataclass
class Pick:
    video: Candidate
    tier: int
    strength: int  # 2 = o título é exatamente a música; 1 = o título só contém o nome

    @property
    def key(self) -> tuple[int, int, int]:
        return (self.tier, -self.strength, self.video.rank)


SearchFn = Callable[[str], list[Candidate]]


class SearchError(RuntimeError):
    pass


def channel_kind(channel: str, artists: list[str]) -> str | None:
    """'curated' (Studio Choom/1theK), 'official' (artista ou gravadora conhecida) ou None."""
    words = tokens(channel)
    if any(key in "".join(words) for key in CURATED_CHANNELS):
        return "curated"
    name = set(words)
    if name & BLOCKED_CHANNEL_WORDS:
        return None
    if any((wanted := set(tokens(item))) and wanted <= name for item in [*artists, *OFFICIAL_CHANNELS]):
        return "official"
    return None


def content_kind(title: str) -> str:
    for kind, pattern in (("lyrics", LYRICS_RE), ("performance", PERFORMANCE_RE), ("mv", MV_RE), ("audio", AUDIO_RE)):
        if pattern.search(title):
            return kind
    return "other"


def has_unwanted_words(title: str, track_name: str) -> bool:
    track_text = " ".join(tokens(track_name))
    return any((phrase := " ".join(tokens(m.group(0)))) and phrase not in track_text
               for m in UNWANTED_RE.finditer(title))


def match_strength(title: str, variants: list[str], artists: list[str]) -> int:
    """0 = outra música, 1 = o título contém a música, 2 = o título é exatamente a música."""
    title_words = tokens(title)
    quoted = [tokens(item) for item in QUOTED_RE.findall(title)]
    artist_words = {word for artist in artists for word in tokens(artist)}
    stripped = NOISE_RE.sub(" ", re.sub(r"\[[^\]]*\]|\([^\)]*\)", " ", title))
    core = [word for word in tokens(stripped) if word not in artist_words]

    best = 0
    for variant in variants:
        wanted = tokens(variant)
        joined = "".join(wanted)
        if wanted and (wanted in quoted or core == wanted):
            return 2
        if contains_sequence(title_words, wanted) or (len(joined) >= 6 and joined in "".join(title_words)):
            best = 1
    return best

def expand_artists(artists: list[str]) -> list[str]:
    expanded = list(artists)
    for artist in artists:
        expanded.extend(ARTIST_ALIASES.get(artist.strip().casefold(), []))
    return expanded


def has_artist_match(title: str, channel: str, artists: list[str]) -> bool:
    """Garante que o artista (ou seu grupo/alias) esteja no título ou no nome do canal."""
    combined_tokens = tokens(f"{title} {channel}")
    haystack = set(combined_tokens)
    joined_haystack = "".join(combined_tokens)
    for item in expand_artists(artists):
        wanted = tokens(item)
        if wanted and (set(wanted) <= haystack or "".join(wanted) in joined_haystack):
            return True
    return False

def classify(candidate: Candidate, track_name: str, artists: list[str]) -> Pick | None:
    if candidate.duration and not 60 <= candidate.duration <= 15 * 60:
        return None
    if has_unwanted_words(candidate.title, track_name):
        return None
    if not has_artist_match(candidate.title, candidate.channel, artists):
        return None
    strength = match_strength(candidate.title, track_variants(track_name), expand_artists(artists))
    if not strength:
        return None

    content = content_kind(candidate.title)
    kind = channel_kind(candidate.channel, artists)
    if content == "lyrics":  # último recurso: aceita qualquer canal
        tier = 5
    elif kind == "curated":
        tier = 3
    elif kind == "official":
        # Se for de canal oficial e não tiver tag no título (ex: canais - Topic), assume Official Audio (4)
        tier = {"mv": 1, "performance": 2, "audio": 4}.get(content, 4)
    else:
        tier = None
    return Pick(candidate, tier, strength) if tier else None

def find_best_video(track_name: str, artists: list[str], search: SearchFn) -> Pick | None:
    """Busca por etapas e para assim que acha algo bom, para fazer poucas buscas."""
    who, name = " ".join(artists[:2]), query_name(track_variants(track_name))
    stages = [
        [f"{who} {name} MV"],
        [f"{who} {name} Official MV", f"{who} {name} Official Music Video"],
        [f"{who} {name} performance video", f"{who} {name} dance practice"],
        [f"{who} {name} Studio Choom", f"{who} {name} 1theK"],
        [f"{who} {name} official audio"],
        [f"{who} {name} color coded lyrics"],
    ]
    pool: dict[str, Pick] = {}
    best = None
    for number, queries in enumerate(stages, start=1):
        for query in queries:
            for candidate in search(query):
                pick = classify(candidate, track_name, artists)
                if pick and (candidate.video_id not in pool or pick.key < pool[candidate.video_id].key):
                    pool[candidate.video_id] = pick
        best = min(pool.values(), key=lambda item: item.key, default=None)
        if best and best.tier <= number + 1:
            break
    return best


def make_search(delay: float, retries: int = 3) -> SearchFn:
    def search(query: str) -> list[Candidate]:
        from yt_dlp import YoutubeDL  # importado aqui para os testes não precisarem do yt-dlp

        options = {"quiet": True, "no_warnings": True, "extract_flat": True, "socket_timeout": 20}
        error: Exception | None = None
        for attempt in range(retries):
            try:
                with YoutubeDL(options) as youtube:
                    result = youtube.extract_info(f"ytsearch{SEARCH_RESULTS}:{query}", download=False)
                time.sleep(delay)
                return [
                    Candidate(e["id"], e.get("title") or "", e.get("channel") or e.get("uploader") or "",
                              e.get("duration"), rank)
                    for rank, e in enumerate((result or {}).get("entries") or [])
                    if e and len(e.get("id") or "") == 11
                ]
            except Exception as exc:  # o yt-dlp lança vários tipos de erro de rede
                error = exc
                time.sleep(2 ** (attempt + 1))
        raise SearchError(f"{query}: {error}") from error

    return search


def save_videos(db, videos: dict[str, dict]) -> list[str]:
    """Grava em lote só os vídeos que ainda não existem. Devolve os IDs novos."""
    collection = db.collection("videos")
    existing = {snap.id for snap in db.get_all([collection.document(v) for v in videos]) if snap.exists}
    new_ids = [video_id for video_id in videos if video_id not in existing]
    if new_ids:
        batch = db.batch()
        for video_id in new_ids:
            batch.set(collection.document(video_id), videos[video_id])
        batch.commit()
    return new_ids


def add_to_open_tournaments(db, video_ids: list[str]) -> int:
    """Adiciona os vídeos novos aos torneios que não estão em andamento (uma atualização por torneio)."""
    batch, updated = db.batch(), 0
    for snap in db.collection("tournaments").stream():
        data = snap.to_dict() or {}
        current = data.get("video_ids", [])
        to_add = [v for v in video_ids if v not in set(current)]
        if data.get("estado") == "em_andamento" or not to_add:
            continue
        stats = {**(data.get("estatisticas_videos") or {}),
                 **{v: {"duelos_jogados": 0, "duelos_vencidos": 0, "torneios_vencidos": 0} for v in to_add}}
        batch.update(snap.reference, {"video_ids": [*current, *to_add], "estatisticas_videos": stats})
        updated += 1
    if updated:
        batch.commit()
    return updated


def load_cache(path: Path) -> dict[str, dict]:
    cache = {}
    for line in path.read_text(encoding="utf-8").splitlines() if path.is_file() else []:
        try:
            record = json.loads(line)
        except json.JSONDecodeError:  # última linha cortada por uma interrupção
            continue
        cache[record["key"]] = record
    return cache


def write_report(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["musica", "artistas", "status", "tipo", "titulo_youtube", "canal", "url", "revisar"])
        for r in records:
            found = r["status"] == "ok"
            writer.writerow([
                r["track"], r["artists"], r["status"], TIERS[r["tier"]] if found else "",
                r.get("title", ""), r.get("channel", ""),
                f"https://www.youtube.com/watch?v={r['video_id']}" if found else "",
                "sim" if r.get("review") else "",
            ])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("csv_path", type=Path, help="CSV exportado pelo Exportify")
    parser.add_argument("--dry-run", action="store_true", help="Só busca e gera o relatório, sem usar o Firestore")
    parser.add_argument("--limit", type=int, default=0, help="Processa só as N primeiras linhas")
    parser.add_argument("--delay", type=float, default=1.0, help="Pausa (s) após cada busca")
    parser.add_argument("--cache", type=Path, default=Path("seed_cache.jsonl"), help="Progresso (retoma de onde parou)")
    parser.add_argument("--report", type=Path, default=Path("seed_report.csv"), help="Relatório para revisão")
    args = parser.parse_args()

    if not args.csv_path.is_file():
        raise SystemExit(f"Arquivo CSV não encontrado: {args.csv_path}")
    with args.csv_path.open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))
    if not rows or "Track Name" not in rows[0]:
        raise SystemExit("CSV inválido: falta a coluna 'Track Name'")

    db = None
    if not args.dry_run:
        from src.database import db as firestore_db  # exige as credenciais do Firebase

        db = firestore_db

    cache, search = load_cache(args.cache), make_search(args.delay)
    pending: dict[str, dict] = {}
    results: list[dict] = []
    totals: Counter = Counter()

    def flush() -> None:
        if db and pending:
            new_ids = save_videos(db, pending)
            touched = add_to_open_tournaments(db, new_ids) if new_ids else 0
            totals["novas"] += len(new_ids)
            print(f"   → {len(new_ids)} vídeos novos salvos, {touched} torneios atualizados")
        pending.clear()

    try:
        for number, row in enumerate(rows[:args.limit or None], start=1):
            track = row["Track Name"].strip()
            artist_field = (row.get("Artist Name(s)") or row.get("Artist Name") or "").strip()
            artists = [a.strip() for a in artist_field.split(";") if a.strip()]
            if not track or not artists:
                continue

            key = row.get("Track URI") or f"{artist_field}|{track}"
            record = cache.get(key)
            if record is None:
                record = {"key": key, "track": track, "artists": artist_field, "status": "erro"}
                try:
                    pick = find_best_video(track, artists, search)
                except SearchError as error:
                    print(f"[{number}] erro de rede: {error}")
                else:
                    record["status"] = "ok" if pick else "sem_resultado"
                    if pick:
                        record.update(tier=pick.tier, video_id=pick.video.video_id, title=pick.video.title,
                                      channel=pick.video.channel, review=pick.strength == 1)
                        cache[key] = record
                        with args.cache.open("a", encoding="utf-8") as file:
                            file.write(json.dumps(record, ensure_ascii=False) + "\n")

            results.append(record)
            totals[record["status"]] += 1
            if record["status"] == "ok":
                totals[f"nivel {record['tier']}"] += 1
                pending[record["video_id"]] = {
                    "video_id": record["video_id"],
                    "url": f"https://www.youtube.com/watch?v={record['video_id']}",
                    "nome": record["title"],
                }
                flag = "  [REVISAR]" if record["review"] else ""
                print(f"[{number}] {track} - {artist_field} → {TIERS[record['tier']]}: {record['channel']} | {record['title']}{flag}")
            else:
                print(f"[{number}] {track} - {artist_field} → {record['status']}")
            if len(pending) >= FLUSH_EVERY:
                flush()
    except KeyboardInterrupt:
        print("\nInterrompido. Salvando o que já foi encontrado...")
    finally:
        flush()
        write_report(args.report, results)

    print(f"\nEncontradas: {totals['ok']} | sem resultado: {totals['sem_resultado']} | erros de rede: {totals['erro']}")
    for tier, name in TIERS.items():
        if totals[f"nivel {tier}"]:
            print(f"  {tier}. {name}: {totals[f'nivel {tier}']}")
    if db:
        print(f"Novas no Firestore: {totals['novas']}")
    print(f"Relatório: {args.report}")
    if totals["erro"]:
        print("Houve erros de rede: rode o mesmo comando de novo para tentar só essas músicas.")


if __name__ == "__main__":
    main()