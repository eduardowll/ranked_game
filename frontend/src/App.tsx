import Arena from './pages/Arena';
import Tournaments from './pages/Tournaments';
import TournamentDetails from './pages/TournamentDetails';

export default function App() {
  const caminho = window.location.pathname;
  const detalhe = caminho.match(/^\/torneios\/([^/]+)$/);
  const pagina = detalhe
    ? <TournamentDetails torneioId={detalhe[1]} />
    : caminho === '/torneios' ? <Tournaments /> : <Arena />;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {pagina}
    </main>
  );
}
