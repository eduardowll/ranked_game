import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { TournamentDetailsResponse } from '../services/api';

interface TournamentDetailsProps {
  torneioId: string;
}

export default function TournamentDetails({ torneioId }: TournamentDetailsProps) {
  const [dados, setDados] = useState<TournamentDetailsResponse | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.detalhesTorneio(torneioId)
      .then(setDados)
      .catch((erro) => console.error('Erro ao carregar detalhes:', erro))
      .finally(() => setCarregando(false));
  }, [torneioId]);

  if (carregando) return <h2>Carregando torneio...</h2>;
  if (!dados) return <h2>Torneio não encontrado.</h2>;

  return (
    <section style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem' }}>
      <button type="button" onClick={() => { window.location.href = '/torneios'; }}>Voltar</button>
      <h1>{dados.torneio.titulo}</h1>
      <p>{dados.ranking.length} músicas no ranking</p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '1.5rem 0' }}>
        <button type="button" onClick={() => { window.location.href = `/arena?torneioId=${dados.torneio.id}`; }}>Jogar torneio</button>
      </div>

      <h2>Ranking</h2>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {dados.ranking.map((video, indice) => (
          <article key={video.video_id} style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: '1rem', alignItems: 'center', padding: '1rem', background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10 }}>
            <strong>#{indice + 1}</strong>
            <div>
              <strong>{video.nome || video.video_id}</strong>
              <div>{video.torneios_vencidos} vitórias em torneios</div>
            </div>
            <strong>{video.porcentagem_vitoria}%</strong>
          </article>
        ))}
      </div>
    </section>
  );
}