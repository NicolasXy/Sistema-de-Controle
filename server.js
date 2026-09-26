const express = require("express");

const app = express();

app.use(express.json());

const PORT = 3000;

let ordens = [];

/* ==========================================================================
   FUNÇÕES AUXILIARES / REGRAS DE NEGÓCIO
   Aqui colocamos as lógicas que se repetem ou que são regras importantes.
   Isso deixa o código mais limpo e fácil de testar.
   ========================================================================== */

// Calcula o custo com base no tipo do produto.
// Tipo 1: sem ajuste. Tipo 2: 10% mais caro. Tipo 3: 20% mais caro.
function calcularCustoUnitarioAjustado(tipoProduto, custoUnitarioBase) {
    switch (tipoProduto) {
        case 1:
            return custoUnitarioBase;
        case 2:
            return custoUnitarioBase * 1.10;
        case 3:
            return custoUnitarioBase * 1.20;
        default:
            return null; // Retorna null se o tipo for inválido (apesar de validarmos antes).
    }
}

// Uma soma simples para saber quanto de estoque teremos no final.
function calcularEstoqueFinal(estoqueInicial, quantidadeProduzida) {
    return estoqueInicial + quantidadeProduzida;
}

// Define o status do estoque com base na quantidade final.
// Mais de 5000 é "ALTO", menos de 500 é "CRÍTICO", o resto é "NORMAL".
function calcularAlertaEstoque(estoqueFinal) {
    if (estoqueFinal > 5000) {
        return "ALTO";
    } else if (estoqueFinal < 500) {
        return "CRITICO";
    } else {
        return "NORMAL";
    }
}

// Junta todas as funções acima para calcular os dados finais de uma ordem.
function calcularDadosOrdem(ordem) {
    const custoUnitarioAjustado = calcularCustoUnitarioAjustado(
        ordem.tipoProduto,
        ordem.custoUnitarioBase
    );

    const estoqueFinal = calcularEstoqueFinal(
        ordem.estoqueInicial,
        ordem.quantidadeProduzida
    );

    const alertaEstoque = calcularAlertaEstoque(estoqueFinal);

    // O custo total é a quantidade multiplicada pelo custo ajustado.
    const custoTotal = ordem.quantidadeProduzida * custoUnitarioAjustado;

    // Retorna a ordem original junto com os novos campos calculados.
    return {
        ...ordem,
        custoUnitarioAjustado,
        estoqueFinal,
        custoTotal,
        alertaEstoque
    };
}

/* ==========================================================================
   1. POST /ordens - Cadastrar nova ordem
   Esta rota recebe os dados de uma nova ordem de produção, valida tudo
   e salva na nossa lista 'ordens'.
   ========================================================================== */
app.post("/ordens", (req, res) => {
    const {
        codigoOrdem,
        codigoProduto,
        tipoProduto,
        quantidadeProduzida,
        custoUnitarioBase,
        estoqueInicial
    } = req.body;

    // Verificação 1: Checa se não esqueceram de mandar algum dado importante.
    if (
        codigoOrdem === undefined ||
        codigoProduto === undefined ||
        tipoProduto === undefined ||
        quantidadeProduzida === undefined ||
        custoUnitarioBase === undefined ||
        estoqueInicial === undefined
    ) {
        return res.status(400).json({
            erro: "Todos os campos são obrigatórios."
        });
    }

    // Verificação 2: Checa se o código da ordem já existe na nossa lista.
    const ordemExistente = ordens.find(
        ordem => String(ordem.codigoOrdem) === String(codigoOrdem)
    );

    if (ordemExistente) {
        return res.status(400).json({
            erro: "codigoOrdem já existe."
        });
    }

    // Verificação 3: Garante que o tipo do produto é válido (apenas 1, 2 ou 3).
    let tipoValido = false;
    for (let i = 1; i <= 3; i++) {
        if (tipoProduto === i) {
            tipoValido = true;
            break; // Se encontrou, para de procurar.
        }
    }

    if (!tipoValido) {
        return res.status(400).json({
            erro: "tipoProduto deve ser 1, 2 ou 3."
        });
    }

    // Se passou em todas as verificações, calcula os dados extras (custos, alertas).
    const novaOrdem = calcularDadosOrdem({
        codigoOrdem,
        codigoProduto,
        tipoProduto,
        quantidadeProduzida,
        custoUnitarioBase,
        estoqueInicial
    });

    // Salva a nova ordem na nossa lista 'ordens'.
    ordens.push(novaOrdem);

    // Retorna status 201 (Created) e os dados da ordem salva.
    return res.status(201).json(novaOrdem);
});

