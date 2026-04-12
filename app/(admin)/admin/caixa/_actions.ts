"use server";

import { db } from "@/db";
import {
  caixaSessoes,
  comandas,
  comprovantesVenda,
  itensComanda,
  itensLivres,
  movimentacoesEstoque,
  produtos,
} from "@/db/schema";
import { requireUser } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import {
  calcGorjetaPercentual,
  calcSubtotal,
  calcTotalComanda,
  toMoney,
  toQty,
} from "@/lib/calculations";
import {
  abrirCaixaSchema,
  fecharCaixaSchema,
} from "@/lib/validators/caixa";
import {
  adicionarItemLivreSchema,
  adicionarItemSchema,
  criarComandaSchema,
  finalizarComandaSchema,
} from "@/lib/validators/comanda";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getConfigGorjeta, getProximoNumeroComanda } from "./_queries";

// ---------------------------------------------------------------------------
// Tipos auxiliares
// ---------------------------------------------------------------------------

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  debito: "Cartao Debito",
  credito: "Cartao Credito",
  pix: "PIX",
  voucher: "Voucher",
  outro: "Outro",
};

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Recalcula o valorTotal da comanda somando itens (produtos) e itens livres.
 * NOTA: isto é chamado dentro de "transações" simuladas (o driver neon-http
 * não suporta transações reais; preservamos invariantes na ordem das operações).
 */
