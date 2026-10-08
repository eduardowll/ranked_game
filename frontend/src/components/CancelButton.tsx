interface CancelButtonProps {
  onClick: () => void;
}

export default function CancelButton({ onClick }: CancelButtonProps) {
  return (
    <button 
      type="button" 
      onClick={onClick}
      className="arena-compact-button cancel-button"
      style={{ 
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        backgroundColor: '#6b21a8',
        color: '#fff',
        fontWeight: 'bold',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        transition: 'background-color 0.2s',
        zIndex: 100
      }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#86198f'} 
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6b21a8'}
    >
      Interromper Partida
    </button>
  );
}