/* ==========================================================================
   2. GET /ordens - Listar todas (com suporte a filtros por tipo e alerta)
   Retorna a lista de ordens. Permite filtrar os resultados usando query params.
   Exemplo: /ordens?tipo=2&alerta=NORMAL
   ========================================================================== */
app.get("/ordens", (req, res) => {
    let resultado = [...ordens]; // Cria uma cópia da lista para não alterar a original.
    const { tipo, alerta } = req.query;

    // Filtra pelo tipo do produto, se o usuário tiver pedido.
    if (tipo) {
        resultado = resultado.filter(
            ordem => ordem.tipoProduto === Number(tipo)
        );
    }

    // Filtra pelo alerta de estoque, se o usuário tiver pedido (ignorando maiúsculas/minúsculas).
    if (alerta) {
        resultado = resultado.filter(
            ordem => ordem.alertaEstoque.toUpperCase() === alerta.toUpperCase()
        );
    }

    // Retorna a lista final (filtrada ou não).
    return res.json(resultado);
});

/* ==========================================================================
   3. GET /ordens/:codigoOrdem - Buscar ordem específica por código
   Procura e retorna uma única ordem usando o código passado na URL.
   ========================================================================== */
app.get("/ordens/:codigoOrdem", (req, res) => {
    const { codigoOrdem } = req.params;

    // Busca a ordem na lista. Transformamos para String para evitar erros de tipo.
    const ordem = ordens.find(
        o => String(o.codigoOrdem) === String(codigoOrdem)
    );

    // Se não encontrou, retorna erro 404 (Not Found).
    if (!ordem) {
        return res.status(404).json({
            erro: "Ordem de produção não encontrada."
        });
    }

    // Se encontrou, retorna os dados da ordem.
    return res.json(ordem);
});

/* ==========================================================================
   4. PUT /ordens/:codigoOrdem - Atualizar ordem existente e recalcular
   Atualiza os dados de uma ordem. Você não precisa enviar todos os dados,
   apenas o que quiser alterar.
   ========================================================================== */
app.put("/ordens/:codigoOrdem", (req, res) => {
    const { codigoOrdem } = req.params;

    // Acha a posição (índice) da ordem na nossa lista.
    const index = ordens.findIndex(
        o => String(o.codigoOrdem) === String(codigoOrdem)
    );

    // Se não achou, retorna erro.
    if (index === -1) {
        return res.status(404).json({
            erro: "Ordem de produção não encontrada."
        });
    }

    const {
        codigoProduto,
        tipoProduto,
        quantidadeProduzida,
        custoUnitarioBase,
        estoqueInicial
    } = req.body;

    // Validação extra: se tentaram mudar o tipoProduto, garante que o novo tipo é válido.
    if (tipoProduto !== undefined) {
        let tipoValido = false;
        for (let i = 1; i <= 3; i++) {
            if (tipoProduto === i) {
                tipoValido = true;
                break;
            }
        }
        if (!tipoValido) {
            return res.status(400).json({
                erro: "tipoProduto deve ser 1, 2 ou 3."
            });
        }
    }

    const ordemAntiga = ordens[index];

    // Cria um novo objeto mesclando os dados novos (se existirem) com os antigos.
    const dadosAtualizados = {
        codigoOrdem: ordemAntiga.codigoOrdem,
        codigoProduto: codigoProduto !== undefined ? codigoProduto : ordemAntiga.codigoProduto,
        tipoProduto: tipoProduto !== undefined ? tipoProduto : ordemAntiga.tipoProduto,
        quantidadeProduzida: quantidadeProduzida !== undefined ? quantidadeProduzida : ordemAntiga.quantidadeProduzida,
        custoUnitarioBase: custoUnitarioBase !== undefined ? custoUnitarioBase : ordemAntiga.custoUnitarioBase,
        estoqueInicial: estoqueInicial !== undefined ? estoqueInicial : ordemAntiga.estoqueInicial
    };

    // Recalcula os campos (custo, alerta) com base nos novos dados.
    const ordemRecalculada = calcularDadosOrdem(dadosAtualizados);
    
    // Atualiza a lista com a ordem recalculada.
    ordens[index] = ordemRecalculada;

    // Retorna a ordem atualizada.
    return res.json(ordemRecalculada);
});

/* ==========================================================================
   5. DELETE /ordens/:codigoOrdem - Remover uma ordem
   Deleta uma ordem da nossa lista.
   ========================================================================== */
app.delete("/ordens/:codigoOrdem", (req, res) => {
    const { codigoOrdem } = req.params;

    // Acha a posição da ordem na lista.
    const index = ordens.findIndex(
        o => String(o.codigoOrdem) === String(codigoOrdem)
    );

    // Se não achou, retorna erro.
    if (index === -1) {
        return res.status(404).json({
            erro: "Ordem de produção não encontrada."
        });
    }

    // Remove 1 item a partir daquela posição.
    ordens.splice(index, 1);

    // Retorna uma mensagem de sucesso.
    return res.json({
        mensagem: `Ordem de produção '${codigoOrdem}' removida com sucesso.`
    });
});

