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
  owner_uid?: string;
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

export interface MatchStats {
  duelos_jogados: number;
  duelos_vencidos: number;
}

export interface VideoRankingItem extends VideoItem {
  torneios_vencidos: number;
  duelos_jogados: number;
  duelos_vencidos: number;
  porcentagem_vitoria: number;
}

export interface TournamentDetailsResponse {
  torneio: TournamentItem;
  ranking: {
    items: VideoRankingItem[];
    total: number;
    page: number;
    page_size: number;
  };
}

// 2. Objeto da API tipado
export const api = {
  listarTorneios: async (): Promise<TournamentItem[]> => {
    const resposta = await fetch(`${BASE_URL}/torneios`);
    return parseResponse<TournamentItem[]>(resposta);
  },

  detalhesTorneio: async (torneioId: string, page = 1, pageSize = 20): Promise<TournamentDetailsResponse> => {
    const resposta = await fetch(`${BASE_URL}/torneios/${torneioId}?page=${page}&page_size=${pageSize}`);
    return parseResponse<TournamentDetailsResponse>(resposta);
  },
  
  iniciarPartida: async (torneioId: string, tamanho: string = 'max'): Promise<PartidaResponse> => {
      const resposta = await fetch(`${BASE_URL}/torneios/${torneioId}/jogar?tamanho=${tamanho}`);
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

  atualizarVideo: async (videoId: string, urlYoutube: string): Promise<VideoItem> => {
    const headers = await authHeaders();
    const resposta = await fetch(`${BASE_URL}/videos/${videoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
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

  excluirTorneio: async (torneioId: string): Promise<void> => {
    const headers = await authHeaders();
    const resposta = await fetch(`${BASE_URL}/torneios/${torneioId}`, {
      method: 'DELETE',
      headers,
    });
    await parseResponse<null>(resposta);
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

  salvarResultadoTorneio: async (torneioId: string, campeaoId: string, estatisticas: Record<string, MatchStats>): Promise<void> => {
    const resposta = await fetch(`${BASE_URL}/torneios/resultado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ torneio_id: torneioId, campeao_id: campeaoId, estatisticas }),
    });
    await parseResponse<{ mensagem: string }>(resposta);
  },

};