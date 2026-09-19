import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChampionCard from '../components/ChampionCard';
import VideoCard from '../components/VideoCard';
import { api } from '../services/api';
import type { VideoItem } from '../services/api';

export default function Arena() {
  const [fila, setFila] = useState<VideoItem[]>([]);
  const [dueloAtual, setDueloAtual] = useState(1);
  const [duelosNaRodada, setDuelosNaRodada] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [searchParams] = useSearchParams();
  const torneioId = searchParams.get('torneioId');

  useEffect(() => {
    if (!torneioId) {
      return;
    }

    const idDoTorneio = torneioId;

    async function prepararArena() {
      try {
        const dados = await api.iniciarPartida(idDoTorneio);
        setFila(dados.videos);
        setDueloAtual(dados.partida.duelo_atual);
        setDuelosNaRodada(dados.partida.duelos_na_rodada);
      } catch (erro) {
        console.error('Erro na Arena:', erro);
      } finally {
        setCarregando(false);
      }
    }

    prepararArena();
  }, [torneioId]);

  const escolherVencedor = async (vencedor: VideoItem, perdedor: VideoItem) => {
    if (salvando || !torneioId) return;
    setSalvando(true);
    try {
      const dados = await api.registrarDuelo(torneioId, vencedor.video_id, perdedor.video_id);
      setFila(dados.videos);
      setDueloAtual(dados.partida.duelo_atual);
      setDuelosNaRodada(dados.partida.duelos_na_rodada);
    } catch (erro) {
      console.error('Erro ao registrar duelo:', erro);
      setMensagem('Não foi possível registrar a vitória.');
    } finally {
      setSalvando(false);
    }
  };

  if (!torneioId) return <h2>Nenhum torneio foi selecionado.</h2>;
  if (carregando) return <h2>Carregando a arena... ⚔️</h2>;
  if (fila.length === 0) return <h2>Nenhum vídeo encontrado.</h2>;

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