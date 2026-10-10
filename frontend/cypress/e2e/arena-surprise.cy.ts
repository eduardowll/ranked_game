import { idTorneioArena, respostaIniciarPartida } from '../support/mocks';

const caminhoArena = `/arena?torneioId=${idTorneioArena}&tamanho=4`;
const seletorToggle = '.surprise-round-toggle';
const seletorCobertura = '.video-card__cover';
const seletorEscolha = '.video-card__choose';
const seletorProgresso = '.round-progress';

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

    cy.visit(caminhoArena, {
      onBeforeLoad(window) {
        window.localStorage.clear();
      },
    });

    cy.wait('@iniciarPartida');
    cy.get(seletorProgresso).should('contain.text', 'Duelo 1 de 2');
    cy.get(seletorEscolha).should('have.length', 2);
  });

  it('mantém o duelo normal quando a opção não é ativada', () => {
    cy.get(seletorEscolha).first().click();

    cy.get(seletorProgresso).should('contain.text', 'Duelo 2 de 2');
    cy.get(seletorCobertura).should('not.exist');
    cy.get(seletorEscolha).each(($botao) => {
      cy.wrap($botao).should('not.be.disabled');
    });
  });

  it('esconde o duelo seguinte quando o toggle é ativado', () => {
    cy.get(seletorToggle).should('not.have.class', 'is-active').click();
    cy.get(seletorToggle).should('have.class', 'is-active');

    cy.get(seletorCobertura).should('not.exist');
    cy.get(seletorEscolha).first().click();

    cy.get(seletorToggle).should('not.have.class', 'is-active');
    cy.get(seletorProgresso).should('contain.text', 'Duelo 2 de 2');
    cy.get(seletorCobertura).should('have.length', 2);
    cy.get(seletorEscolha).each(($botao) => {
      cy.wrap($botao).should('be.disabled');
    });
  });

  it('libera a votação depois de revelar os dois vídeos', () => {
    cy.get(seletorToggle).click();
    cy.get(seletorEscolha).first().click();
    cy.get(seletorCobertura).should('have.length', 2);

    cy.get(seletorCobertura).first().click();
    cy.get(seletorCobertura).should('have.length', 1);
    cy.get(seletorEscolha).each(($botao) => {
      cy.wrap($botao).should('be.disabled');
    });

    cy.get(seletorCobertura).click();
    cy.get(seletorCobertura).should('not.exist');
    cy.get(seletorEscolha).each(($botao) => {
      cy.wrap($botao).should('not.be.disabled');
    });
  });

  it('persiste no localStorage o estado da rodada surpresa', () => {
    cy.get(seletorToggle).click();
    cy.get(seletorEscolha).first().click();

    cy.window().then((window) => {
      const salvo = window.localStorage.getItem(`this-that:arena:${idTorneioArena}`);
      if (salvo === null) throw new Error('Snapshot da Arena não foi salvo no localStorage.');
      const snapshot = JSON.parse(salvo ?? '{}');
      expect(snapshot.dueloSurpresaAtivo).to.equal(true);
      expect(snapshot.esconderProximoDuelo).to.equal(false);
    });
  });

  it('retoma o mesmo duelo após recarregar sem iniciar outra partida', () => {
    cy.get(seletorEscolha).first().click();
    cy.get(seletorProgresso).should('contain.text', 'Duelo 2 de 2');

    cy.window().should((window) => {
      const salvo = window.localStorage.getItem(`this-that:arena:${idTorneioArena}`);
      if (salvo === null) throw new Error('Snapshot da Arena não foi salvo no localStorage.');
      const snapshot = JSON.parse(salvo);
      expect(snapshot.fila.map((video: { video_id: string }) => video.video_id))
        .to.deep.equal(['CCCCCCCCCCC', 'DDDDDDDDDDD']);
      expect(snapshot.vencedoresRodada.map((video: { video_id: string }) => video.video_id))
        .to.deep.equal(['AAAAAAAAAAA']);
    });

    cy.get('@iniciarPartida.all').then((chamadasAntesDoReload) => {
      cy.reload();
      cy.get(seletorProgresso).should('contain.text', 'Duelo 2 de 2');
      cy.get('.duel-board').should('contain.text', 'Vídeo C').and('contain.text', 'Vídeo D');
      cy.get('@iniciarPartida.all').should('have.length', chamadasAntesDoReload.length);
    });
  });

  it('desfaz o último duelo e restaura fila e estatísticas', () => {
    cy.get(seletorEscolha).first().click();
    cy.get(seletorProgresso).should('contain.text', 'Duelo 2 de 2');
    cy.get('.undo-duel-button').should('not.be.disabled').click();

    cy.get(seletorProgresso).should('contain.text', 'Duelo 1 de 2');
    cy.window().should((window) => {
      const salvo = window.localStorage.getItem(`this-that:arena:${idTorneioArena}`);
      expect(salvo).to.not.equal(null);
      const snapshot = JSON.parse(salvo ?? '{}');
      expect(snapshot.fila.map((video: { video_id: string }) => video.video_id))
        .to.deep.equal(respostaIniciarPartida.videos.map((video) => video.video_id));
      expect(snapshot.estatisticas.AAAAAAAAAAA).to.deep.equal({ duelos_jogados: 0, duelos_vencidos: 0 });
      expect(snapshot.estatisticas.BBBBBBBBBBB).to.deep.equal({ duelos_jogados: 0, duelos_vencidos: 0 });
    });
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
      },
    });
    cy.wait('@iniciarChaveImpar');
    cy.get(seletorProgresso).should('contain.text', 'Duelo 1 de 1');

    cy.get(seletorEscolha).first().click();

    cy.get(seletorProgresso).should('contain.text', 'Duelo 1 de 1');
    cy.get('.duel-board').should('contain.text', 'Vídeo A').and('contain.text', 'Vídeo C');
  });
});
