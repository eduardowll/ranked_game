import {
  idTorneioRanking,
  paginaDeRanking,
  paginaDois,
  paginaUm,
  torneioRanking,
} from '../support/mocks';

const cartaoRanking = '.ranking-card';
const caminhoDetalhes = `/torneios/${idTorneioRanking}`;

describe('Torneios e ranking', () => {
  it('lista torneios e abre os detalhes do selecionado', () => {
    cy.intercept(
      { method: 'GET', pathname: '/torneios', resourceType: /xhr|fetch/ },
      [torneioRanking],
    ).as('listarTorneios');

    cy.intercept(
      { method: 'GET', pathname: caminhoDetalhes, resourceType: /xhr|fetch/ },
      paginaDeRanking(paginaUm, 1),
    ).as('detalhesTorneio');

    cy.visit('/torneios');
    cy.wait('@listarTorneios');

    cy.contains('Torneio de teste').click();
    cy.location('pathname').should('eq', caminhoDetalhes);
    cy.wait('@detalhesTorneio');

    cy.contains('Faixa 1').should('be.visible');
    cy.contains('Página 1 de 2').should('be.visible');
    cy.get(cartaoRanking).should('have.length', 20);
  });

  it('busca a próxima página com 20 itens', () => {
    cy.intercept(
      { method: 'GET', pathname: caminhoDetalhes, query: { page: '1', page_size: '20' } },
      paginaDeRanking(paginaUm, 1),
    ).as('paginaUm');

    cy.intercept(
      { method: 'GET', pathname: caminhoDetalhes, query: { page: '2', page_size: '20' } },
      paginaDeRanking(paginaDois, 2),
    ).as('paginaDois');

    cy.visit(caminhoDetalhes);
    cy.wait('@paginaUm');
    cy.get(cartaoRanking).should('have.length', 20);

    cy.contains('Próxima').click();
    cy.wait('@paginaDois');

    cy.get(cartaoRanking)
      .should('have.length', 1)
      .and('contain.text', 'Faixa 21')
      .and('contain.text', '#21');
    cy.contains('Página 2 de 2').should('be.visible');
  });

  it('mostra a porcentagem de vitória de cada item', () => {
    cy.intercept(
      {
        method: 'GET',
        pathname: caminhoDetalhes,
        query: { page: '1', page_size: '20' },
        resourceType: /xhr|fetch/,
      },
      paginaDeRanking(paginaUm, 1),
    ).as('paginaInicial');

    cy.visit(caminhoDetalhes);
    cy.wait('@paginaInicial');
    cy.get(cartaoRanking).first().should('contain.text', '0%');
  });

  it('trata erro 500 da API sem quebrar a página', () => {
    cy.intercept(
      { method: 'GET', pathname: '/torneios', resourceType: /xhr|fetch/ },
      { statusCode: 500, body: { detail: 'Erro interno' } },
    ).as('listarComErro');

    cy.visit('/torneios');
    cy.wait('@listarComErro');

    cy.get('body').should('be.visible');
    cy.get(cartaoRanking).should('not.exist');
  });
});