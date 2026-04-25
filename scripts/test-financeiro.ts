/**
 * Suite de integração do backend financeiro.
 *
 * Cria um escopo isolado (usuário [TESTE], categoria, produtos) e roda
 * cenários ponta-a-ponta validando totais, estoque, perdas e fechamento.
 * Sempre limpa os registros criados (try/finally) usando IDs explícitos —
 * nunca DELETE por padrão de nome — para zero risco a dados reais.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/test-financeiro.ts
 *
 * Saída: 0 se tudo passou, 1 caso contrário.
 */

import { db } from "@/db";
import {
  caixaSessoes,
  categorias,
  comandas,
  comprovantesVenda,
  itensComanda,
  itensLivres,
  movimentacoesEstoque,
  perdasEstoque,
  produtos,
  usuarios,
} from "@/db/schema";
import {
  calcSubtotal,
  calcValorPerda,
  getCustoEfetivo,
  toMoney,
  toQty,
} from "@/lib/calculations";
import { finalizarComandaCore } from "@/lib/modules/comandas/finalizar-core";
import { and, eq, inArray } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Infra de testes
// ---------------------------------------------------------------------------

let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    const msg = `  ✗ ${name}${detail ? `\n      ${detail}` : ""}`;
    failures.push(msg);
    console.log(msg);
  }
}

function near(name: string, got: number, exp: number, tol = 0.01) {
  ok(name, Math.abs(got - exp) <= tol, `esperado ~${exp} (tol ${tol}), recebido ${got}`);
}

function group(name: string) {
  console.log(`\n[${name}]`);
}

// ---------------------------------------------------------------------------
// Escopo isolado: tudo que criarmos vai pra cá pra ser deletado no final
// ---------------------------------------------------------------------------

const created = {
  usuarioId: 0,
  categoriaId: 0,
  produtoIds: [] as number[],
  caixaSessaoIds: [] as number[],
  comandaIds: [] as number[],
};

const STAMP = Date.now();
const TEST_EMAIL = `teste-financeiro-${STAMP}@reidospaes.local`;
const PREFIXO = `[TESTE-${STAMP}]`;

// ---------------------------------------------------------------------------
// Replica funções privadas das actions (que não podemos chamar sem contexto Next)
// ---------------------------------------------------------------------------

async function recalcularTotalComanda(comandaId: number): Promise<number> {
  const [itens, livres] = await Promise.all([
    db.query.itensComanda.findMany({ where: eq(itensComanda.comandaId, comandaId) }),
    db.query.itensLivres.findMany({ where: eq(itensLivres.comandaId, comandaId) }),
  ]);
  const subtotal = [
    ...itens.map((i) => Number(i.subtotal)),
    ...livres.map((i) => Number(i.subtotal)),
  ].reduce((acc, n) => acc + n, 0);
  await db
    .update(comandas)
    .set({ valorTotal: toMoney(subtotal) })
    .where(eq(comandas.id, comandaId));
  return subtotal;
}

async function registrarEntradaInline(
  produtoId: number,
  qtd: number,
  userId: number,
  observacao?: string,
) {
  const p = await db.query.produtos.findFirst({ where: eq(produtos.id, produtoId) });
  if (!p) throw new Error(`Produto ${produtoId} não encontrado`);
  const ant = Number(p.estoqueAtual);
  const post = ant + qtd;
  await db.insert(movimentacoesEstoque).values({
    produtoId,
    tipo: "entrada",
    quantidade: toQty(qtd),
    quantidadeAnterior: toQty(ant),
    quantidadePosterior: toQty(post),
    observacao: observacao ?? null,
    usuarioId: userId,
  });
  await db
    .update(produtos)
    .set({ estoqueAtual: toQty(post), updatedAt: new Date() })
    .where(eq(produtos.id, produtoId));
  return post;
}

async function registrarPerdaInline(
  produtoId: number,
  qtd: number,
  motivo: string,
  userId: number,
) {
  const p = await db.query.produtos.findFirst({ where: eq(produtos.id, produtoId) });
  if (!p) throw new Error(`Produto ${produtoId} não encontrado`);
  const ant = Number(p.estoqueAtual);
  const post = Math.max(0, ant - qtd);
  const baixadoReal = ant - post;
  const valor = calcValorPerda(qtd, getCustoEfetivo(p));

  await db.insert(perdasEstoque).values({
    produtoId,
    quantidade: toQty(qtd),
    valor,
    motivo,
    usuarioId: userId,
  });
  await db.insert(movimentacoesEstoque).values({
    produtoId,
    tipo: "ajuste",
    quantidade: toQty(-baixadoReal),
    quantidadeAnterior: toQty(ant),
    quantidadePosterior: toQty(post),
    observacao: `Perda: ${motivo}`,
    usuarioId: userId,
  });
  await db
    .update(produtos)
    .set({ estoqueAtual: toQty(post), updatedAt: new Date() })
    .where(eq(produtos.id, produtoId));

  return { post, valor };
}

