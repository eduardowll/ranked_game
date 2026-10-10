// Dados falsos compartilhados pelos testes E2E.

export const idTorneioArena = 'torneio-arena-e2e';
export const idTorneioRanking = 'torneio-ranking-e2e';

export const videosArena = ['A', 'B', 'C', 'D'].map((letra) => {
  const videoId = letra.repeat(11);
  return {
    video_id: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    nome: `Vídeo ${letra}`,
  };
});

export const respostaIniciarPartida = {
  torneio_id: idTorneioArena,
  videos: videosArena,
  estado: 'aberto',
  partida: {
    fila_ids: videosArena.map((video) => video.video_id),
    vencedores_ids: [],
    rodada: 1,
    duelo_atual: 1,
    duelos_na_rodada: 2,
  },
};

export const torneioRanking = {
  id: idTorneioRanking,
  titulo: 'Torneio de teste',
  video_ids: Array.from({ length: 21 }, (_, i) => `VIDEO${String(i).padStart(6, '0')}`),
  estado: 'aberto',
  estatisticas_videos: {},
};

// 21 itens (índices 0 a 20): 20 na página 1 e 1 na página 2
export const itensRanking = Array.from({ length: 21 }, (_, i) => ({
  video_id: `VIDEO${String(i).padStart(6, '0')}`,
  url: `https://www.youtube.com/watch?v=VIDEO${String(i).padStart(6, '0')}`,
  nome: `Faixa ${i + 1}`,
  torneios_vencidos: 0,
  duelos_jogados: 0,
  duelos_vencidos: 0,
  porcentagem_vitoria: 0,
}));

export const paginaUm = itensRanking.slice(0, 20);
export const paginaDois = itensRanking.slice(20);

export const paginaDeRanking = (itens: typeof itensRanking, page: number) => ({
  torneio: torneioRanking,
  ranking: { items: itens, total: itensRanking.length, page, page_size: 20 },
});