import { idTorneioArena, respostaIniciarPartida } from '../support/mocks';

const seletorProgresso = '.round-progress';
const seletorCard = '.video-card';
const seletorToggle = '.surprise-round-toggle';
const seletorCobertura = '.video-card__cover';
const seletorRandom = '.random-button';
const chaveArena = (tamanho: string) => `this-that:arena:${idTorneioArena}:${tamanho}`;
const escolherPrimeiroCard = () => cy.get(seletorCard).first().trigger('click');

describe('Arena - duelo surpresa', () => {
  beforeEach(() => {
    cy.intercept(
      { method: 'GET', pathname: `/torneios/${idTorneioArena}/jogar`, resourceType: /xhr|fetch/ },
      { statusCode: 200, body: respostaIniciarPartida },
    ).as('iniciarPartida');

    cy.intercept('GET', 'https://www.youtube.com/**', {
      statusCode: 200,
      headers: { 'content-type': 'text/html' },
      body: '<html></html>',
    });

    cy.visit(`/arena?torneioId=${idTorneioArena}&tamanho=4`, {
      onBeforeLoad(window) {
        window.localStorage.clear();
        window.Math.random = () => 0;
      },
    });

    cy.wait('@iniciarPartida');
    cy.get(seletorProgresso).should('contain.text', 'Duelo 1 de 2');
    cy.get(seletorCard).should('have.length', 2);
  });

  it('mantém o duelo normal quando a opção não é ativada', () => {
    escolherPrimeiroCard();

    cy.get(seletorProgresso).should('contain.text', 'Duelo 2 de 2');
    cy.get(seletorCobertura).should('not.exist');
  });

  it('esconde o duelo seguinte quando o toggle é ativado', () => {
    cy.get(seletorToggle).should('not.have.class', 'is-active').click();
    cy.get(seletorToggle).should('have.class', 'is-active');

    cy.get(seletorCobertura).should('not.exist');
    escolherPrimeiroCard();

    cy.get(seletorToggle).should('not.have.class', 'is-active');
    cy.get(seletorProgresso).should('contain.text', 'Duelo 2 de 2');
    cy.get(seletorCobertura).should('have.length', 2);
    cy.get(seletorRandom).should('be.disabled');
  });

  it('libera a votação depois de revelar os dois vídeos', () => {
    cy.get(seletorToggle).click();
    escolherPrimeiroCard();
    cy.get(seletorCobertura).should('have.length', 2);

    cy.get(seletorCobertura).first().click();
    cy.get(seletorCobertura).should('have.length', 1);
    cy.get(seletorRandom).should('be.disabled');

    // Um card revelado ainda não pode registrar voto enquanto o outro está coberto.
    escolherPrimeiroCard();
    cy.get(seletorProgresso).should('contain.text', 'Duelo 2 de 2');

    cy.get(seletorCobertura).click();
    cy.get(seletorCobertura).should('not.exist');
    cy.get(seletorRandom).should('not.be.disabled');
  });

  it('persiste no localStorage o estado da rodada surpresa', () => {
    cy.get(seletorToggle).click();
    escolherPrimeiroCard();

    cy.window().should((window) => {
      const saved = window.localStorage.getItem(chaveArena('4'));
      if (!saved) throw new Error('Arena snapshot was not saved to localStorage.');
      const snapshot = JSON.parse(saved);
      expect(snapshot.dueloSurpresaAtivo).to.equal(true);
      expect(snapshot.esconderProximoDuelo).to.equal(false);
    });
  });

  it('retoma o mesmo duelo após recarregar sem iniciar outra partida', () => {
    escolherPrimeiroCard();
    cy.get(seletorProgresso).should('contain.text', 'Duelo 2 de 2');

    cy.window().should((window) => {
      const saved = window.localStorage.getItem(chaveArena('4'));
      if (!saved) throw new Error('Arena snapshot was not saved to localStorage.');
      const snapshot = JSON.parse(saved);
      expect(snapshot.fila.map((video: { video_id: string }) => video.video_id))
        .to.deep.equal(['DDDDDDDDDDD', 'AAAAAAAAAAA']);
      expect(snapshot.vencedoresRodada.map((video: { video_id: string }) => video.video_id))
        .to.deep.equal(['BBBBBBBBBBB']);
    });

    cy.get('@iniciarPartida.all').then((callsBeforeReload) => {
      cy.reload();
      cy.get(seletorProgresso).should('contain.text', 'Duelo 2 de 2');
      cy.get(seletorCard).should('contain.text', 'Vídeo D').and('contain.text', 'Vídeo A');
      cy.get('@iniciarPartida.all').should('have.length', callsBeforeReload.length);
    });
  });

  it('desfaz o último duelo e restaura fila e estatísticas', () => {
    escolherPrimeiroCard();
    cy.get(seletorProgresso).should('contain.text', 'Duelo 2 de 2');
    cy.get('.undo-duel-button').should('not.be.disabled').click();

    cy.get(seletorProgresso).should('contain.text', 'Duelo 1 de 2');
    cy.window().should((window) => {
      const saved = window.localStorage.getItem(chaveArena('4'));
      if (!saved) throw new Error('Arena snapshot was not saved to localStorage.');
      const snapshot = JSON.parse(saved);
      expect(snapshot.fila.map((video: { video_id: string }) => video.video_id))
        .to.deep.equal(['BBBBBBBBBBB', 'CCCCCCCCCCC', 'DDDDDDDDDDD', 'AAAAAAAAAAA']);
      expect(snapshot.estatisticas.AAAAAAAAAAA).to.deep.equal({ duelos_jogados: 0, duelos_vencidos: 0 });
      expect(snapshot.estatisticas.BBBBBBBBBBB).to.deep.equal({ duelos_jogados: 0, duelos_vencidos: 0 });
    });
  });

  it('envia as estatísticas acumuladas ao concluir o torneio', () => {
    cy.intercept('POST', '/torneios/resultado', {
      statusCode: 200,
      body: { mensagem: 'Resultado do torneio salvo.' },
    }).as('salvarResultado');

    for (let duelo = 0; duelo < 3; duelo += 1) {
      escolherPrimeiroCard();
    }

    cy.wait('@salvarResultado').then(({ request }) => {
      const estatisticas = request.body.estatisticas as Record<string, {
        duelos_jogados: number;
        duelos_vencidos: number;
      }>;
      expect(Object.keys(estatisticas)).to.have.length(4);
      expect(Object.values(estatisticas).reduce((total, item) => total + item.duelos_jogados, 0)).to.equal(6);
      expect(Object.values(estatisticas).reduce((total, item) => total + item.duelos_vencidos, 0)).to.equal(3);
    });

    cy.contains('Resultado salvo no ranking.').should('be.visible');
    cy.contains('button', 'Voltar para torneio').should('be.enabled');
  });
});

