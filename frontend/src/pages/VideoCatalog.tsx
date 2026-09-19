import { useEffect, useState, type FormEvent } from 'react';
import VideoCatalogCard from '../components/VideoCatalogCard';
import AuthButton from '../components/AuthButton';
import { useAuth } from '../contexts/useAuth';
import { api } from '../services/api';
import type { VideoItem } from '../services/api';

export default function VideoCatalog() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [videoEditando, setVideoEditando] = useState<VideoItem | null>(null);
  const [novaUrl, setNovaUrl] = useState('');

  useEffect(() => {
    api.listarVideos()
      .then(setVideos)
      .catch((erro) => setMensagem(erro instanceof Error ? erro.message : 'Erro ao carregar músicas.'))
      .finally(() => setCarregando(false));
  }, []);

  const excluir = async (video: VideoItem) => {
    try {
      await api.excluirVideo(video.video_id);
      setVideos((atuais) => atuais.filter((item) => item.video_id !== video.video_id));
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível remover a música.');
    }
  };

  const atualizar = async (event: FormEvent) => {
    event.preventDefault();
    if (!videoEditando) return;

    try {
      const videoAtualizado = await api.atualizarVideo(videoEditando.video_id, novaUrl);
      setVideos((atuais) => atuais.map((item) => item.video_id === videoEditando.video_id ? videoAtualizado : item));
      setVideoEditando(null);
      setNovaUrl('');
      setMensagem(`Música atualizada: ${videoAtualizado.nome}`);
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível atualizar a música.');
    }
  };

  const filtrados = videos.filter((video) => video.nome.toLowerCase().includes(busca.toLowerCase()));

  if (carregando) return <h2>Carregando músicas...</h2>;

  return (
    <section style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
      <button type="button" onClick={() => { window.location.href = '/torneios'; }}>Voltar para torneios</button>
      <AuthButton />
      <h1>Catálogo de músicas</h1>
      <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por título" style={{ width: '100%', padding: '0.75rem', boxSizing: 'border-box' }} />
      {mensagem && <p role="status">{mensagem}</p>}
      {videoEditando && (
        <form onSubmit={atualizar} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <input
            value={novaUrl}
            onChange={(event) => setNovaUrl(event.target.value)}
            placeholder="Nova URL do YouTube"
            required
            style={{ flex: '1 1 320px' }}
          />
          <button type="submit">Salvar alteração</button>
          <button type="button" onClick={() => setVideoEditando(null)}>Cancelar</button>
        </form>
      )}
      <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1.5rem' }}>
        {filtrados.map((video) => (
              <VideoCatalogCard
                key={video.video_id}
                video={video}
                onRemove={() => excluir(video)}
                onEdit={() => { setVideoEditando(video); setNovaUrl(video.url); }}
                podeRemover={Boolean(user)}
              />
        ))}
      </div>
    </section>
  );
}