import { useEffect, useState } from 'react';
import RankingCard from '../components/RankingCard';
import { api } from '../services/api';
import type { TournamentDetailsResponse } from '../services/api';

interface TournamentDetailsProps {
  torneioId: string;
}

export default function TournamentDetails({ torneioId }: TournamentDetailsProps) {
  const [dados, setDados] = useState<TournamentDetailsResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 20;

  useEffect(() => {
    api.detalhesTorneio(torneioId, pagina, itensPorPagina)
      .then(setDados)
      .catch((erro) => console.error('Erro ao carregar detalhes:', erro))
      .finally(() => setCarregando(false));
  }, [torneioId, pagina]);

  const carregandoPagina = carregando || (dados !== null && dados.ranking.page !== pagina);

  if (carregandoPagina) return <h2>Carregando torneio...</h2>;
  if (!dados) return <h2>Torneio não encontrado.</h2>;

  const totalPaginas = Math.max(1, Math.ceil(dados.ranking.total / itensPorPagina));

  return (
    <section style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem' }}>
      <button type="button" onClick={() => { window.location.href = '/torneios'; }}>Voltar</button>
      <h1>{dados.torneio.titulo}</h1>
      <p>Status: {dados.torneio.estado === 'em_andamento' ? 'Em andamento' : 'Jogar'}</p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '1.5rem 0' }}>
        <button type="button" onClick={() => { window.location.href = `/arena?torneioId=${dados.torneio.id}`; }}>
          Jogar torneio
        </button>
      </div>

      <h2>Ranking</h2>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {dados.ranking.items.map((video, indice) => (
          <RankingCard key={video.video_id} video={video} position={(pagina - 1) * itensPorPagina + indice + 1} />
        ))}
      </div>
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="button" disabled={pagina === 1} onClick={() => setPagina((atual) => atual - 1)}>
            Anterior
          </button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button type="button" disabled={pagina === totalPaginas} onClick={() => setPagina((atual) => atual + 1)}>
            Próxima
          </button>
        </div>
      )}
    </section>
  );
}