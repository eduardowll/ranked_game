import type { VideoItem } from '../services/api';

interface ChampionCardProps {
  video: VideoItem;
  torneioId: string;
}

export default function ChampionCard({ video, torneioId }: ChampionCardProps) {
  const titulo = video.nome || video.video_id;

  return (
    <section className="champion-panel" style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>Champ</h1>
      <iframe
        src={`https://www.youtube.com/embed/${video.video_id}?rel=0`}
        title={titulo}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{ width: 560, maxWidth: '90vw', aspectRatio: '16 / 9', border: 0, borderRadius: 12, marginBottom: '1rem' }}
      />
      <h2>{titulo}</h2>
      <button
        type="button"
        onClick={() => { window.location.href = `/torneios/${torneioId}`; }}
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.25rem',
          border: 'none',
          borderRadius: '999px',
          background: '#6d3bb5',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Voltar para torneio
      </button>
    </section>
  );
}
