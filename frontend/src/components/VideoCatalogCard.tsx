import type { VideoItem } from '../services/api';

interface VideoCatalogCardProps {
  video: VideoItem;
  onRemove: () => void;
  podeRemover: boolean;
}

export default function VideoCatalogCard({ video, onRemove, podeRemover }: VideoCatalogCardProps) {
  return (
    <article className="catalog-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', padding: '1.25rem', border: '1px solid #4d3172', borderRadius: 18 }}>
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
