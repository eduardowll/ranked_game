import { useEffect, useRef, useState } from 'react';
import ChampionCard from '../components/ChampionCard';
import VideoCard from '../components/VideoCard';
import { api } from '../services/api';
import type { VideoItem } from '../services/api';

export default function Arena() {
  const [fila, setFila] = useState<VideoItem[]>([]);
  const [vencedoresRodada, setVencedoresRodada] = useState<VideoItem[]>([]);
  const [dueloAtual, setDueloAtual] = useState(1);
  const [duelosNaRodada, setDuelosNaRodada] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const campeaoFinalizado = useRef<string | null>(null);

  const query = new URLSearchParams(window.location.search);
  const torneioId = query.get('torneioId') ?? localStorage.getItem('torneioId') ?? 'VijZEtAMdWEFe8d4KEGu';

  useEffect(() => {
    async function prepararArena() {
      try {
        const dados = await api.iniciarPartida(torneioId);
        setFila(dados.videos);
        setDuelosNaRodada(Math.ceil(dados.videos.length / 2));
      } catch (erro) {
        console.error('Erro na Arena:', erro);
      } finally {
        setCarregando(false);
      }
    }

    prepararArena();
  }, [torneioId]);

  useEffect(() => {
    if (fila.length !== 1) return;

    const campeao = fila[0];
    if (campeaoFinalizado.current === campeao.video_id) return;

    campeaoFinalizado.current = campeao.video_id;
    if (vencedoresRodada.length > 0) return;

    api.finalizarTorneio(torneioId, campeao.video_id).catch((erro) => {
      campeaoFinalizado.current = null;
      console.error('Erro ao finalizar torneio:', erro);
      setMensagem('Não foi possível salvar o campeão do torneio.');
    });
  }, [fila, torneioId, vencedoresRodada.length]);

  useEffect(() => {
    if (fila.length !== 1 || vencedoresRodada.length === 0) return;

    const novosVencedores = [...vencedoresRodada, fila[0]];
    if (novosVencedores.length === 1) {
      setFila(novosVencedores);
      return;
    }

    setFila(novosVencedores);
    setVencedoresRodada([]);
    setDueloAtual(1);
    setDuelosNaRodada(Math.ceil(novosVencedores.length / 2));
  }, [fila, vencedoresRodada]);

  const escolherVencedor = async (vencedor: VideoItem, perdedor: VideoItem) => {
    try {
      await api.registrarDuelo(torneioId, vencedor.video_id, perdedor.video_id);

      const restantes = fila.slice(2);
      const novosVencedores = [...vencedoresRodada, vencedor];

      if (restantes.length > 0) {
        setFila(restantes);
        setVencedoresRodada(novosVencedores);
        setDueloAtual((atual) => atual + 1);
        return;
      }

      if (novosVencedores.length === 1) {
        setFila(novosVencedores);
        return;
      }

      setFila(novosVencedores);
      setVencedoresRodada([]);
      setDueloAtual(1);
      setDuelosNaRodada(Math.ceil(novosVencedores.length / 2));
    } catch (erro) {
      console.error('Erro ao registrar duelo:', erro);
      setMensagem('Não foi possível registrar a vitória.');
    }
  };

  if (carregando) return <h2>Carregando a arena... ⚔️</h2>;
  if (fila.length === 0) return <h2>Nenhum vídeo encontrado.</h2>;

  if (fila.length === 1 && vencedoresRodada.length > 0) {
    return (
      <div className="round-transition" role="status">
        <h2>Preparando a próxima rodada...</h2>
      </div>
    );
  }

  if (fila.length === 1) {
    return <ChampionCard video={fila[0]} torneioId={torneioId} />;
  }

  const video1 = fila[0];
  const video2 = fila[1];

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>THIS OR THAT</h1>
      <p className="round-progress" aria-live="polite">Rodada {dueloAtual} de {duelosNaRodada}</p>
      {mensagem && <p>{mensagem}</p>}

      <div className="duel-board" key={`${video1.video_id}-${video2.video_id}`}>
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