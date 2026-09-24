interface RandomButtonProps {
  onClick: () => void;
}

export default function RandomButton({ onClick }: RandomButtonProps) {
  return (
    <button 
      type="button" 
      onClick={onClick}
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
      Deixe a sorte escolher
    </button>
  );
}