async function recalcularTotalComanda(comandaId: number): Promise<number> {
  const [itens, livres] = await Promise.all([
    db.query.itensComanda.findMany({
      where: eq(itensComanda.comandaId, comandaId),
    }),
    db.query.itensLivres.findMany({
      where: eq(itensLivres.comandaId, comandaId),
    }),
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

// ---------------------------------------------------------------------------
// Gestão de sessão
// ---------------------------------------------------------------------------

export async function abrirCaixa(
  formData: FormData,
): Promise<ActionResult<{ sessaoId: number }>> {
  try {
    const user = await requireUser();

    const raw = {
      valorAbertura: String(formData.get("valorAbertura") ?? "0"),
    };
    const parsed = abrirCaixaSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    // Regra: apenas uma sessão aberta por vez
    const jaAberta = await db.query.caixaSessoes.findFirst({
      where: eq(caixaSessoes.status, "aberta"),
    });
    if (jaAberta) {
      return {
        success: false,
        error:
          "Já existe uma sessão de caixa aberta. Feche-a antes de abrir outra.",
      };
    }

    const observacoes = String(formData.get("observacoes") ?? "").trim();

    const [nova] = await db
      .insert(caixaSessoes)
      .values({
        usuarioAberturaId: Number(user.id),
        valorAbertura: parsed.data.valorAbertura,
        status: "aberta",
        observacoes: observacoes || null,
      })
      .returning({ id: caixaSessoes.id });

    revalidatePath("/admin/caixa");
    return { success: true, data: { sessaoId: nova.id } };
  } catch (error) {
    console.error("Erro ao abrir caixa:", error);
    return { success: false, error: "Erro ao abrir caixa." };
  }
}

export async function fecharCaixa(
  sessaoId: number,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const raw = {
      valorFechamento: String(formData.get("valorFechamento") ?? "0"),
      observacoes: (formData.get("observacoes") as string) || undefined,
    };
    const parsed = fecharCaixaSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const sessao = await db.query.caixaSessoes.findFirst({
      where: eq(caixaSessoes.id, sessaoId),
    });
    if (!sessao) {
      return { success: false, error: "Sessão não encontrada." };
    }
    if (sessao.status !== "aberta") {
      return { success: false, error: "Esta sessão já está fechada." };
    }

    // Regra: não pode fechar com comandas em aberto
    const abertas = await db.query.comandas.findMany({
      where: and(
        eq(comandas.caixaSessaoId, sessaoId),
        eq(comandas.status, "aberta"),
      ),
      columns: { id: true },
    });
    if (abertas.length > 0) {
      return {
        success: false,
        error: `Existem ${abertas.length} comanda(s) em aberto. Finalize ou cancele antes de fechar o caixa.`,
      };
    }

    const observacoesFinal = parsed.data.observacoes?.trim()
      ? parsed.data.observacoes.trim()
      : sessao.observacoes;

    await db
      .update(caixaSessoes)
      .set({
        status: "fechada",
        valorFechamento: parsed.data.valorFechamento,
        observacoes: observacoesFinal,
        dataFechamento: new Date(),
        usuarioFechamentoId: Number(user.id),
      })
      .where(eq(caixaSessoes.id, sessaoId));

    revalidatePath("/admin/caixa");
    revalidatePath(`/admin/caixa/${sessaoId}`);
    return { success: true };
  } catch (error) {
    console.error("Erro ao fechar caixa:", error);
    return { success: false, error: "Erro ao fechar caixa." };
  }
}

// ---------------------------------------------------------------------------
// Gestão de comandas
// ---------------------------------------------------------------------------

export async function criarComanda(
  sessaoId: number,
  formData: FormData,
): Promise<ActionResult<{ comandaId: number }>> {
  try {
    const user = await requireUser();

    const raw = {
      garcomId: formData.get("garcomId") || undefined,
      observacoes: (formData.get("observacoes") as string) || undefined,
    };
    const parsed = criarComandaSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const sessao = await db.query.caixaSessoes.findFirst({
      where: eq(caixaSessoes.id, sessaoId),
    });
    if (!sessao) {
      return { success: false, error: "Sessão não encontrada." };
    }
    if (sessao.status !== "aberta") {
      return { success: false, error: "Sessão de caixa não está aberta." };
    }

    const numero = await getProximoNumeroComanda();

    const [nova] = await db
      .insert(comandas)
      .values({
        numero,
        status: "aberta",
        valorTotal: "0",
        taxaGorjeta: "0",
        garcomId: parsed.data.garcomId ?? null,
        caixaSessaoId: sessaoId,
        usuarioAberturaId: Number(user.id),
        observacoes: parsed.data.observacoes?.trim() || null,
      })
      .returning({ id: comandas.id });

    revalidatePath(`/admin/caixa/${sessaoId}`);
    return { success: true, data: { comandaId: nova.id } };
  } catch (error) {
    console.error("Erro ao criar comanda:", error);
    return { success: false, error: "Erro ao criar comanda." };
  }
}

/**
 * Permite trocar/definir o garçom de uma comanda aberta. Não estava no plano
 * original mas é necessário para alinhar com o comportamento do PDV.
 */
export async function atualizarGarcomComanda(
  comandaId: number,
  garcomId: number | null,
): Promise<ActionResult> {
  try {
    await requireUser();

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
    });
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }
    if (comanda.status !== "aberta") {
      return { success: false, error: "Comanda não está aberta." };
    }

    await db
      .update(comandas)
      .set({ garcomId })
      .where(eq(comandas.id, comandaId));

    if (comanda.caixaSessaoId) {
      revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar garçom:", error);
    return { success: false, error: "Erro ao atualizar garçom." };
  }
}

export async function adicionarItem(
  comandaId: number,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();

    const raw = {
      produtoId: formData.get("produtoId"),
      quantidade: formData.get("quantidade"),
    };
    const parsed = adicionarItemSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
    });
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }
    if (comanda.status !== "aberta") {
      return { success: false, error: "Comanda não está aberta." };
    }

    const produto = await db.query.produtos.findFirst({
      where: eq(produtos.id, parsed.data.produtoId),
    });
    if (!produto) {
      return { success: false, error: "Produto não encontrado." };
    }
    if (!produto.ativo || !produto.disponivelHoje) {
      return { success: false, error: "Produto indisponível no momento." };
    }

    const qtd = parsed.data.quantidade;
    const subtotal = calcSubtotal(qtd, produto.preco);

    await db.insert(itensComanda).values({
      comandaId,
      produtoId: produto.id,
      quantidade: toQty(qtd),
      precoUnitario: produto.preco,
      subtotal,
    });

    await recalcularTotalComanda(comandaId);

    if (comanda.caixaSessaoId) {
      revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao adicionar item:", error);
    return { success: false, error: "Erro ao adicionar item." };
  }
}

