const BASE_URL = "http://127.0.0.1:8000";

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
}

export interface VideoStats {
  torneios_vencidos: number;
  duelos_jogados: number;
  duelos_vencidos: number;
}

export interface PartidaResponse {
  torneio_id: string;
  videos: VideoItem[];
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
    if (!resposta.ok) throw new Error("Erro ao carregar o torneio");
    return await resposta.json();
  },

  listarVideos: async (): Promise<VideoItem[]> => {
    const resposta = await fetch(`${BASE_URL}/videos`);
    if (!resposta.ok) throw new Error("Erro ao carregar músicas");
    return await resposta.json();
  },

  cadastrarVideo: async (urlYoutube: string): Promise<VideoItem> => {
    const resposta = await fetch(`${BASE_URL}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url_youtube: urlYoutube }),
    });
    if (!resposta.ok) throw new Error("Erro ao cadastrar música");
    return await resposta.json();
  },

  criarTorneio: async (titulo: string): Promise<{ mensagem: string; id: string }> => {
    const resposta = await fetch(`${BASE_URL}/torneios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo }),
    });
    if (!resposta.ok) throw new Error("Erro ao criar torneio");
    return await resposta.json();
  },

  registrarDuelo: async (torneioId: string, vencedorId: string, perdedorId: string): Promise<{ mensagem: string }> => {
    const resposta = await fetch(`${BASE_URL}/duelos/resultado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vencedor_id: vencedorId,
        perdedor_id: perdedorId,
        torneio_id: torneioId,
      }),
    });
    return await resposta.json();
  },

  finalizarTorneio: async (torneioId: string, campeaoId: string): Promise<{ mensagem: string }> => {
    const resposta = await fetch(`${BASE_URL}/torneios/finalizar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        torneio_id: torneioId,
        campeao_id: campeaoId
      }),
    });
    return await resposta.json();
  }
};