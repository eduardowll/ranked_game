import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import Arena from './pages/Arena';
import Tournaments from './pages/Tournaments';
import TournamentDetails from './pages/TournamentDetails';
import VideoCatalog from './pages/VideoCatalog';

export default function App() {
  return (
    <main className="page-surface">
      <BrowserRouter>
        <Routes>
          <Route path="/torneios" element={<Tournaments />} />
          <Route path="/torneios/:torneioId" element={<TournamentDetailsRoute />} />
          <Route path="/musicas" element={<VideoCatalog />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="*" element={<Navigate to="/torneios" replace />} />
        </Routes>
      </BrowserRouter>
    </main>
  );
}

function TournamentDetailsRoute() {
  const { torneioId = '' } = useParams();
  return <TournamentDetails torneioId={torneioId} />;
}
