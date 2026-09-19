import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChampionCard from '../components/ChampionCard';
import VideoCard from '../components/VideoCard';
import { api } from '../services/api';
import type { MatchStats, VideoItem } from '../services/api';

interface ArenaSnapshot {
  fila: VideoItem[];
  vencedoresRodada: VideoItem[];
  dueloAtual: number;
  duelosNaRodada: number;
  estatisticas: Record<string, MatchStats>;
}

export default function Arena() {
  const [fila, setFila] = useState<VideoItem[]>([]);
  const [vencedoresRodada, setVencedoresRodada] = useState<VideoItem[]>([]);
  const [dueloAtual, setDueloAtual] = useState(1);
  const [duelosNaRodada, setDuelosNaRodada] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [estatisticas, setEstatisticas] = useState<Record<string, MatchStats>>({});
  const [inicializada, setInicializada] = useState(false);
  const resultadoSalvo = useRef<string | null>(null);

  const [searchParams] = useSearchParams();
  const torneioId = searchParams.get('torneioId');

  useEffect(() => {
    if (!torneioId) {
      return;
    }

    const idDoTorneio = torneioId;
    const storageKey = `this-that:arena:${idDoTorneio}`;

    async function prepararArena() {
      try {
        const snapshotSalvo = window.localStorage.getItem(storageKey);
        if (snapshotSalvo) {
          try {
            const snapshot = JSON.parse(snapshotSalvo) as ArenaSnapshot;
            if (snapshot.fila.length > 0 && snapshot.estatisticas) {
              setFila(snapshot.fila);
              setVencedoresRodada(snapshot.vencedoresRodada);
              setDueloAtual(snapshot.dueloAtual);
              setDuelosNaRodada(snapshot.duelosNaRodada);
              setEstatisticas(snapshot.estatisticas);
              return;
            }
          } catch {
            window.localStorage.removeItem(storageKey);
          }
        }

        const dados = await api.iniciarPartida(idDoTorneio);
        setFila(dados.videos);
        setDueloAtual(dados.partida.duelo_atual);
        setDuelosNaRodada(dados.partida.duelos_na_rodada);
        setEstatisticas(Object.fromEntries(dados.videos.map((video) => [
          video.video_id,
          { duelos_jogados: 0, duelos_vencidos: 0 },
        ])));
      } catch (erro) {
        console.error('Erro na Arena:', erro);
      } finally {
        setInicializada(true);
        setCarregando(false);
      }
    }

    prepararArena();
  }, [torneioId]);

  useEffect(() => {
    if (!torneioId || !inicializada || fila.length === 0) return;

    const snapshot: ArenaSnapshot = {
      fila,
      vencedoresRodada,
      dueloAtual,
      duelosNaRodada,
      estatisticas,
    };
    window.localStorage.setItem(`this-that:arena:${torneioId}`, JSON.stringify(snapshot));
  }, [dueloAtual, duelosNaRodada, estatisticas, fila, inicializada, torneioId, vencedoresRodada]);

  useEffect(() => {
    if (!torneioId || fila.length !== 1 || resultadoSalvo.current === fila[0].video_id) return;

    const campeaoId = fila[0].video_id;
    resultadoSalvo.current = campeaoId;
    api.salvarResultadoTorneio(torneioId, campeaoId, estatisticas)
      .then(() => window.localStorage.removeItem(`this-that:arena:${torneioId}`))
      .catch((erro) => {
        resultadoSalvo.current = null;
        console.error('Erro ao salvar resultado do torneio:', erro);
        setMensagem('Campeão definido localmente, mas não foi possível salvar o resultado.');
      });
  }, [estatisticas, fila, torneioId]);

  const escolherVencedor = (vencedor: VideoItem, perdedor: VideoItem) => {
    setEstatisticas((atuais) => ({
      ...atuais,
      [vencedor.video_id]: {
        duelos_jogados: (atuais[vencedor.video_id]?.duelos_jogados ?? 0) + 1,
        duelos_vencidos: (atuais[vencedor.video_id]?.duelos_vencidos ?? 0) + 1,
      },
      [perdedor.video_id]: {
        duelos_jogados: (atuais[perdedor.video_id]?.duelos_jogados ?? 0) + 1,
        duelos_vencidos: atuais[perdedor.video_id]?.duelos_vencidos ?? 0,
      },
    }));

    const restantes = fila.slice(2);
    const vencedores = [...vencedoresRodada, vencedor];

    if (restantes.length === 0) {
      if (vencedores.length === 1) {
        setFila(vencedores);
        return;
      }

      setFila(vencedores);
      setVencedoresRodada([]);
      setDueloAtual(1);
      setDuelosNaRodada(Math.ceil(vencedores.length / 2));
      return;
    }

    if (restantes.length === 1) {
      const proximaRodada = [...vencedores, restantes[0]];
      setFila(proximaRodada);
      setVencedoresRodada([]);
      setDueloAtual(1);
      setDuelosNaRodada(Math.ceil(proximaRodada.length / 2));
      return;
    }

    setFila(restantes);
    setVencedoresRodada(vencedores);
    setDueloAtual((atual) => atual + 1);
  };

  if (!torneioId) return <h2>Nenhum torneio foi selecionado.</h2>;
  if (carregando) return <h2>Carregando a arena... ⚔️</h2>;
  if (fila.length === 0) return <h2>Nenhum vídeo encontrado.</h2>;

  if (fila.length === 1) {
    return <ChampionCard video={fila[0]} torneioId={torneioId} mensagem={mensagem} />;
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