export async function adicionarItemLivre(
  comandaId: number,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();

    const raw = {
      descricao: formData.get("descricao"),
      quantidade: formData.get("quantidade"),
      precoUnitario: String(formData.get("precoUnitario") ?? "0"),
    };
    const parsed = adicionarItemLivreSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
    });
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }
    if (comanda.status !== "aberta") {
      return { success: false, error: "Comanda não está aberta." };
    }

    const qtd = parsed.data.quantidade;
    const subtotal = calcSubtotal(qtd, parsed.data.precoUnitario);

    await db.insert(itensLivres).values({
      comandaId,
      descricao: parsed.data.descricao.trim(),
      quantidade: toQty(qtd),
      precoUnitario: parsed.data.precoUnitario,
      subtotal,
    });

    await recalcularTotalComanda(comandaId);

    if (comanda.caixaSessaoId) {
      revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao adicionar item livre:", error);
    return { success: false, error: "Erro ao adicionar item livre." };
  }
}

export async function removerItemComanda(
  itemId: number,
  comandaId: number,
): Promise<ActionResult> {
  try {
    await requireUser();

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
    });
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }
    if (comanda.status !== "aberta") {
      return { success: false, error: "Comanda não está aberta." };
    }

    const item = await db.query.itensComanda.findFirst({
      where: and(
        eq(itensComanda.id, itemId),
        eq(itensComanda.comandaId, comandaId),
      ),
    });
    if (!item) {
      return { success: false, error: "Item não encontrado." };
    }

    await db.delete(itensComanda).where(eq(itensComanda.id, itemId));
    await recalcularTotalComanda(comandaId);

    if (comanda.caixaSessaoId) {
      revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao remover item:", error);
    return { success: false, error: "Erro ao remover item." };
  }
}

export async function removerItemLivre(
  itemId: number,
  comandaId: number,
): Promise<ActionResult> {
  try {
    await requireUser();

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
    });
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }
    if (comanda.status !== "aberta") {
      return { success: false, error: "Comanda não está aberta." };
    }

    const item = await db.query.itensLivres.findFirst({
      where: and(
        eq(itensLivres.id, itemId),
        eq(itensLivres.comandaId, comandaId),
      ),
    });
    if (!item) {
      return { success: false, error: "Item não encontrado." };
    }

    await db.delete(itensLivres).where(eq(itensLivres.id, itemId));
    await recalcularTotalComanda(comandaId);

    if (comanda.caixaSessaoId) {
      revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao remover item livre:", error);
    return { success: false, error: "Erro ao remover item livre." };
  }
}

// ---------------------------------------------------------------------------
// Comprovante (texto plano ESC/POS-friendly)
// ---------------------------------------------------------------------------

interface ComprovanteData {
  numero: number;
  dataFechamento: Date;
  garcomNome: string | null;
  sessaoId: number;
  itensProduto: { nome: string; quantidade: string; subtotal: string }[];
  itensLivres: { descricao: string; quantidade: string; subtotal: string }[];
  subtotal: number;
  gorjeta: number;
  total: number;
  formaPagamento: string;
}

