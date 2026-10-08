import type { VideoItem } from '../services/api';

function getVideoId(video: VideoItem) {
  return video.video_id ||
    video.url.match(/(?:v=|be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)?.[1];
}

interface VideoCardProps {
  video: VideoItem;
  onClick: () => void;
  hidden?: boolean;
  revealed?: boolean;
  canChoose?: boolean;
  onReveal?: () => void;
  accent?: 'red' | 'blue';
  label?: string;
}

export default function VideoCard({ video, onClick, hidden = false, revealed = false, canChoose = true, onReveal, accent = 'red', label }: VideoCardProps) {
  const titulo = video.nome?.trim() || 'Sem título';
  const videoId = getVideoId(video);
  const coberto = hidden && !revealed;
  const podeEscolher = !coberto && canChoose;

  return (
    <article
      className={`video-card video-card-${accent}`}
      style={{
        padding: '1rem',
        borderRadius: '24px',
        border: '3px solid transparent',
        width: '360px',
        maxWidth: '90vw',
        color: '#f7f2ff',
        textAlign: 'left',
        boxShadow: '0 14px 34px rgba(0, 0, 0, 0.35)',
      }}
    >
      {label && <p style={{ margin: 0, fontWeight: 700, marginBottom: '0.75rem' }}>{label}</p>}

      {coberto ? (
        <div
          className="video-card__cover"
          role="button"
          tabIndex={0}
          aria-label={`Clique para revelar ${label ?? 'vídeo'}`}
          onClick={() => onReveal?.()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onReveal?.();
            }
          }}
        >
          <span aria-hidden="true" className="video-card__cover-icon">?</span>
          <span>Clique para revelar</span>
        </div>
      ) : videoId ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
          title={titulo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: '12px', display: 'block' }}
        />
      ) : (
        <a href={video.url} target="_blank" rel="noreferrer">
          Abrir vídeo no YouTube
        </a>
      )}

      <h3 style={{ margin: '0.75rem 0', fontSize: '1.1rem', lineHeight: 1.25 }}>
        {coberto ? 'Título oculto' : titulo}
      </h3>

      <button
        type="button"
        className="video-card__choose"
        disabled={!podeEscolher}
        onClick={onClick}
      >
        {coberto ? 'Revele para escolher' : canChoose ? 'Escolher este vídeo' : 'Revele o outro vídeo'}
      </button>
    </article>
  );
}