describe('Arena - chave com número ímpar', () => {
  const videosImpares = respostaIniciarPartida.videos.slice(0, 3);
  const respostaImpar = {
    ...respostaIniciarPartida,
    videos: videosImpares,
    partida: {
      ...respostaIniciarPartida.partida,
      fila_ids: videosImpares.map((video) => video.video_id),
      duelos_na_rodada: 1,
    },
  };

  it('leva o participante sem duelo para a rodada seguinte', () => {
    cy.intercept(
      { method: 'GET', pathname: `/torneios/${idTorneioArena}/jogar`, resourceType: /xhr|fetch/ },
      { statusCode: 200, body: respostaImpar },
    ).as('iniciarChaveImpar');

    cy.visit(`/arena?torneioId=${idTorneioArena}&tamanho=3`, {
      onBeforeLoad(window) {
        window.localStorage.clear();
        window.Math.random = () => 0;
      },
    });
    cy.wait('@iniciarChaveImpar');
    cy.get(seletorProgresso).should('contain.text', 'Duelo 1 de 1');

    escolherPrimeiroCard();

    cy.get(seletorProgresso).should('contain.text', 'Duelo 1 de 1');
    cy.window().should((window) => {
      const saved = window.localStorage.getItem(chaveArena('3'));
      if (!saved) throw new Error('Odd-sized bracket snapshot was not saved.');
      const snapshot = JSON.parse(saved);
      expect(snapshot.fila).to.have.length(2);
      expect(snapshot.vencedoresRodada).to.have.length(0);
      expect(Object.keys(snapshot.estatisticas)).to.have.length(3);
      expect(Object.values(snapshot.estatisticas)
        .filter((stats) => (stats as { duelos_jogados: number }).duelos_jogados === 0))
        .to.have.length(1);
    });
  });
});

