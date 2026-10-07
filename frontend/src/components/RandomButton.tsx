interface RandomButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function RandomButton({ onClick, disabled = false }: RandomButtonProps) {
  return (
    <button 
      type="button" 
      onClick={onClick}
      disabled={disabled}
      style={{ 
        margin: '1rem', 
        padding: '0.75rem 1.5rem', 
        fontSize: '1rem', 
        cursor: 'pointer', 
        borderRadius: '8px',
        backgroundColor: '#444',
        color: '#fff',
        border: 'none',
        transition: 'background-color 0.2s'
      }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#555'}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#444'}
    >
      {disabled ? 'Revele os dois vídeos primeiro' : 'Deixe a sorte escolher'}
    </button>
  );
}