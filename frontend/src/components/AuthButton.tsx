import { useAuth } from '../contexts/useAuth';

export default function AuthButton() {
  const { user, carregando, entrarComGoogle, sair } = useAuth();

  if (carregando) return null;

  if (!user) {
    return <button type="button" onClick={entrarComGoogle}>Entrar com Google</button>;
  }

  return (
    <button type="button" onClick={sair}>
      Sair ({user.displayName || user.email || 'conta'})
    </button>
  );
}
