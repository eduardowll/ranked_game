import type { VideoItem } from '../services/api';

interface ChampionCardProps {
  video: VideoItem;
  torneioId: string;
  mensagem?: string;
  salvando?: boolean;
  salvo?: boolean;
  onRetry?: () => void;
}

export default function ChampionCard({ video, torneioId, mensagem, salvando = false, salvo = true, onRetry }: ChampionCardProps) {
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
      {salvando && <p role="status">Salvando resultado no ranking...</p>}
      {salvo && <p role="status">Resultado salvo no ranking.</p>}
      {mensagem && <p role="status">{mensagem}</p>}
      {!salvo && !salvando && onRetry && (
        <button type="button" onClick={onRetry} style={{ marginTop: '1rem' }}>
          Tentar salvar novamente
        </button>
      )}
      <button
        type="button"
        onClick={() => { window.location.href = `/torneios/${torneioId}`; }}
        disabled={!salvo || salvando}
        aria-label="Voltar para torneio"
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.25rem',
          border: 'none',
          borderRadius: '999px',
          background: '#6d3bb5',
          color: '#fff',
          cursor: salvo && !salvando ? 'pointer' : 'not-allowed',
          opacity: salvo && !salvando ? 1 : 0.6,
        }}
      >
        {salvando ? 'Aguarde o salvamento...' : 'Voltar para torneio'}
      </button>
    </section>
  );
}
