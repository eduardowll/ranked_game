const BASE_URL = "http://127.0.0.1:8000";

// 1. Tipos (Espelhos dos modelos Pydantic do backend)
export interface VideoItem {
  video_id: string;
  url: string;
  nome: string;
  // Outras estatísticas podem vir aqui depois
}

export interface PartidaResponse {
  torneio_id: string;
  videos: VideoItem[];
}

// 2. Objeto da API tipado
export const api = {
  
  // Especificamos que 'torneioId' é uma string e a função devolve uma PartidaResponse
  iniciarPartida: async (torneioId: string): Promise<PartidaResponse> => {
    const resposta = await fetch(`${BASE_URL}/torneios/${torneioId}/jogar`);
    if (!resposta.ok) throw new Error("Erro ao carregar o torneio");
    return await resposta.json();
  },

  // 'vencedorId' e 'perdedorId' também são strings
  registrarDuelo: async (vencedorId: string, perdedorId: string): Promise<{ mensagem: string }> => {
    const resposta = await fetch(`${BASE_URL}/duelos/resultado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vencedor_id: vencedorId,
        perdedor_id: perdedorId
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