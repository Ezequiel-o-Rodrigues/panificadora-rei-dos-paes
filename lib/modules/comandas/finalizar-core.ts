import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  caixaSessoes,
  comandas,
  comprovantesVenda,
  movimentacoesEstoque,
  produtos,
} from "@/db/schema";
import {
  calcGorjetaPercentual,
  calcTotalComanda,
  toMoney,
  toQty,
} from "@/lib/calculations";
import { formatBRL } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { TENANT_CONFIG } from "@/lib/config/tenant";

export type FinalizarComandaCoreResult =
  | { success: true; data: { conteudo: string } }
  | { success: false; error: string };

export type FinalizarComandaCoreInput = {
  comandaId: number;
  userId: number;
  formaPagamento:
    | "dinheiro"
    | "debito"
    | "credito"
    | "pix"
    | "voucher"
    | "outro";
  taxaGorjetaInput: string | number;
  gorjetaConfig: {
    tipo: "percentual" | "fixa" | "nenhuma";
    taxa: string;
  };
};

const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  debito: "Cartao Debito",
  credito: "Cartao Credito",
  pix: "PIX",
  voucher: "Voucher",
  outro: "Outro",
};

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
  const nomeTenant = TENANT_CONFIG.nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  lines.push(dupla);
  lines.push(centro(nomeTenant.substring(0, LARGURA)));
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

export async function finalizarComandaCore(
  input: FinalizarComandaCoreInput,
): Promise<FinalizarComandaCoreResult> {
  const { comandaId, userId, formaPagamento, gorjetaConfig } = input;

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

  const subtotalItens = [
    ...comanda.itens.map((i) => Number(i.subtotal)),
    ...comanda.itensLivres.map((i) => Number(i.subtotal)),
  ].reduce((acc, n) => acc + n, 0);

  const taxaRaw = input.taxaGorjetaInput ?? "0";
  const taxaNum = Number(taxaRaw) || 0;

  let gorjetaValor: number;
  if (gorjetaConfig.tipo === "fixa") {
    gorjetaValor = Number(gorjetaConfig.taxa);
  } else if (taxaNum <= 0) {
    gorjetaValor = 0;
  } else if (taxaNum <= 100) {
    gorjetaValor = Number(calcGorjetaPercentual(subtotalItens, taxaNum));
  } else {
    gorjetaValor = taxaNum;
  }

  const totalFinal = Number(calcTotalComanda(subtotalItens, gorjetaValor));
  const dataFechamento = new Date();

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
      usuarioId: userId,
    });

    await db
      .update(produtos)
      .set({
        estoqueAtual: toQty(estoquePosterior),
        updatedAt: new Date(),
      })
      .where(eq(produtos.id, produto.id));
  }

  await db
    .update(comandas)
    .set({
      status: "finalizada",
      valorTotal: toMoney(totalFinal),
      taxaGorjeta: toMoney(gorjetaValor),
      formaPagamento,
      dataFechamento,
      usuarioFechamentoId: userId,
    })
    .where(eq(comandas.id, comandaId));

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
    formaPagamento,
  });

  await db.insert(comprovantesVenda).values({
    comandaId: comanda.id,
    conteudo,
    tipo: "termico",
    impresso: false,
  });

  return { success: true, data: { conteudo } };
}
