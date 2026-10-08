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
      className="arena-compact-button random-button"
    >
      {disabled ? 'Revele os dois vídeos primeiro' : 'Deixe a sorte escolher'}
    </button>
  );
}