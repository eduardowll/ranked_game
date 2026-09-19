import type { TournamentItem } from '../services/api';

interface TournamentCardProps {
  torneio: TournamentItem;
  onClick: () => void;
}

export default function TournamentCard({ torneio, onClick }: TournamentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tournament-card purple-panel"
      style={{
        width: 'min(100%, 360px)',
        minHeight: '190px',
        padding: '1.5rem',
        textAlign: 'left',
        color: '#f7f2ff',
        border: '1px solid #7043a6',
        borderRadius: '22px',
        cursor: 'pointer',
        boxShadow: '0 14px 34px rgba(0, 0, 0, 0.35)',
      }}
    >
      <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Torneio</span>
      <h2 style={{ margin: '0.65rem 0' }}>{torneio.titulo}</h2>
      <p style={{ margin: 0 }}>{torneio.video_ids.length} músicas</p>
      <p style={{ margin: '0.35rem 0 0', fontWeight: 700 }}>
        {torneio.estado === 'em_andamento' ? 'Em andamento' : 'Jogar'}
      </p>
    </button>
  );
}