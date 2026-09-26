# API de Gestão de Ordens de Produção

Uma API RESTful simples e direta, construída com Node.js e Express, para gerir ordens de produção de uma fábrica. O sistema permite registar, listar, atualizar e eliminar ordens, gerando relatórios automáticos sobre o stock e os custos.

## Tecnologias Utilizadas

- **Node.js**
- **Express.js** (Framework web)

## Regras de Negócio (Cálculos Automáticos)

Ao registar ou atualizar uma ordem, a API faz os seguintes cálculos automaticamente:
- **Custo Unitário Ajustado:** Depende do Tipo do Produto.
  - Tipo 1: Preço normal.
  - Tipo 2: Acréscimo de 10%.
  - Tipo 3: Acréscimo de 20%.
- **Stock Final:** Soma do Stock Inicial + Quantidade Produzida.
- **Custo Total:** Quantidade Produzida × Custo Unitário Ajustado.
- **Alerta de Stock:**
  - ALTO: Mais de 5.000 unidades.
  - CRITICO: Menos de 500 unidades.
  - NORMAL: Entre 500 e 5.000 unidades.

---

## Como executar o projeto localmente

1. **Pré-requisitos:** Certifique-se de que tem o [Node.js](https://nodejs.org/) instalado no seu computador.
2. Abra o terminal na pasta do projeto (onde está o ficheiro package.json).
3. Instale as dependências executando:
   bash
   npm install

   Inicie o servidor executando o ficheiro principal:
   node server.js

   A API estará em execução no endereço: http://localhost:3000

Rotas da API (Endpoints)
1. Registar Ordem

    Rota: POST /ordens
    Descrição: Cria uma nova ordem de produção.
    Corpo do pedido (JSON):

    {
    "codigoOrdem": "ORD-001",
    "codigoProduto": "PROD-A",
    "tipoProduto": 2,
    "quantidadeProduzida": 1000,
    "custoUnitarioBase": 50.0,
    "estoqueInicial": 200
}

2. Listar Ordens

    Rota: GET /ordens
    Descrição: Retorna todas as ordens registadas.
    Filtros Opcionais (Query Params):

   Filtrar por tipo: GET /ordens?tipo=2

   Filtrar por alerta: GET /ordens?alerta=CRITICO

3. Procurar Ordem Específica

    Rota: GET /ordens/:codigoOrdem
    Descrição: Retorna os dados de uma ordem específica utilizando o seu código.
    Exemplo: GET /ordens/ORD-001

4. Atualizar Ordem

    Rota: PUT /ordens/:codigoOrdem
    Descrição: Atualiza os dados de uma ordem. Pode enviar apenas os campos que deseja alterar, e os valores (custos, alertas) serão recalculados automaticamente.
    Corpo do pedido (JSON):

    {
    "quantidadeProduzida": 1500
}

5. Eliminar Ordem

    Rota: DELETE /ordens/:codigoOrdem
    Descrição: Remove uma ordem do sistema.

6. Relatório Consolidado

    Rota: GET /relatorios/ordens
    Descrição: Retorna um painel completo com o resumo da fábrica.
    O que retorna:

   Total de ordens registadas.

   Soma do stock final separado por tipo de produto.
   Média do custo total de todas as ordens.
   Os dados da ordem mais cara e da ordem mais barata.
   Contagem de estados de alerta (quantos críticos, altos e normais).
   Informações consolidadas agrupadas pelo Código do Produto.

Observações

  Atualmente, os dados são guardados na memória (num Array). Se o servidor for reiniciado, os dados inseridos serão perdidos. Para utilização em produção, recomenda-se integrar uma base de dados (ex: MongoDB, PostgreSQL, etc).