async function registrarInventarioInline(
  itens: { produtoId: number; quantidadeContada: number }[],
  userId: number,
) {
  let totalPerdas = 0;
  let totalAjustados = 0;
  for (const item of itens) {
    const p = await db.query.produtos.findFirst({
      where: eq(produtos.id, item.produtoId),
    });
    if (!p) continue;
    const teorico = Number(p.estoqueAtual);
    const dif = item.quantidadeContada - teorico;
    if (dif === 0) continue;
    totalAjustados++;

    await db.insert(movimentacoesEstoque).values({
      produtoId: p.id,
      tipo: "ajuste",
      quantidade: toQty(dif),
      quantidadeAnterior: toQty(teorico),
      quantidadePosterior: toQty(item.quantidadeContada),
      observacao: `Inventário (${dif >= 0 ? "+" : ""}${toQty(dif)})`,
      usuarioId: userId,
    });

    if (dif < 0) {
      const qtdPerda = Math.abs(dif);
      await db.insert(perdasEstoque).values({
        produtoId: p.id,
        quantidade: toQty(qtdPerda),
        valor: calcValorPerda(qtdPerda, getCustoEfetivo(p)),
        motivo: "Inventário físico - ajuste",
        usuarioId: userId,
      });
      totalPerdas++;
    }

    await db
      .update(produtos)
      .set({
        estoqueAtual: toQty(Math.max(0, item.quantidadeContada)),
        updatedAt: new Date(),
      })
      .where(eq(produtos.id, p.id));
  }
  return { totalAjustados, totalPerdas };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

async function setup() {
  group("Setup: criando escopo de teste isolado");

  // Usuário admin de teste
  const [u] = await db
    .insert(usuarios)
    .values({
      nome: `${PREFIXO} admin`,
      email: TEST_EMAIL,
      senhaHash: "x",
      perfil: "admin",
      ativo: true,
    })
    .returning({ id: usuarios.id });
  created.usuarioId = u.id;
  ok("usuário [TESTE] criado", u.id > 0, `id=${u.id}`);

  // Categoria
  const [cat] = await db
    .insert(categorias)
    .values({
      nome: `${PREFIXO} Cat`,
      slug: `teste-${STAMP}`,
      ordem: 9999,
      ativo: true,
    })
    .returning({ id: categorias.id });
  created.categoriaId = cat.id;
  ok("categoria [TESTE] criada", cat.id > 0, `id=${cat.id}`);

  // 4 produtos: 3 com custo cadastrado + 1 sem custo (testa fallback p/ preço)
  const seed = [
    // Pão: preço R$5, custo R$2 → margem 60%
    { nome: `${PREFIXO} Pão`, preco: "5.00", custo: "2.00", estoque: "100.000", unidade: "un" as const },
    // Bolo: preço R$32/kg, custo R$12/kg
    { nome: `${PREFIXO} Bolo (kg)`, preco: "32.00", custo: "12.00", estoque: "10.000", unidade: "kg" as const },
    // Café: preço R$6.50, custo R$1.80
    { nome: `${PREFIXO} Café`, preco: "6.50", custo: "1.80", estoque: "50.000", unidade: "un" as const },
    // Produto SEM custo: deve usar preço como fallback (compat com produtos legados)
    { nome: `${PREFIXO} Coxinha`, preco: "8.00", custo: "0.00", estoque: "30.000", unidade: "un" as const },
  ];
  for (let i = 0; i < seed.length; i++) {
    const s = seed[i];
    const [p] = await db
      .insert(produtos)
      .values({
        nome: s.nome,
        slug: `${s.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${STAMP}-${i}`,
        categoriaId: cat.id,
        preco: s.preco,
        custoUnitario: s.custo,
        estoqueAtual: s.estoque,
        estoqueMinimo: "5.000",
        estoqueMaximo: "200.000",
        unidadeMedida: s.unidade,
        ativo: true,
        disponivelHoje: true,
      })
      .returning({ id: produtos.id });
    created.produtoIds.push(p.id);
  }
  ok("4 produtos [TESTE] criados (3 com custo + 1 sem)", created.produtoIds.length === 4);
}

// ---------------------------------------------------------------------------
// Cenários
// ---------------------------------------------------------------------------

async function cenarioCaixaEComandaPercentual() {
  group("Cenário 1: abertura de caixa + comanda + gorjeta percentual + estoque");
  const [pPao, pBolo, pCafe] = created.produtoIds;

  // 1. Abre caixa com R$ 200
  const [sessao] = await db
    .insert(caixaSessoes)
    .values({
      usuarioAberturaId: created.usuarioId,
      valorAbertura: "200.00",
      status: "aberta",
      observacoes: `${PREFIXO} sessão 1`,
    })
    .returning({ id: caixaSessoes.id });
  created.caixaSessaoIds.push(sessao.id);
  ok("sessão de caixa aberta", sessao.id > 0);

  // 2. Cria comanda número alto pra não colidir
  const numero = 900000 + Math.floor(Math.random() * 99999);
  const [c] = await db
    .insert(comandas)
    .values({
      numero,
      status: "aberta",
      valorTotal: "0",
      taxaGorjeta: "0",
      caixaSessaoId: sessao.id,
      usuarioAberturaId: created.usuarioId,
      observacoes: `${PREFIXO}`,
    })
    .returning({ id: comandas.id });
  created.comandaIds.push(c.id);
  ok("comanda criada aberta", c.id > 0);

  // 3. Adiciona itens: 5 pães + 0.500 kg bolo + 2 cafés
  const itensAdicionar = [
    { pid: pPao, qtd: 5, preco: 5.0 },
    { pid: pBolo, qtd: 0.5, preco: 32.0 },
    { pid: pCafe, qtd: 2, preco: 6.5 },
  ];
  for (const it of itensAdicionar) {
    await db.insert(itensComanda).values({
      comandaId: c.id,
      produtoId: it.pid,
      quantidade: toQty(it.qtd),
      precoUnitario: toMoney(it.preco),
      subtotal: calcSubtotal(it.qtd, it.preco),
    });
  }

  // 4. Adiciona item livre R$ 12.50
  await db.insert(itensLivres).values({
    comandaId: c.id,
    descricao: `${PREFIXO} item livre`,
    quantidade: toQty(1),
    precoUnitario: toMoney(12.5),
    subtotal: calcSubtotal(1, 12.5),
  });

  // 5. Recalcula
  const subtotal = await recalcularTotalComanda(c.id);
  // 25 (pão) + 16 (bolo) + 13 (café) + 12.50 (livre) = 66.50
  near("subtotal calculado da comanda", subtotal, 66.5, 0.01);

  // 6. Snapshot do estoque ANTES de finalizar
  const antes = await db.query.produtos.findMany({
    where: inArray(produtos.id, [pPao, pBolo, pCafe]),
  });
  const estoqueAntes = new Map(antes.map((p) => [p.id, Number(p.estoqueAtual)]));

  // 7. Finaliza com gorjeta percentual 10%
  const fin = await finalizarComandaCore({
    comandaId: c.id,
    userId: created.usuarioId,
    formaPagamento: "dinheiro",
    taxaGorjetaInput: "10",
    gorjetaConfig: { tipo: "percentual", taxa: "10.00" },
  });
  ok("finalização ok", fin.success, fin.success ? "" : (fin as { error: string }).error);

  // 8. Verifica totais persistidos
  const cFinal = await db.query.comandas.findFirst({ where: eq(comandas.id, c.id) });
  ok("status finalizada", cFinal?.status === "finalizada");
  near("gorjeta gravada (10% de 66.50)", Number(cFinal?.taxaGorjeta), 6.65, 0.01);
  near("valorTotal final = subtotal + gorjeta", Number(cFinal?.valorTotal), 73.15, 0.01);
  ok("forma pagamento = dinheiro", cFinal?.formaPagamento === "dinheiro");
  ok("data fechamento preenchida", cFinal?.dataFechamento != null);

  // 9. Estoque foi decrementado corretamente
  const depois = await db.query.produtos.findMany({
    where: inArray(produtos.id, [pPao, pBolo, pCafe]),
  });
  for (const p of depois) {
    const ant = estoqueAntes.get(p.id)!;
    const novo = Number(p.estoqueAtual);
    const baixaEsperada = itensAdicionar.find((i) => i.pid === p.id)!.qtd;
    near(
      `estoque produto ${p.id}: ${ant} - ${baixaEsperada} = ${ant - baixaEsperada}`,
      novo,
      ant - baixaEsperada,
      0.001,
    );
  }

  // 10. Movimentações de saída foram criadas para os 3 itens
  const movs = await db.query.movimentacoesEstoque.findMany({
    where: eq(movimentacoesEstoque.comandaId, c.id),
  });
  ok("3 movimentações de saída criadas", movs.length === 3, `recebido ${movs.length}`);
  ok("todas marcadas como saida", movs.every((m) => m.tipo === "saida"));

  // 11. Comprovante gerado
  const comp = await db.query.comprovantesVenda.findMany({
    where: eq(comprovantesVenda.comandaId, c.id),
  });
  ok("comprovante de venda gerado", comp.length === 1);
  const conteudo = comp[0]?.conteudo ?? "";
  ok("comprovante contém TOTAL", conteudo.includes("TOTAL:"));
  ok("comprovante contém forma pgto", conteudo.toLowerCase().includes("dinheiro"));

  // Mantém a sessão aberta pros próximos cenários
  return sessao.id;
}

async function cenarioGorjetaFixaEItemLivre(sessaoId: number) {
  group("Cenário 2: comanda só com item livre + gorjeta fixa");
  const numero = 910000 + Math.floor(Math.random() * 99999);
  const [c] = await db
    .insert(comandas)
    .values({
      numero,
      status: "aberta",
      valorTotal: "0",
      taxaGorjeta: "0",
      caixaSessaoId: sessaoId,
      usuarioAberturaId: created.usuarioId,
    })
    .returning({ id: comandas.id });
  created.comandaIds.push(c.id);

  await db.insert(itensLivres).values({
    comandaId: c.id,
    descricao: `${PREFIXO} taxa servico`,
    quantidade: toQty(1),
    precoUnitario: toMoney(50),
    subtotal: calcSubtotal(1, 50),
  });
  await recalcularTotalComanda(c.id);

  const fin = await finalizarComandaCore({
    comandaId: c.id,
    userId: created.usuarioId,
    formaPagamento: "pix",
    taxaGorjetaInput: "0",
    gorjetaConfig: { tipo: "fixa", taxa: "5.00" },
  });
  ok("finaliza com gorjeta fixa", fin.success);

  const cf = await db.query.comandas.findFirst({ where: eq(comandas.id, c.id) });
  near("gorjeta fixa = R$ 5.00", Number(cf?.taxaGorjeta), 5.0);
  near("total = 50 + 5", Number(cf?.valorTotal), 55.0);
  ok("forma pgto pix", cf?.formaPagamento === "pix");

  // Sem itens de produto = nenhuma movimentação de estoque
  const movs = await db.query.movimentacoesEstoque.findMany({
    where: eq(movimentacoesEstoque.comandaId, c.id),
  });
  ok("nenhuma movimentação de estoque (só item livre)", movs.length === 0);
}

async function cenarioEstoqueInsuficiente(sessaoId: number) {
  group("Cenário 3: tentar finalizar com estoque insuficiente (deve bloquear)");
  const [pPao] = created.produtoIds;
  // Pega estoque atual e tenta vender 10x mais
  const p = await db.query.produtos.findFirst({ where: eq(produtos.id, pPao) });
  const estoque = Number(p?.estoqueAtual ?? 0);
  const qtdAbsurda = estoque + 1000;

  const numero = 920000 + Math.floor(Math.random() * 99999);
  const [c] = await db
    .insert(comandas)
    .values({
      numero,
      status: "aberta",
      valorTotal: "0",
      taxaGorjeta: "0",
      caixaSessaoId: sessaoId,
      usuarioAberturaId: created.usuarioId,
    })
    .returning({ id: comandas.id });
  created.comandaIds.push(c.id);

  await db.insert(itensComanda).values({
    comandaId: c.id,
    produtoId: pPao,
    quantidade: toQty(qtdAbsurda),
    precoUnitario: toMoney(Number(p?.preco ?? 0)),
    subtotal: calcSubtotal(qtdAbsurda, Number(p?.preco ?? 0)),
  });
  await recalcularTotalComanda(c.id);

  const fin = await finalizarComandaCore({
    comandaId: c.id,
    userId: created.usuarioId,
    formaPagamento: "dinheiro",
    taxaGorjetaInput: "0",
    gorjetaConfig: { tipo: "nenhuma", taxa: "0" },
  });
  ok("finalização REJEITADA com estoque insuficiente", !fin.success);
  if (!fin.success) {
    ok(
      "mensagem de erro menciona estoque",
      (fin as { error: string }).error.toLowerCase().includes("estoque"),
      `recebido: ${(fin as { error: string }).error}`,
    );
  }

  // Estoque NÃO foi decrementado
  const pAfter = await db.query.produtos.findFirst({ where: eq(produtos.id, pPao) });
  near("estoque inalterado após rejeição", Number(pAfter?.estoqueAtual), estoque, 0.001);

  // Comanda permanece aberta
  const cAfter = await db.query.comandas.findFirst({ where: eq(comandas.id, c.id) });
  ok("comanda permanece aberta", cAfter?.status === "aberta");
}

async function cenarioCancelamento(sessaoId: number) {
  group("Cenário 4: cancelamento NÃO mexe em estoque");
  const [pPao] = created.produtoIds;
  const p = await db.query.produtos.findFirst({ where: eq(produtos.id, pPao) });
  const estoqueAntes = Number(p?.estoqueAtual ?? 0);

  const numero = 930000 + Math.floor(Math.random() * 99999);
  const [c] = await db
    .insert(comandas)
    .values({
      numero,
      status: "aberta",
      valorTotal: "0",
      taxaGorjeta: "0",
      caixaSessaoId: sessaoId,
      usuarioAberturaId: created.usuarioId,
    })
    .returning({ id: comandas.id });
  created.comandaIds.push(c.id);

  await db.insert(itensComanda).values({
    comandaId: c.id,
    produtoId: pPao,
    quantidade: toQty(3),
    precoUnitario: toMoney(Number(p?.preco ?? 0)),
    subtotal: calcSubtotal(3, Number(p?.preco ?? 0)),
  });
  await recalcularTotalComanda(c.id);

  // Cancela
  await db
    .update(comandas)
    .set({
      status: "cancelada",
      dataFechamento: new Date(),
      usuarioFechamentoId: created.usuarioId,
    })
    .where(eq(comandas.id, c.id));

  const cAfter = await db.query.comandas.findFirst({ where: eq(comandas.id, c.id) });
  ok("comanda cancelada", cAfter?.status === "cancelada");

  const pAfter = await db.query.produtos.findFirst({ where: eq(produtos.id, pPao) });
  near("estoque inalterado após cancelamento", Number(pAfter?.estoqueAtual), estoqueAntes, 0.001);
}

async function cenarioEntradaEstoque() {
  group("Cenário 5: entrada de estoque (compra/reposição)");
  const [pPao] = created.produtoIds;
  const p = await db.query.produtos.findFirst({ where: eq(produtos.id, pPao) });
  const antes = Number(p?.estoqueAtual ?? 0);

  const novoEstoque = await registrarEntradaInline(pPao, 50, created.usuarioId, `${PREFIXO} reposição`);
  near("estoque após entrada de 50", novoEstoque, antes + 50, 0.001);

  const movs = await db.query.movimentacoesEstoque.findMany({
    where: and(eq(movimentacoesEstoque.produtoId, pPao), eq(movimentacoesEstoque.tipo, "entrada")),
  });
  ok("ao menos 1 movimentação de entrada registrada", movs.length >= 1);
  const ult = movs.sort((a, b) => b.id - a.id)[0];
  near("última entrada registra qtd 50", Number(ult.quantidade), 50, 0.001);
  near("quantidadePosterior bate com novo estoque", Number(ult.quantidadePosterior), novoEstoque, 0.001);
}

async function cenarioPerdaSimples() {
  group("Cenário 6: perda manual (vencimento, quebra) — valor calculado correto");
  const [, pBolo] = created.produtoIds;
  const p = await db.query.produtos.findFirst({ where: eq(produtos.id, pBolo) });
  const antes = Number(p?.estoqueAtual ?? 0);
  const custoEfetivo = Number(getCustoEfetivo(p!));

  const r = await registrarPerdaInline(pBolo, 1.5, "Vencimento — teste", created.usuarioId);
  near("estoque pós-perda (1.5 kg a menos)", r.post, antes - 1.5, 0.001);
  near("valor da perda = 1.5 × custo efetivo", Number(r.valor), 1.5 * custoEfetivo, 0.01);

  // Perda registrada e identificável
  const perdas = await db.query.perdasEstoque.findMany({
    where: eq(perdasEstoque.produtoId, pBolo),
  });
  const ultPerda = perdas.sort((a, b) => b.id - a.id)[0];
  ok("perda persistida", ultPerda != null);
  ok("perda começa como NÃO visualizada (alerta ativo)", ultPerda?.visualizada === false);
  near("quantidade da perda", Number(ultPerda?.quantidade), 1.5, 0.001);
  ok("motivo registrado", ultPerda?.motivo === "Vencimento — teste");
}

async function cenarioPerdaMaiorQueEstoque() {
  group("Cenário 7: perda maior que estoque — clampa estoque em 0");
  const [, , pCafe] = created.produtoIds;
  const p = await db.query.produtos.findFirst({ where: eq(produtos.id, pCafe) });
  const antes = Number(p?.estoqueAtual ?? 0);
  const custoEfetivo = Number(getCustoEfetivo(p!));
  const tentar = antes + 999;

  const r = await registrarPerdaInline(pCafe, tentar, "Acidente catastrófico", created.usuarioId);
  near("estoque clampa em 0", r.post, 0, 0.001);

  // O valor da perda usa a qtd informada (não a clampada) — comportamento atual do código.
  near(
    "valor da perda usa qtd informada × custo efetivo",
    Number(r.valor),
    tentar * custoEfetivo,
    0.01,
  );

  // Verifica que perda foi gravada
  const ult = (
    await db.query.perdasEstoque.findMany({
      where: eq(perdasEstoque.produtoId, pCafe),
    })
  ).sort((a, b) => b.id - a.id)[0];
  near("qtd da perda registrada (informada)", Number(ult.quantidade), tentar, 0.001);
}

async function cenarioInventarioComPerda() {
  group("Cenário 8: inventário físico — diferença negativa vira perda automática");
  const [pPao] = created.produtoIds;
  const p = await db.query.produtos.findFirst({ where: eq(produtos.id, pPao) });
  const teorico = Number(p?.estoqueAtual ?? 0);
  // Conta 5 unidades a menos do que o sistema diz
  const contado = Math.max(0, teorico - 5);

  const perdasAntes = await db.query.perdasEstoque.findMany({
    where: eq(perdasEstoque.produtoId, pPao),
  });
  const countAntes = perdasAntes.length;

  const r = await registrarInventarioInline(
    [{ produtoId: pPao, quantidadeContada: contado }],
    created.usuarioId,
  );

  ok("inventário ajustou 1 item", r.totalAjustados === 1);
  ok("e gerou 1 perda automática", r.totalPerdas === 1);

  const pAfter = await db.query.produtos.findFirst({ where: eq(produtos.id, pPao) });
  near("estoque ajustado para o valor contado", Number(pAfter?.estoqueAtual), contado, 0.001);

  const perdasDepois = await db.query.perdasEstoque.findMany({
    where: eq(perdasEstoque.produtoId, pPao),
  });
  ok("nova perda foi inserida", perdasDepois.length === countAntes + 1);
  const ult = perdasDepois.sort((a, b) => b.id - a.id)[0];
  ok(
    "motivo identifica origem como inventário",
    (ult.motivo ?? "").toLowerCase().includes("invent"),
    `recebido: ${ult.motivo}`,
  );
  near("qtd da perda automática = diferença", Number(ult.quantidade), 5, 0.001);
}

async function cenarioInventarioSobra() {
  group("Cenário 9: inventário com sobra — ajusta sem gerar perda");
  const [, pBolo] = created.produtoIds;
  const p = await db.query.produtos.findFirst({ where: eq(produtos.id, pBolo) });
  const teorico = Number(p?.estoqueAtual ?? 0);
  const contado = teorico + 2; // sobra de 2

  const perdasAntes = (
    await db.query.perdasEstoque.findMany({ where: eq(perdasEstoque.produtoId, pBolo) })
  ).length;

  const r = await registrarInventarioInline(
    [{ produtoId: pBolo, quantidadeContada: contado }],
    created.usuarioId,
  );
  ok("ajusta 1 item", r.totalAjustados === 1);
  ok("não gera perda (sobra)", r.totalPerdas === 0);

  const pAfter = await db.query.produtos.findFirst({ where: eq(produtos.id, pBolo) });
  near("estoque foi para o valor contado (sobra incluída)", Number(pAfter?.estoqueAtual), contado, 0.001);

  const perdasDepois = (
    await db.query.perdasEstoque.findMany({ where: eq(perdasEstoque.produtoId, pBolo) })
  ).length;
  ok("nenhuma perda nova", perdasDepois === perdasAntes);
}

async function cenarioFechamentoComResumo(sessaoId: number) {
  group("Cenário 10: resumo de sessão e fechamento de caixa");

  // Tenta fechar enquanto pode haver comandas abertas — o código de produção
  // bloqueia, então primeiro garantimos que toda comanda da sessão foi finalizada/cancelada.
  const abertas = await db.query.comandas.findMany({
    where: and(eq(comandas.caixaSessaoId, sessaoId), eq(comandas.status, "aberta")),
  });
  ok("nenhuma comanda aberta antes de fechar", abertas.length === 0, `${abertas.length} ainda abertas`);

  // Resumo: vendas finalizadas
  const finalizadas = await db.query.comandas.findMany({
    where: and(eq(comandas.caixaSessaoId, sessaoId), eq(comandas.status, "finalizada")),
  });
  const totalVendas = finalizadas.reduce((acc, c) => acc + Number(c.valorTotal), 0);
  const dinheiro = finalizadas
    .filter((c) => c.formaPagamento === "dinheiro")
    .reduce((acc, c) => acc + Number(c.valorTotal), 0);

  // Cenário 1 (R$ 73.15 dinheiro) + Cenário 2 (R$ 55.00 pix) → 128.15 total
  near("totalVendas finalizadas", totalVendas, 128.15, 0.01);
  near("apenas a primeira foi dinheiro (R$ 73.15)", dinheiro, 73.15, 0.01);

  // Esperado em caixa: abertura R$ 200 + dinheiro R$ 73.15 = 273.15
  const esperado = 200 + dinheiro;
  // Operador informa R$ 270.00 → falta R$ 3.15
  const informado = 270.0;
  const diferenca = informado - esperado;
  near("diferença de caixa = informado - esperado", diferenca, -3.15, 0.01);

  await db
    .update(caixaSessoes)
    .set({
      status: "fechada",
      valorFechamento: toMoney(informado),
      dataFechamento: new Date(),
      usuarioFechamentoId: created.usuarioId,
      observacoes: `${PREFIXO} fechamento com diferença R$ ${diferenca.toFixed(2)}`,
    })
    .where(eq(caixaSessoes.id, sessaoId));

  const sFinal = await db.query.caixaSessoes.findFirst({
    where: eq(caixaSessoes.id, sessaoId),
  });
  ok("status fechada", sFinal?.status === "fechada");
  near("valorFechamento gravado", Number(sFinal?.valorFechamento), informado, 0.01);
}

async function cenarioImpedeFechamentoComAbertas() {
  group("Cenário 11: regra — não pode fechar caixa com comandas abertas");
  // Abre nova sessão
  const [s] = await db
    .insert(caixaSessoes)
    .values({
      usuarioAberturaId: created.usuarioId,
      valorAbertura: "100.00",
      status: "aberta",
      observacoes: `${PREFIXO} sessão guard`,
    })
    .returning({ id: caixaSessoes.id });
  created.caixaSessaoIds.push(s.id);

  const numero = 940000 + Math.floor(Math.random() * 99999);
  const [c] = await db
    .insert(comandas)
    .values({
      numero,
      status: "aberta",
      valorTotal: "0",
      taxaGorjeta: "0",
      caixaSessaoId: s.id,
      usuarioAberturaId: created.usuarioId,
    })
    .returning({ id: comandas.id });
  created.comandaIds.push(c.id);

  // Replica a verificação que o action faz
  const abertas = await db.query.comandas.findMany({
    where: and(eq(comandas.caixaSessaoId, s.id), eq(comandas.status, "aberta")),
  });
  ok(
    "regra detecta comanda aberta e BLOQUEARIA fechamento",
    abertas.length > 0,
    `abertas=${abertas.length}`,
  );

  // Cancela e refaz a verificação
  await db
    .update(comandas)
    .set({ status: "cancelada", dataFechamento: new Date() })
    .where(eq(comandas.id, c.id));

  const abertas2 = await db.query.comandas.findMany({
    where: and(eq(comandas.caixaSessaoId, s.id), eq(comandas.status, "aberta")),
  });
  ok("após cancelar, regra libera fechamento", abertas2.length === 0);
}

async function cenarioFinalizarComandaVazia(sessaoId: number) {
  group("Cenário 12: finalizar comanda VAZIA — deve falhar");
  const numero = 950000 + Math.floor(Math.random() * 99999);
  const [c] = await db
    .insert(comandas)
    .values({
      numero,
      status: "aberta",
      valorTotal: "0",
      taxaGorjeta: "0",
      caixaSessaoId: sessaoId,
      usuarioAberturaId: created.usuarioId,
    })
    .returning({ id: comandas.id });
  created.comandaIds.push(c.id);

  const fin = await finalizarComandaCore({
    comandaId: c.id,
    userId: created.usuarioId,
    formaPagamento: "dinheiro",
    taxaGorjetaInput: "0",
    gorjetaConfig: { tipo: "nenhuma", taxa: "0" },
  });
  ok("comanda vazia foi rejeitada", !fin.success);
  if (!fin.success) {
    ok(
      "erro menciona vazia",
      (fin as { error: string }).error.toLowerCase().includes("vazia"),
      (fin as { error: string }).error,
    );
  }

  // Cancela pra liberar fechamento futuro
  await db
    .update(comandas)
    .set({ status: "cancelada", dataFechamento: new Date() })
    .where(eq(comandas.id, c.id));
}

async function cenarioPerdaUsaCusto() {
  group("Cenário 14: valor da perda usa custo de aquisição, não preço de venda");
  // Pão: preço R$5, custo R$2. Perda de 4 unidades:
  //   - antes (bug): 4 × R$5 = R$20 (preço de venda)
  //   - agora (correto): 4 × R$2 = R$8 (custo real)
  const [pPao] = created.produtoIds;
  const r = await registrarPerdaInline(pPao, 4, "Validade vencida (custo test)", created.usuarioId);
  near("valor da perda usa custo (4 × R$ 2.00)", Number(r.valor), 8.0, 0.01);

  // Coxinha (produto SEM custo cadastrado): deve cair no fallback do preço
  const pCox = created.produtoIds[3];
  const r2 = await registrarPerdaInline(pCox, 2, "Sem custo cadastrado (fallback)", created.usuarioId);
  near("sem custo cadastrado, usa preço como fallback (2 × R$ 8.00)", Number(r2.valor), 16.0, 0.01);

  // getCustoEfetivo isolado (helper puro)
  ok(
    "getCustoEfetivo retorna custo quando > 0",
    Number(getCustoEfetivo({ custoUnitario: "12.00", preco: "32.00" })) === 12,
  );
  ok(
    "getCustoEfetivo cai no preço quando custo = 0",
    Number(getCustoEfetivo({ custoUnitario: "0", preco: "8.00" })) === 8,
  );
  ok(
    "getCustoEfetivo cai no preço quando custo é null",
    Number(getCustoEfetivo({ custoUnitario: null, preco: "5.00" })) === 5,
  );
}

async function cenarioLedgerConsistencia() {
  group("Cenário 13: consistência do ledger (anterior+delta=posterior)");
  for (const pid of created.produtoIds) {
    const movs = await db.query.movimentacoesEstoque.findMany({
      where: eq(movimentacoesEstoque.produtoId, pid),
    });
    let consistentes = 0;
    let total = 0;
    for (const m of movs) {
      total++;
      const ant = Number(m.quantidadeAnterior);
      const post = Number(m.quantidadePosterior);
      const qtd = Number(m.quantidade);
      // Para "saida": post = ant - qtd; para "entrada": post = ant + qtd;
      // para "ajuste": qtd já vem com sinal (positivo ou negativo) e post = ant + qtd.
      let esperado: number;
      if (m.tipo === "saida") esperado = ant - qtd;
      else if (m.tipo === "entrada") esperado = ant + qtd;
      else esperado = ant + qtd;
      if (Math.abs(esperado - post) < 0.001) consistentes++;
      else
        console.log(
          `      ledger inconsistente mov#${m.id}: tipo=${m.tipo} ant=${ant} qtd=${qtd} post=${post} esperado=${esperado}`,
        );
    }
    ok(
      `produto ${pid}: ${consistentes}/${total} movimentações com ledger consistente`,
      consistentes === total,
    );
  }
}

// ---------------------------------------------------------------------------
// Cleanup — sempre roda, mesmo em erro
// ---------------------------------------------------------------------------

async function cleanup() {
  group("Cleanup: removendo registros de teste");
  let removed = 0;
  try {
    if (created.comandaIds.length > 0) {
      // comprovantes (FK cascata em comandas, mas garantimos)
      await db.delete(comprovantesVenda).where(inArray(comprovantesVenda.comandaId, created.comandaIds));
      await db.delete(itensComanda).where(inArray(itensComanda.comandaId, created.comandaIds));
      await db.delete(itensLivres).where(inArray(itensLivres.comandaId, created.comandaIds));
      await db.delete(movimentacoesEstoque).where(inArray(movimentacoesEstoque.comandaId, created.comandaIds));
    }

    if (created.produtoIds.length > 0) {
      // movimentações por produto (entradas/perdas/ajustes que não vieram de comanda)
      await db.delete(movimentacoesEstoque).where(inArray(movimentacoesEstoque.produtoId, created.produtoIds));
      await db.delete(perdasEstoque).where(inArray(perdasEstoque.produtoId, created.produtoIds));
    }

    if (created.comandaIds.length > 0) {
      await db.delete(comandas).where(inArray(comandas.id, created.comandaIds));
      removed += created.comandaIds.length;
    }
    if (created.caixaSessaoIds.length > 0) {
      await db.delete(caixaSessoes).where(inArray(caixaSessoes.id, created.caixaSessaoIds));
      removed += created.caixaSessaoIds.length;
    }
    if (created.produtoIds.length > 0) {
      await db.delete(produtos).where(inArray(produtos.id, created.produtoIds));
      removed += created.produtoIds.length;
    }
    if (created.categoriaId > 0) {
      await db.delete(categorias).where(eq(categorias.id, created.categoriaId));
      removed += 1;
    }
    if (created.usuarioId > 0) {
      await db.delete(usuarios).where(eq(usuarios.id, created.usuarioId));
      removed += 1;
    }
    console.log(`  ✓ removidos ${removed} registros principais (mais joins)`);
  } catch (err) {
    console.error("  ✗ erro durante cleanup:", err);
    failures.push(`Cleanup falhou: ${(err as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n=== Suite de integração financeira (escopo ${PREFIXO}) ===`);
  console.log(`DB host: ${(process.env.DATABASE_URL ?? "").split("@")[1]?.split("/")[0] ?? "?"}\n`);

  try {
    await setup();
    const sessaoId = await cenarioCaixaEComandaPercentual();
    await cenarioGorjetaFixaEItemLivre(sessaoId);
    await cenarioEstoqueInsuficiente(sessaoId);
    await cenarioCancelamento(sessaoId);
    await cenarioEntradaEstoque();
    await cenarioPerdaSimples();
    await cenarioPerdaMaiorQueEstoque();
    await cenarioInventarioComPerda();
    await cenarioInventarioSobra();
    await cenarioFinalizarComandaVazia(sessaoId);
    // Cancela tudo que ficou aberto pra poder fechar
    const ainda = await db.query.comandas.findMany({
      where: and(eq(comandas.caixaSessaoId, sessaoId), eq(comandas.status, "aberta")),
    });
    for (const c of ainda) {
      await db
        .update(comandas)
        .set({ status: "cancelada", dataFechamento: new Date() })
        .where(eq(comandas.id, c.id));
    }
    await cenarioFechamentoComResumo(sessaoId);
    await cenarioImpedeFechamentoComAbertas();
    await cenarioPerdaUsaCusto();
    await cenarioLedgerConsistencia();
  } catch (err) {
    fail++;
    failures.push(`Erro fatal: ${(err as Error).message}\n${(err as Error).stack}`);
    console.error("\nERRO FATAL:", err);
  } finally {
    await cleanup();
  }

  console.log("\n=========================================");
  console.log(`Total: ${pass + fail} | Passou: ${pass} | Falhou: ${fail}`);
  console.log("=========================================");
  if (fail > 0) {
    console.log("\nFalhas:");
    for (const f of failures) console.log(f);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
