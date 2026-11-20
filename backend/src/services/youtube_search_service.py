import json
import os
import re
import unicodedata
from urllib import error, parse, request


class YouTubeSearchUnavailable(RuntimeError):
    pass


def _normalize(text: str) -> str:
    normalized = unicodedata.normalize('NFKD', text.casefold())
    without_accents = ''.join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r'[^a-z0-9]+', ' ', without_accents).strip()


def _classify_result(title: str, channel: str) -> str:
    text = _normalize(f'{title} {channel}')
    if 'studio choom' in text or 'studiochoom' in text:
        return 'Studio CHOOM'
    if re.search(r'\b(lyrics|lyric|letra|legendado)\b', text):
        return 'Lyrics'
    if re.search(r'\b(performance|live|stage|ao vivo|dance practice|fancam)\b', text):
        return 'Performance'
    if re.search(r'\b(audio|topic)\b', text):
        return 'Áudio'
    if re.search(r'\b(mv|m v|music video|official video|videoclipe|clipe oficial)\b', text):
        return 'MV'
    return 'Vídeo musical'


def _relevance_score(title: str, channel: str, musica: str, artista: str) -> int:
    normalized_title = _normalize(title)
    normalized_channel = _normalize(channel)
    normalized_song = _normalize(musica)
    normalized_artist = _normalize(artista)
    song_terms = normalized_song.split()
    artist_terms = normalized_artist.split()
    combined = f'{normalized_title} {normalized_channel}'

    score = 0
    if normalized_song and normalized_song in normalized_title:
        score += 12
    score += sum(2 for term in song_terms if term in normalized_title.split())
    if normalized_artist and (normalized_artist in normalized_title or normalized_artist in normalized_channel):
        score += 12
    score += sum(2 for term in artist_terms if term in combined.split())
    if 'official' in combined.split():
        score += 2
    if _classify_result(title, channel) == 'MV':
        score += 3
    return score


def rank_search_results(items: list[dict], musica: str, artista: str) -> list[dict]:
    candidates = []
    for item in items:
        video_id = (item.get('id') or {}).get('videoId')
        snippet = item.get('snippet') or {}
        if not video_id:
            continue

        title = snippet.get('title') or 'Sem título'
        channel = snippet.get('channelTitle') or 'Canal desconhecido'
        thumbnails = snippet.get('thumbnails') or {}
        thumbnail = next(
            (thumbnails[size]['url'] for size in ('high', 'medium', 'default') if size in thumbnails),
            '',
        )
        candidates.append({
            'video_id': video_id,
            'titulo': title,
            'canal': channel,
            'thumbnail': thumbnail,
            'url': f'https://www.youtube.com/watch?v={video_id}',
            'tipo': _classify_result(title, channel),
            'descricao': snippet.get('description', ''),
            'relevance_score': _relevance_score(title, channel, musica, artista),
            'ja_cadastrado': False,
        })

    candidates.sort(key=lambda candidate: candidate['relevance_score'], reverse=True)
    for index, candidate in enumerate(candidates):
        candidate['recomendado'] = index == 0
        candidate.pop('relevance_score')
    return candidates


def search_youtube_videos(musica: str, artista: str) -> list[dict]:
    api_key = os.getenv('YOUTUBE_API_KEY')
    if not api_key:
        raise YouTubeSearchUnavailable('A busca do YouTube não está configurada no servidor.')

    query = parse.urlencode({
        'part': 'snippet',
        'q': f'{musica.strip()} {artista.strip()}',
        'type': 'video',
        'maxResults': 10,
        'videoEmbeddable': 'true',
        'key': api_key,
    })
    endpoint = f'https://www.googleapis.com/youtube/v3/search?{query}'
    try:
        with request.urlopen(endpoint, timeout=12) as response:
            payload = response.read().decode('utf-8')
    except error.HTTPError as exception:
        if exception.code in (403, 400):
            raise YouTubeSearchUnavailable(
                'O YouTube recusou a busca. Confira a chave da API e a cota do projeto.'
            ) from exception
        raise YouTubeSearchUnavailable('Não foi possível consultar o YouTube agora.') from exception
    except (error.URLError, TimeoutError, OSError) as exception:
        raise YouTubeSearchUnavailable('Não foi possível conectar à busca do YouTube.') from exception

    try:
        data = json.loads(payload)
    except ValueError as exception:
        raise YouTubeSearchUnavailable('O YouTube retornou uma resposta inválida.') from exception

    return rank_search_results(data.get('items', []), musica, artista)
