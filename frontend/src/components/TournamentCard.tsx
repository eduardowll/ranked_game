import type { TournamentItem } from '../services/api';

interface TournamentCardProps {
  torneio: TournamentItem;
  onClick: () => void;
  onDelete?: () => void;
}

export default function TournamentCard({ torneio, onClick, onDelete }: TournamentCardProps) {
  return (
    <article
      className="tournament-card purple-panel"
      style={{
        position: 'relative',
        width: 'min(100%, 360px)',
        minHeight: '190px',
        padding: '1.5rem',
        textAlign: 'left',
        color: '#f7f2ff',
        border: '1px solid #7043a6',
        borderRadius: '22px',
        boxShadow: '0 14px 34px rgba(0, 0, 0, 0.35)',
      }}
    >
      {onDelete && (
        <button
          type="button"
          aria-label={`Excluir torneio ${torneio.titulo}`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          style={{
            position: 'absolute',
            left: '0.8rem',
            top: '50%',
            minHeight: 42,
            width: 42,
            padding: 0,
            transform: 'translateY(-50%)',
            border: '1px solid #ff8d9d',
            background: '#b4234d',
            color: '#fff',
            fontSize: '1.1rem',
          }}
        >
          ×
        </button>
      )}
      <button
        type="button"
        onClick={onClick}
        style={{ width: '100%', minHeight: 154, padding: onDelete ? '1rem 1rem 1rem 3.5rem' : '1rem', border: 0, borderRadius: '16px', background: 'transparent', color: 'inherit', textAlign: 'left' }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Torneio</span>
        <h2 style={{ margin: '0.65rem 0' }}>{torneio.titulo}</h2>
        <p style={{ margin: 0 }}>{torneio.video_ids.length} músicas</p>
        <p style={{ margin: '0.35rem 0 0', fontWeight: 700 }}>
          {torneio.estado === 'em_andamento' ? 'Em andamento' : 'Jogar'}
        </p>
      </button>
    </article>
  );
}