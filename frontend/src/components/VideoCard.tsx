import type { VideoItem } from '../services/api';

function getThumbnailUrl(video: VideoItem) {
  const videoId =
    video.video_id ||
    video.url.match(/(?:v=|be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)?.[1];

  if (!videoId) return 'https://via.placeholder.com/480x270?text=Sem+thumb';

  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

interface VideoCardProps {
  video: VideoItem;
  onClick: () => void;
  accent?: 'red' | 'blue';
  label?: string;
}

export default function VideoCard({ video, onClick, accent = 'red', label }: VideoCardProps) {
  const colors = {
    red: '#ffcccc',
    blue: '#ccccff',
  };

  const titulo = video.nome?.trim() || 'Sem título';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '1rem',
        background: colors[accent],
        borderRadius: '16px',
        border: 'none',
        cursor: 'pointer',
        width: '360px',
        maxWidth: '90vw',
        color: '#111',
        textAlign: 'left',
        boxShadow: '0 8px 18px rgba(0, 0, 0, 0.12)',
      }}
    >
      {label && <p style={{ margin: 0, fontWeight: 700, marginBottom: '0.75rem' }}>{label}</p>}
      <img
        src={getThumbnailUrl(video)}
        alt={titulo}
        style={{ width: '100%', borderRadius: '12px', marginBottom: '0.85rem', display: 'block' }}
      />
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', lineHeight: 1.25 }}>{titulo}</h3>
    </button>
  );
}
