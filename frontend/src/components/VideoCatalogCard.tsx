import type { VideoItem } from '../services/api';

interface VideoCatalogCardProps {
  video: VideoItem;
  onRemove: () => void;
  podeRemover: boolean;
}

export default function VideoCatalogCard({ video, onRemove, podeRemover }: VideoCatalogCardProps) {
  return (
    <article style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', padding: '1rem', background: '#fff', border: '1px solid #ddd', borderRadius: 10 }}>
      <div>
        <strong>{video.nome}</strong>
        <div>{video.url}</div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <a href={video.url} target="_blank" rel="noreferrer">YouTube</a>
        {podeRemover && <button type="button" onClick={onRemove}>Remover</button>}
      </div>
    </article>
  );
}