function gerarConteudoComprovante(data: ComprovanteData): string {
  const LARGURA = 32;
  const dupla = "=".repeat(LARGURA);
  const simples = "-".repeat(LARGURA);

  const centro = (txt: string) => {
    const padding = Math.max(0, Math.floor((LARGURA - txt.length) / 2));
    return " ".repeat(padding) + txt;
  };

  const linhaValor = (label: string, valor: string) => {
    const espaco = Math.max(1, LARGURA - label.length - valor.length);
    return label + " ".repeat(espaco) + valor;
  };

  const lines: string[] = [];
  lines.push(dupla);
  lines.push(centro("PANIFICADORA REI DOS PAES"));
  lines.push(dupla);
  lines.push(`Comanda: #${data.numero}`);
  lines.push(`Data: ${formatDateTime(data.dataFechamento)}`);
  if (data.garcomNome) {
    lines.push(`Garcom: ${data.garcomNome}`);
  }
  lines.push(`Caixa: #${data.sessaoId}`);
  lines.push(simples);
  lines.push("ITEM              QTD   SUBTOTAL");
  lines.push(simples);

  const fmtLinhaItem = (nome: string, qtd: string, sub: string) => {
    const nomeCol = nome.substring(0, 16).padEnd(16, " ");
    const qtdCol = Number(qtd).toFixed(2).padStart(5, " ");
    const subCol = formatBRL(sub).padStart(9, " ");
    return `${nomeCol} ${qtdCol}${subCol}`;
  };

  for (const item of data.itensProduto) {
    lines.push(fmtLinhaItem(item.nome, item.quantidade, item.subtotal));
  }
  for (const item of data.itensLivres) {
    lines.push(fmtLinhaItem(item.descricao, item.quantidade, item.subtotal));
  }

  lines.push(simples);
  lines.push(linhaValor("Subtotal:", formatBRL(data.subtotal)));
  if (data.gorjeta > 0) {
    lines.push(linhaValor("Gorjeta:", formatBRL(data.gorjeta)));
  }
  lines.push(dupla);
  lines.push(linhaValor("TOTAL:", formatBRL(data.total)));
  lines.push(
    `Pagamento: ${FORMA_PAGAMENTO_LABELS[data.formaPagamento] ?? data.formaPagamento}`,
  );
  lines.push(dupla);
  lines.push(centro("Obrigado pela preferencia!"));
  lines.push(dupla);
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Finalizar comanda — passo mais crítico (baixa de estoque + comprovante)
// ---------------------------------------------------------------------------

export async function finalizarComanda(
  comandaId: number,
  formData: FormData,
): Promise<ActionResult<{ conteudo: string }>> {
  try {
    const user = await requireUser();

    const raw = {
      formaPagamento: formData.get("formaPagamento"),
      taxaGorjeta: String(formData.get("taxaGorjeta") ?? "0"),
    };
    const parsed = finalizarComandaSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
      with: {
        garcom: true,
        itens: { with: { produto: true } },
        itensLivres: true,
      },
    });

    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }
    if (comanda.status !== "aberta") {
      return { success: false, error: "Comanda não está aberta." };
    }
    if (!comanda.caixaSessaoId) {
      return {
        success: false,
        error: "Comanda não está associada a uma sessão de caixa.",
      };
    }
    if (comanda.itens.length === 0 && comanda.itensLivres.length === 0) {
      return {
        success: false,
        error: "Não é possível finalizar uma comanda vazia.",
      };
    }

    const sessao = await db.query.caixaSessoes.findFirst({
      where: eq(caixaSessoes.id, comanda.caixaSessaoId),
    });
    if (!sessao || sessao.status !== "aberta") {
      return { success: false, error: "Sessão de caixa não está aberta." };
    }

    // Validar estoque ANTES de qualquer mutação
    for (const item of comanda.itens) {
      const estoqueAtual = Number(item.produto.estoqueAtual);
      const qtdNecessaria = Number(item.quantidade);
      if (estoqueAtual < qtdNecessaria) {
        return {
          success: false,
          error: `Estoque insuficiente para "${item.produto.nome}". Disponível: ${estoqueAtual.toFixed(3)}, necessário: ${qtdNecessaria.toFixed(3)}.`,
        };
      }
    }

    // Recalcular subtotal a partir dos itens (NUNCA confiar no cliente)
    const subtotalItens = [
      ...comanda.itens.map((i) => Number(i.subtotal)),
      ...comanda.itensLivres.map((i) => Number(i.subtotal)),
    ].reduce((acc, n) => acc + n, 0);

    // Gorjeta: o cliente envia um valor calculado em R$. Se a config for "fixa",
    // usamos esse valor fixo diretamente; caso contrário usamos
    // calcGorjetaPercentual sobre a taxa enviada (tratada como percentual) OU
    // o valor em R$ já calculado (quando o cliente enviou valor).
    const cfg = await getConfigGorjeta();
    const taxaRaw = parsed.data.taxaGorjeta ?? "0";
    const taxaNum = Number(taxaRaw) || 0;

    let gorjetaValor: number;
    if (cfg.tipo === "fixa") {
      // Config fixa: ignora input do cliente e usa valor configurado
      gorjetaValor = Number(cfg.taxa);
    } else if (taxaNum <= 0) {
      gorjetaValor = 0;
    } else if (taxaNum <= 100) {
      // Valor pequeno é tratado como percentual (<=100)
      // porém se o cliente enviou no formato fracionário maior que o subtotal
      // nós fazemos o fallback para valor bruto.
      const candidatoPct = Number(calcGorjetaPercentual(subtotalItens, taxaNum));
      gorjetaValor = candidatoPct;
    } else {
      // Valor > 100 provavelmente é R$ direto
      gorjetaValor = taxaNum;
    }

    const totalFinal = Number(calcTotalComanda(subtotalItens, gorjetaValor));
    const dataFechamento = new Date();

    // ---------- Operações "transacionais" ----------
    // O driver neon-http não suporta transações reais; executamos na ordem
    // que preserva consistência: estoque primeiro, depois comanda, depois
    // comprovante.

    // 1. Baixa de estoque + movimentacoes (uma por item de produto)
    for (const item of comanda.itens) {
      const produto = item.produto;
      const estoqueAnterior = Number(produto.estoqueAtual);
      const qtd = Number(item.quantidade);
      const estoquePosterior = estoqueAnterior - qtd;

      await db.insert(movimentacoesEstoque).values({
        produtoId: produto.id,
        tipo: "saida",
        quantidade: toQty(qtd),
        quantidadeAnterior: toQty(estoqueAnterior),
        quantidadePosterior: toQty(estoquePosterior),
        observacao: `Venda - Comanda #${comanda.numero}`,
        comandaId: comanda.id,
        usuarioId: Number(user.id),
      });

      await db
        .update(produtos)
        .set({
          estoqueAtual: toQty(estoquePosterior),
          updatedAt: new Date(),
        })
        .where(eq(produtos.id, produto.id));
    }

    // 2. Atualizar comanda
    await db
      .update(comandas)
      .set({
        status: "finalizada",
        valorTotal: toMoney(totalFinal),
        taxaGorjeta: toMoney(gorjetaValor),
        formaPagamento: parsed.data.formaPagamento,
        dataFechamento,
        usuarioFechamentoId: Number(user.id),
      })
      .where(eq(comandas.id, comandaId));

    // 3. Gerar e inserir comprovante
    const conteudo = gerarConteudoComprovante({
      numero: comanda.numero,
      dataFechamento,
      garcomNome: comanda.garcom?.nome ?? null,
      sessaoId: comanda.caixaSessaoId,
      itensProduto: comanda.itens.map((i) => ({
        nome: i.produto.nome,
        quantidade: i.quantidade,
        subtotal: i.subtotal,
      })),
      itensLivres: comanda.itensLivres.map((i) => ({
        descricao: i.descricao,
        quantidade: i.quantidade,
        subtotal: i.subtotal,
      })),
      subtotal: subtotalItens,
      gorjeta: gorjetaValor,
      total: totalFinal,
      formaPagamento: parsed.data.formaPagamento,
    });

    await db.insert(comprovantesVenda).values({
      comandaId: comanda.id,
      conteudo,
      tipo: "termico",
      impresso: false,
    });

    revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    revalidatePath("/admin/caixa");
    revalidatePath("/admin/comandas");
    revalidatePath("/admin/estoque");
    return { success: true, data: { conteudo } };
  } catch (error) {
    console.error("Erro ao finalizar comanda:", error);
    return { success: false, error: "Erro ao finalizar comanda." };
  }
}

export async function cancelarComanda(
  comandaId: number,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
    });
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }
    if (comanda.status !== "aberta") {
      return { success: false, error: "Comanda não está aberta." };
    }

    // Cancelamento não mexe em estoque — itens nunca foram baixados
    await db
      .update(comandas)
      .set({
        status: "cancelada",
        dataFechamento: new Date(),
        usuarioFechamentoId: Number(user.id),
      })
      .where(eq(comandas.id, comandaId));

    if (comanda.caixaSessaoId) {
      revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    }
    revalidatePath("/admin/caixa");
    revalidatePath("/admin/comandas");
    return { success: true };
  } catch (error) {
    console.error("Erro ao cancelar comanda:", error);
    return { success: false, error: "Erro ao cancelar comanda." };
  }
}
