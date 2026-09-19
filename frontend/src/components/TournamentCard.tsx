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
      style={{
        width: 'min(100%, 360px)',
        minHeight: '190px',
        padding: '1.5rem',
        textAlign: 'left',
        color: '#18202a',
        background: 'linear-gradient(145deg, #fff7e6, #ffd6a5)',
        border: '2px solid #f4a261',
        borderRadius: '16px',
        cursor: 'pointer',
        boxShadow: '0 10px 24px rgba(38, 50, 56, 0.12)',
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