import { useEffect, useState } from 'react';
import VideoCard from '../components/VideoCard';
import { api } from '../services/api';
import type { VideoItem } from '../services/api';

export default function Arena() {
  const [fila, setFila] = useState<VideoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');

  const query = new URLSearchParams(window.location.search);
  const torneioId = query.get('torneioId') ?? localStorage.getItem('torneioId') ?? 'VijZEtAMdWEFe8d4KEGu';

  useEffect(() => {
    async function prepararArena() {
      try {
        const dados = await api.iniciarPartida(torneioId);
        setFila(dados.videos);
      } catch (erro) {
        console.error('Erro na Arena:', erro);
      } finally {
        setCarregando(false);
      }
    }

    prepararArena();
  }, [torneioId]);

  const escolherVencedor = async (vencedor: VideoItem, perdedor: VideoItem) => {
    try {
      setMensagem(`Registrando vitória de ${vencedor.nome || vencedor.video_id}...`);
      await api.registrarDuelo(vencedor.video_id, perdedor.video_id);

      setFila((atual) => {
        const semOsDois = atual.filter(
          (item) => item.video_id !== vencedor.video_id && item.video_id !== perdedor.video_id,
        );

        if (semOsDois.length === 0) {
          return [vencedor];
        }

        return [...semOsDois, vencedor];
      });
    } catch (erro) {
      console.error('Erro ao registrar duelo:', erro);
      setMensagem('Não foi possível registrar a vitória.');
    }
  };

  if (carregando) return <h2>Carregando a arena... ⚔️</h2>;
  if (fila.length === 0) return <h2>Nenhum vídeo encontrado.</h2>;

  if (fila.length === 1) {
    const campeao = fila[0];

    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1>🏆 Campeão da Arena</h1>
        <img
          src={`https://img.youtube.com/vi/${campeao.video_id}/hqdefault.jpg`}
          alt={campeao.nome || campeao.video_id}
          style={{ width: 320, borderRadius: 12, marginBottom: '1rem' }}
        />
        <h2>{campeao.nome || campeao.video_id}</h2>
      </div>
    );
  }

  const video1 = fila[0];
  const video2 = fila[1];

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>Arena de Duelo</h1>
      <p>Temos {fila.length} vídeos na fila de combate!</p>
      {mensagem && <p>{mensagem}</p>}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '2rem', flexWrap: 'wrap' }}>
        <VideoCard
          video={video1}
          label="Vídeo 1"
          accent="red"
          onClick={() => escolherVencedor(video1, video2)}
        />

        <VideoCard
          video={video2}
          label="Vídeo 2"
          accent="blue"
          onClick={() => escolherVencedor(video2, video1)}
        />
      </div>
    </div>
  );
}