/* ==========================================================================
   6. GET /relatorios/ordens - Relatório consolidado
   Gera um relatório com totais, médias e dados agrupados.
   ========================================================================== */
app.get("/relatorios/ordens", (req, res) => {
    const totalOrdens = ordens.length;

    // Se não tiver nenhuma ordem, retorna o relatório zerado.
    if (totalOrdens === 0) {
        return res.json({
            totalOrdens: 0,
            estoquePorTipo: { padrao: 0, premium: 0, sobEncomenda: 0 },
            mediaCustoTotalPorOrdem: 0,
            ordemMaisCara: null,
            ordemMaisBarata: null,
            quantidadeAlertas: { alto: 0, critico: 0, normal: 0 },
            porProduto: {}
        });
    }

    // Variáveis para guardar os totais enquanto passamos pela lista.
    let estoquePadrao = 0;
    let estoquePremium = 0;
    let estoqueSobEncomenda = 0;
    let somaCustoTotal = 0;
    
    // Começamos assumindo que a primeira ordem é a mais cara e a mais barata.
    let ordemMaisCara = ordens[0];
    let ordemMaisBarata = ordens[0];
    
    let alertasAlto = 0;
    let alertasCritico = 0;
    let alertasNormal = 0;
    
    // Objeto para guardar os dados consolidados por código de produto.
    const porProduto = {};

    // Passa por todas as ordens (loop) para somar e agrupar os dados.
    for (const ordem of ordens) {
        
        // 1. Soma o estoque de acordo com o tipo (1=Padrão, 2=Premium, 3=Sob Encomenda).
        if (ordem.tipoProduto === 1) estoquePadrao += ordem.estoqueFinal;
        else if (ordem.tipoProduto === 2) estoquePremium += ordem.estoqueFinal;
        else if (ordem.tipoProduto === 3) estoqueSobEncomenda += ordem.estoqueFinal;

        // 2. Vai somando o custo total para calcularmos a média depois.
        somaCustoTotal += ordem.custoTotal;

        // 3. Verifica se a ordem atual é mais cara que a nossa 'mais cara' até agora.
        if (ordem.custoTotal > ordemMaisCara.custoTotal) {
            ordemMaisCara = ordem;
        }
        // Faz o mesmo para descobrir a mais barata.
        if (ordem.custoTotal < ordemMaisBarata.custoTotal) {
            ordemMaisBarata = ordem;
        }

        // 4. Conta os tipos de alertas.
        if (ordem.alertaEstoque === "ALTO") alertasAlto++;
        else if (ordem.alertaEstoque === "CRITICO") alertasCritico++;
        else if (ordem.alertaEstoque === "NORMAL") alertasNormal++;

        // 5. Agrupa dados (estoque e investimento) por código do produto.
        const codProd = ordem.codigoProduto;
        
        // Se ainda não salvamos nada desse produto, cria a estrutura pra ele.
        if (!porProduto[codProd]) {
            porProduto[codProd] = {
                estoqueFinalConsolidado: 0,
                valorTotalInvestido: 0
            };
        }
        
        // Soma os valores da ordem atual aos totais desse produto.
        porProduto[codProd].estoqueFinalConsolidado += ordem.estoqueFinal;
        porProduto[codProd].valorTotalInvestido += ordem.custoTotal;
    }

    // Calcula a média dividindo a soma de tudo pela quantidade de ordens.
    const mediaCustoTotalPorOrdem = somaCustoTotal / totalOrdens;

    // Retorna o relatório completão montado.
    return res.json({
        totalOrdens,
        estoquePorTipo: {
            padrao: estoquePadrao,
            premium: estoquePremium,
            sobEncomenda: estoqueSobEncomenda
        },
        mediaCustoTotalPorOrdem,
        ordemMaisCara: {
            codigoOrdem: ordemMaisCara.codigoOrdem,
            custoTotal: ordemMaisCara.custoTotal
        },
        ordemMaisBarata: {
            codigoOrdem: ordemMaisBarata.codigoOrdem,
            custoTotal: ordemMaisBarata.custoTotal
        },
        quantidadeAlertas: {
            alto: alertasAlto,
            critico: alertasCritico,
            normal: alertasNormal
        },
        porProduto
    });
});

/* ==========================================================================
   INICIALIZAÇÃO DO SERVIDOR
   Liga o servidor e deixa ele escutando na porta definida.
   ========================================================================== */
app.listen(PORT, () => {
    console.log(`API rodando em http://localhost:${PORT}`);
});