describe('Arena - bracket sizing and qualifying byes', () => {
  const videos851 = Array.from({ length: 851 }, (_, index) => {
    const videoId = `V${index.toString().padStart(10, '0')}`;
    return {
      video_id: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      nome: `Track ${index + 1}`,
    };
  });

  const resposta851 = {
    ...respostaIniciarPartida,
    videos: videos851,
    partida: {
      ...respostaIniciarPartida.partida,
      fila_ids: videos851.map((video) => video.video_id),
      duelos_na_rodada: 426,
    },
  };

  beforeEach(() => {
    cy.intercept('GET', 'https://www.youtube.com/**', {
      statusCode: 200,
      headers: { 'content-type': 'text/html' },
      body: '<html></html>',
    });
  });

  it('uses 173 random byes and 339 qualifying duels for 851 songs in Max mode', () => {
    cy.intercept(
      { method: 'GET', pathname: `/torneios/${idTorneioArena}/jogar`, resourceType: /xhr|fetch/ },
      { statusCode: 200, body: resposta851 },
    ).as('iniciarMax');

    cy.visit(`/arena?torneioId=${idTorneioArena}&tamanho=max`, {
      onBeforeLoad(window) {
        window.localStorage.clear();
      },
    });
    cy.wait('@iniciarMax');

    cy.get(seletorProgresso).should('contain.text', 'Classificatória · Duelo 1 de 339');
    cy.window().should((window) => {
      const saved = window.localStorage.getItem(chaveArena('max'));
      if (!saved) throw new Error('Max bracket snapshot was not saved.');
      const snapshot = JSON.parse(saved);
      expect(snapshot.fila).to.have.length(678);
      expect(snapshot.vencedoresRodada).to.have.length(173);
      expect(Object.keys(snapshot.estatisticas)).to.have.length(851);

      const participantIds = [
        ...snapshot.fila.map((video: { video_id: string }) => video.video_id),
        ...snapshot.vencedoresRodada.map((video: { video_id: string }) => video.video_id),
      ];
      expect(new Set(participantIds).size).to.equal(851);
    });
  });

  it('randomly selects exactly 16 songs for a fixed-size bracket', () => {
    cy.intercept(
      { method: 'GET', pathname: `/torneios/${idTorneioArena}/jogar`, resourceType: /xhr|fetch/ },
      { statusCode: 200, body: resposta851 },
    ).as('iniciar16');

    cy.visit(`/arena?torneioId=${idTorneioArena}&tamanho=16`, {
      onBeforeLoad(window) {
        window.localStorage.clear();
      },
    });
    cy.wait('@iniciar16');

    cy.get(seletorProgresso).should('contain.text', 'Duelo 1 de 8');
    cy.window().should((window) => {
      const saved = window.localStorage.getItem(chaveArena('16'));
      if (!saved) throw new Error('16-song bracket snapshot was not saved.');
      const snapshot = JSON.parse(saved);
      expect(snapshot.fila).to.have.length(16);
      expect(snapshot.vencedoresRodada).to.have.length(0);
      expect(Object.keys(snapshot.estatisticas)).to.have.length(16);
    });
  });
});
