import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthButton from '../components/AuthButton';
import { useAuth } from '../contexts/useAuth';
import { api } from '../services/api';
import type { YouTubeSearchCandidate } from '../services/api';

export default function AddMusic() {
  const { user, carregando: carregandoAuth } = useAuth();
  const navigate = useNavigate();
  const [musica, setMusica] = useState('');
  const [artista, setArtista] = useState('');
  const [candidatos, setCandidatos] = useState<YouTubeSearchCandidate[]>([]);
  const [selecionado, setSelecionado] = useState<YouTubeSearchCandidate | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState<'erro' | 'sucesso' | 'info'>('info');

  const buscar = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      setMensagem('Entre com sua conta Google para buscar músicas.');
      setTipoMensagem('erro');
      return;
    }

    setBuscando(true);
    setMensagem('');
    setSelecionado(null);
    try {
      const resultados = await api.buscarMusicas(musica.trim(), artista.trim());
      setCandidatos(resultados);
      if (resultados.length === 0) {
        setMensagem('Nenhum resultado encontrado. Tente outro título ou confira o nome do artista.');
        setTipoMensagem('info');
        return;
      }
      setSelecionado(resultados[0]);
    } catch (erro) {
      setCandidatos([]);
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível buscar no YouTube.');
      setTipoMensagem('erro');
    } finally {
      setBuscando(false);
    }
  };

  const adicionar = async () => {
    if (!user || !selecionado || selecionado.ja_cadastrado || adicionando) return;

    setAdicionando(true);
    setMensagem('');
    try {
      const video = await api.cadastrarVideo(selecionado.url);
      setCandidatos((atuais) => atuais.map((item) => item.video_id === video.video_id
        ? { ...item, ja_cadastrado: true }
        : item));
      setSelecionado((atual) => atual?.video_id === video.video_id
        ? { ...atual, ja_cadastrado: true }
        : atual);
      setMensagem(`“${video.nome}” foi adicionada ao catálogo e aos torneios abertos.`);
      setTipoMensagem('sucesso');
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível adicionar essa música.');
      setTipoMensagem('erro');
    } finally {
      setAdicionando(false);
    }
  };

  if (carregandoAuth) return <h2>Verificando sua conta...</h2>;

  return (
    <section style={{ maxWidth: 1120, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => navigate('/torneios')}>Voltar para torneios</button>
        <AuthButton />
      </header>

      <div style={{ maxWidth: 760, margin: '2.5rem auto 2rem', textAlign: 'center' }}>
        <p style={{ marginBottom: '0.5rem', color: '#d8b4fe', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Catálogo comunitário
        </p>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}>Encontre a próxima música</h1>
        <p style={{ color: '#c4b5d5', lineHeight: 1.6 }}>
          Busque pelo título e artista. Confira os resultados e escolha a versão certa antes de adicionar ao jogo.
        </p>
      </div>

      {!user && (
        <div className="purple-panel" style={{ maxWidth: 760, margin: '0 auto 1.5rem', padding: '1rem 1.25rem', borderRadius: 18 }}>
          <strong>Login necessário</strong>
          <p style={{ marginBottom: 0 }}>Entre com Google para pesquisar e adicionar músicas ao catálogo.</p>
        </div>
      )}

      <form
        onSubmit={buscar}
        className="purple-panel"
        style={{ maxWidth: 900, margin: '0 auto', padding: '1.25rem', borderRadius: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem', alignItems: 'end' }}
      >
        <label style={{ display: 'grid', gap: '0.45rem', textAlign: 'left', fontWeight: 700 }}>
          Música
          <input value={musica} onChange={(event) => setMusica(event.target.value)} placeholder="Ex.: Super Shy" maxLength={120} required disabled={!user || buscando} />
        </label>
        <label style={{ display: 'grid', gap: '0.45rem', textAlign: 'left', fontWeight: 700 }}>
          Artista / grupo
          <input value={artista} onChange={(event) => setArtista(event.target.value)} placeholder="Ex.: NewJeans" maxLength={120} required disabled={!user || buscando} />
        </label>
        <button type="submit" disabled={!user || buscando || !musica.trim() || !artista.trim()}>
          {buscando ? 'Buscando...' : 'Buscar no YouTube'}
        </button>
      </form>

      {mensagem && (
        <p role="status" aria-live="polite" style={{ maxWidth: 900, margin: '1rem auto', color: tipoMensagem === 'erro' ? '#fca5a5' : tipoMensagem === 'sucesso' ? '#86efac' : '#ddd6fe' }}>
          {mensagem}
        </p>
      )}

      {selecionado && (
        <section aria-label="Prévia da música selecionada" style={{ maxWidth: 900, margin: '2rem auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{ overflow: 'hidden', border: '1px solid #7043a6', borderRadius: 20, background: '#100b18', boxShadow: '0 14px 34px rgba(0,0,0,.35)' }}>
            <iframe
              src={`https://www.youtube.com/embed/${selecionado.video_id}?rel=0`}
              title={`Prévia: ${selecionado.titulo}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ width: '100%', aspectRatio: '16 / 9', border: 0, display: 'block' }}
            />
          </div>
          <div>
            {selecionado.recomendado && <span style={{ display: 'inline-block', marginBottom: '0.6rem', color: '#e9d5ff', fontWeight: 700 }}>★ Melhor correspondência</span>}
            <h2 style={{ margin: '0 0 0.5rem' }}>{selecionado.titulo}</h2>
            <p style={{ margin: '0.35rem 0', color: '#d8cce5' }}>Canal: {selecionado.canal}</p>
            <p style={{ margin: '0.35rem 0 1rem', color: '#d8b4fe' }}>Tipo: {selecionado.tipo}</p>
            {selecionado.ja_cadastrado ? (
              <p role="status" style={{ color: '#fcd34d' }}>Essa música já está cadastrada no catálogo.</p>
            ) : (
              <button type="button" onClick={adicionar} disabled={!user || adicionando}>
                {adicionando ? 'Adicionando...' : 'Adicionar esta música'}
              </button>
            )}
            <p style={{ marginTop: '0.85rem', fontSize: '0.85rem', color: '#a99ab9' }}>
              Ao adicionar, a música entra no catálogo global e nos torneios abertos.
            </p>
          </div>
        </section>
      )}

      {candidatos.length > 0 && (
        <section style={{ maxWidth: 900, margin: '2rem auto 0' }}>
          <h2>Resultados ({candidatos.length})</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {candidatos.map((candidato) => {
              const ativo = selecionado?.video_id === candidato.video_id;
              return (
                <button
                  key={candidato.video_id}
                  type="button"
                  onClick={() => setSelecionado(candidato)}
                  aria-pressed={ativo}
                  className="catalog-card"
                  style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr) auto', width: '100%', minHeight: 0, gap: '1rem', alignItems: 'center', textAlign: 'left', padding: '0.75rem', borderRadius: 18, borderColor: ativo ? '#d8b4fe' : '#4d3172', background: ativo ? '#2b1d3c' : '#171020' }}
                >
                  {candidato.thumbnail
                    ? <img src={candidato.thumbnail} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 10 }} />
                    : <span aria-hidden="true" style={{ aspectRatio: '16 / 9', display: 'grid', placeItems: 'center', background: '#08060d', borderRadius: 10 }}>▶</span>}
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{candidato.titulo}</strong>
                    <span style={{ display: 'block', marginTop: '0.3rem', color: '#c4b5d5' }}>{candidato.canal} · {candidato.tipo}</span>
                  </span>
                  <span style={{ color: candidato.ja_cadastrado ? '#fcd34d' : candidato.recomendado ? '#e9d5ff' : '#b7a9c9', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {candidato.ja_cadastrado ? 'Já adicionada' : candidato.recomendado ? '★ Recomendada' : 'Selecionar'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
