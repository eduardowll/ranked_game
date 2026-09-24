import { useEffect, useState, type FormEvent } from 'react';
import TournamentCard from '../components/TournamentCard';
import AuthButton from '../components/AuthButton';
import { useAuth } from '../contexts/useAuth';
import { api } from '../services/api';
import type { TournamentItem } from '../services/api';

export default function Tournaments() {
  const { user } = useAuth();
  const [torneios, setTorneios] = useState<TournamentItem[]>([]);
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [mostrarCriacao, setMostrarCriacao] = useState(false);
  const [url, setUrl] = useState('');
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.listarTorneios()
      .then(setTorneios)
      .catch((erro) => console.error('Erro ao carregar dados:', erro))
      .finally(() => setCarregando(false));
  }, []);

  const cadastrarMusica = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const video = await api.cadastrarVideo(url);
      setUrl('');
      setMensagem(`Música cadastrada: ${video.nome}`);
    } catch {
      setMensagem('Não foi possível cadastrar essa URL.');
    }
  };

  const criarTorneio = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const resultado = await api.criarTorneio(titulo);
      window.location.href = `/torneios/${resultado.id}`;
    } catch {
      setMensagem('Não foi possível criar o torneio.');
    }
  };

  const excluirTorneio = async (torneio: TournamentItem) => {
    if (!window.confirm(`Excluir o torneio "${torneio.titulo}"?`)) return;

    try {
      await api.excluirTorneio(torneio.id);
      setTorneios((atuais) => atuais.filter((item) => item.id !== torneio.id));
      setMensagem('Torneio excluído.');
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível excluir o torneio.');
    }
  };

  if (carregando) return <h2>Loading...</h2>;

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <h1>Meus torneios</h1>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <AuthButton />
          <button type="button" disabled={!user} onClick={() => setMostrarCadastro((atual) => !atual)}>Adicionar música</button>
          <button type="button" onClick={() => { window.location.href = '/musicas'; }}>Catálogo</button>
          <button type="button" disabled={!user} onClick={() => setMostrarCriacao((atual) => !atual)}>Criar torneio</button>
        </div>
      </div>
      {mensagem && <p role="status">{mensagem}</p>}

      {mostrarCadastro && user && (
        <form onSubmit={cadastrarMusica} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '1rem 0 2rem' }}>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Cole a URL do YouTube"
            required
            style={{ flex: '1 1 320px', padding: '0.75rem' }}
          />
          <button type="submit">Salvar música</button>
        </form>
      )}

      {mostrarCriacao && (
        <form onSubmit={criarTorneio} style={{ margin: '1rem 0 2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: 12 }}>
          {!user && <p>Entre com Google para criar um torneio.</p>}
          <input
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Nome do torneio"
            required
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', marginBottom: '1rem' }}
          />
          <p>O torneio usará todas as músicas cadastradas agora e também receberá as próximas músicas adicionadas.</p>
          <button type="submit">Criar torneio</button>
        </form>
      )}
      {torneios.length === 0 ? <p>Nenhum torneio cadastrado.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {torneios.map((torneio) => (
            <TournamentCard
              key={torneio.id}
              torneio={torneio}
              onClick={() => { window.location.href = `/torneios/${torneio.id}`; }}
              onDelete={user?.uid === torneio.owner_uid ? () => excluirTorneio(torneio) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}