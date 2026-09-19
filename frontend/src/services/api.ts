import { firebaseAuth } from './firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function parseResponse<T>(resposta: Response): Promise<T> {
  const payload = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new Error(payload?.detail || 'Erro ao comunicar com a API');
  }
  return payload as T;
}

async function authHeaders(): Promise<HeadersInit> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('Entre com sua conta Google para continuar.');
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

export interface VideoItem {
  video_id: string;
  url: string;
  nome: string;
}

export interface TournamentItem {
  id: string;
  titulo: string;
  descricao?: string;
  video_ids: string[];
  estatisticas_videos?: Record<string, VideoStats>;
  estado: 'aberto' | 'em_andamento';
}

export interface VideoStats {
  torneios_vencidos: number;
  duelos_jogados: number;
  duelos_vencidos: number;
}

export interface PartidaResponse {
  torneio_id: string;
  videos: VideoItem[];
  estado: 'aberto' | 'em_andamento';
  partida: {
    fila_ids: string[];
    vencedores_ids: string[];
    rodada: number;
    duelo_atual: number;
    duelos_na_rodada: number;
  };
}

export interface VideoRankingItem extends VideoItem {
  torneios_vencidos: number;
  duelos_jogados: number;
  duelos_vencidos: number;
  porcentagem_vitoria: number;
}

export interface TournamentDetailsResponse {
  torneio: TournamentItem;
  ranking: VideoRankingItem[];
}

// 2. Objeto da API tipado
export const api = {
  listarTorneios: async (): Promise<TournamentItem[]> => {
    const resposta = await fetch(`${BASE_URL}/torneios`);
    if (!resposta.ok) throw new Error("Erro ao carregar torneios");
    return await resposta.json();
  },

  detalhesTorneio: async (torneioId: string): Promise<TournamentDetailsResponse> => {
    const resposta = await fetch(`${BASE_URL}/torneios/${torneioId}`);
    if (!resposta.ok) throw new Error("Erro ao carregar torneio");
    return await resposta.json();
  },
  
  iniciarPartida: async (torneioId: string): Promise<PartidaResponse> => {
    const resposta = await fetch(`${BASE_URL}/torneios/${torneioId}/jogar`);
    return parseResponse<PartidaResponse>(resposta);
  },

  listarVideos: async (): Promise<VideoItem[]> => {
    const resposta = await fetch(`${BASE_URL}/videos`);
    return parseResponse<VideoItem[]>(resposta);
  },

  cadastrarVideo: async (urlYoutube: string): Promise<VideoItem> => {
    const headers = await authHeaders();
    const resposta = await fetch(`${BASE_URL}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ url_youtube: urlYoutube }),
    });
    return parseResponse<VideoItem>(resposta);
  },

  excluirVideo: async (videoId: string): Promise<void> => {
    const headers = await authHeaders();
    const resposta = await fetch(`${BASE_URL}/videos/${videoId}`, { method: 'DELETE', headers });
    await parseResponse<null>(resposta);
  },

  criarTorneio: async (titulo: string): Promise<{ mensagem: string; id: string }> => {
    const headers = await authHeaders();
    const resposta = await fetch(`${BASE_URL}/torneios`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ titulo }),
    });
    return parseResponse<{ mensagem: string; id: string }>(resposta);
  },

  registrarDuelo: async (torneioId: string, vencedorId: string, perdedorId: string): Promise<PartidaResponse> => {
    const resposta = await fetch(`${BASE_URL}/duelos/resultado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vencedor_id: vencedorId,
        perdedor_id: perdedorId,
        torneio_id: torneioId,
      }),
    });
    return parseResponse<PartidaResponse>(resposta);
  },

};