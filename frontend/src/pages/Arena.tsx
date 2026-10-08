import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChampionCard from '../components/ChampionCard';
import VideoCard from '../components/VideoCard';
import RandomButton from '../components/RandomButton';
import CancelButton from '../components/CancelButton';
import { api } from '../services/api';
import type { MatchStats, VideoItem } from '../services/api';

interface DuelStateSnapshot {
  fila: VideoItem[];
  vencedoresRodada: VideoItem[];
  dueloAtual: number;
  duelosNaRodada: number;
  estatisticas: Record<string, MatchStats>;
  esconderProximoDuelo?: boolean;
  dueloSurpresaAtivo?: boolean;
  videosRevelados?: string[];
}

interface ArenaSnapshot extends DuelStateSnapshot {
  historicoDuelos?: DuelStateSnapshot[];
  // Nomes antigos, mantidos só para ler snapshots salvos antes da mudança
  esconderProximaRodada?: boolean;
  rodadaSurpresaAtiva?: boolean;
}

const embaralharArray = (array: VideoItem[]) => {
  const novoArray = [...array];
  for (let i = novoArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [novoArray[i], novoArray[j]] = [novoArray[j], novoArray[i]];
  }
  return novoArray;
};

export default function Arena() {
  const [fila, setFila] = useState<VideoItem[]>([]);
  const [vencedoresRodada, setVencedoresRodada] = useState<VideoItem[]>([]);
  const [dueloAtual, setDueloAtual] = useState(1);
  const [duelosNaRodada, setDuelosNaRodada] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [estatisticas, setEstatisticas] = useState<Record<string, MatchStats>>({});
  // "Armado": o PRÓXIMO duelo vai começar escondido
  const [esconderProximoDuelo, setEsconderProximoDuelo] = useState(false);
  // O duelo que está na tela agora está escondido
  const [dueloSurpresaAtivo, setDueloSurpresaAtivo] = useState(false);
  const [videosRevelados, setVideosRevelados] = useState<string[]>([]);
  const [historicoDuelos, setHistoricoDuelos] = useState<DuelStateSnapshot[]>([]);
  const [inicializada, setInicializada] = useState(false);
  const resultadoSalvo = useRef<string | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const torneioId = searchParams.get('torneioId');
  const tamanhoDaChave = searchParams.get('tamanho') || 'max';

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
              setEsconderProximoDuelo(snapshot.esconderProximoDuelo ?? snapshot.esconderProximaRodada ?? false);
              setDueloSurpresaAtivo(snapshot.dueloSurpresaAtivo ?? snapshot.rodadaSurpresaAtiva ?? false);
              setVideosRevelados(snapshot.videosRevelados ?? []);
              setHistoricoDuelos(snapshot.historicoDuelos ?? []);
              return;
            }
          } catch {
            window.localStorage.removeItem(storageKey);
          }
        }

        const dados = await api.iniciarPartida(idDoTorneio, tamanhoDaChave);
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
  }, [torneioId, tamanhoDaChave]);

  useEffect(() => {
    if (!torneioId || !inicializada || fila.length === 0) return;

    const snapshot: ArenaSnapshot = {
      fila,
      vencedoresRodada,
      dueloAtual,
      duelosNaRodada,
      estatisticas,
      esconderProximoDuelo,
      dueloSurpresaAtivo,
      videosRevelados,
      historicoDuelos,
    };
    window.localStorage.setItem(`this-that:arena:${torneioId}`, JSON.stringify(snapshot));
  }, [dueloAtual, duelosNaRodada, dueloSurpresaAtivo, esconderProximoDuelo, estatisticas, fila, historicoDuelos, inicializada, torneioId, vencedoresRodada, videosRevelados]);

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
    const estadoAnterior: DuelStateSnapshot = {
      fila,
      vencedoresRodada,
      dueloAtual,
      duelosNaRodada,
      estatisticas,
      esconderProximoDuelo,
      dueloSurpresaAtivo,
      videosRevelados,
    };
    setHistoricoDuelos((historico) => [...historico, estadoAnterior].slice(-2));

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

    // O que estava "armado" vale para o duelo que vai aparecer agora,
    // seja ele da mesma rodada ou o primeiro da próxima. Depois é consumido.
    const proximoDueloSurpresa = esconderProximoDuelo;
    setDueloSurpresaAtivo(proximoDueloSurpresa);
    setEsconderProximoDuelo(false);
    setVideosRevelados([]);

    const iniciarProximaRodada = (participantes: VideoItem[]) => {
      const participantesEmbaralhados = embaralharArray(participantes);
      setFila(participantesEmbaralhados);
      setVencedoresRodada([]);
      setDueloAtual(1);
      setDuelosNaRodada(Math.ceil(participantesEmbaralhados.length / 2));
    };

    if (restantes.length === 0) {
      if (vencedores.length === 1) {
        setFila(vencedores);
        return;
      }

      iniciarProximaRodada(vencedores);
      return;
    }

    if (restantes.length === 1) {
      iniciarProximaRodada([...vencedores, restantes[0]]);
      return;
    }

    setFila(restantes);
    setVencedoresRodada(vencedores);
    setDueloAtual((atual) => atual + 1);
  };

  const revelarVideo = (videoId: string) => {
    setVideosRevelados((atuais) => (atuais.includes(videoId) ? atuais : [...atuais, videoId]));
  };

  const voltarDuelo = () => {
    const estadoAnterior = historicoDuelos[historicoDuelos.length - 1];
    if (!estadoAnterior) return;

    setFila(estadoAnterior.fila);
    setVencedoresRodada(estadoAnterior.vencedoresRodada);
    setDueloAtual(estadoAnterior.dueloAtual);
    setDuelosNaRodada(estadoAnterior.duelosNaRodada);
    setEstatisticas(estadoAnterior.estatisticas);
    setEsconderProximoDuelo(estadoAnterior.esconderProximoDuelo ?? false);
    setDueloSurpresaAtivo(estadoAnterior.dueloSurpresaAtivo ?? false);
    setVideosRevelados(estadoAnterior.videosRevelados ?? []);
    setHistoricoDuelos((historico) => historico.slice(0, -1));
    setMensagem('');
  };

  if (!torneioId) return <h2>Nenhum torneio foi selecionado.</h2>;
  if (carregando) return <h2>Loading...</h2>;
  if (fila.length === 0) return <h2>Nenhum vídeo encontrado.</h2>;

  if (fila.length === 1) {
    return <ChampionCard video={fila[0]} torneioId={torneioId} mensagem={mensagem} />;
  }

  const video1 = fila[0];
  const video2 = fila[1];
  const duplaRevelada = !dueloSurpresaAtivo ||
    (videosRevelados.includes(video1.video_id) && videosRevelados.includes(video2.video_id));

  const escolherAleatorio = () => {
    if (Math.random() < 0.5) {
      escolherVencedor(video1, video2);
    } else {
      escolherVencedor(video2, video1);
    }
  };

  const interromperPartida = () => {
    if (window.confirm('Deseja realmente sair? O progresso desta partida será apagado.')) {
      window.localStorage.removeItem(`this-that:arena:${torneioId}`);
      navigate(`/torneios/${torneioId}`);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>THIS OR THAT</h1>
      <div className="round-progress-container">
        <p className="round-progress" aria-live="polite">Duelo {dueloAtual} de {duelosNaRodada}</p>
      </div>
      <div className="arena-round-actions">
        <button
          type="button"
          className="undo-duel-button"
          disabled={historicoDuelos.length === 0}
          onClick={voltarDuelo}
          aria-label="Voltar um duelo"
          title="Desfazer o último duelo"
        >
          <span aria-hidden="true">↶</span> Voltar duelo
        </button>
        <button
          type="button"
          className={esconderProximoDuelo ? 'surprise-round-toggle is-active' : 'surprise-round-toggle'}
          aria-pressed={esconderProximoDuelo}
          onClick={() => setEsconderProximoDuelo((atual) => !atual)}
        >
          Esconder próximo duelo
        </button>
      </div>
      {mensagem && <p>{mensagem}</p>}

      <RandomButton onClick={escolherAleatorio} disabled={!duplaRevelada} />

      <CancelButton onClick={interromperPartida} />

      <div className="duel-board" key={`${video1.video_id}-${video2.video_id}`}>
        <VideoCard
          video={video1}
          label="Vídeo 1"
          accent="red"
          hidden={dueloSurpresaAtivo}
          revealed={videosRevelados.includes(video1.video_id)}
          canChoose={duplaRevelada}
          onReveal={() => revelarVideo(video1.video_id)}
          onClick={() => escolherVencedor(video1, video2)}
        />

        <VideoCard
          video={video2}
          label="Vídeo 2"
          accent="blue"
          hidden={dueloSurpresaAtivo}
          revealed={videosRevelados.includes(video2.video_id)}
          canChoose={duplaRevelada}
          onReveal={() => revelarVideo(video2.video_id)}
          onClick={() => escolherVencedor(video2, video1)}
        />
      </div>
    </div>
  );
}