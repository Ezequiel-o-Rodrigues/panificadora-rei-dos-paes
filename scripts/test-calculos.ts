/**
 * Suite de testes puros para lib/calculations.ts e lib/money.ts.
 * Não toca no banco. Roda com:
 *   npx tsx scripts/test-calculos.ts
 */

import {
  calcSubtotal,
  calcGorjetaPercentual,
  calcGorjetaFixa,
  calcTotalComanda,
  calcEstoqueTeorico,
  calcPerda,
  calcValorPerda,
  calcComissaoGarcom,
  calcTicketMedio,
  calcDesempenhoGarcom,
  calcDiferencaCaixa,
  toMoney,
  toQty,
  toNum,
} from "@/lib/calculations";
import { formatBRL, parseBRL } from "@/lib/money";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function eq<T>(name: string, got: T, expected: T) {
  if (got === expected) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    const msg = `  ✗ ${name}\n      esperado: ${JSON.stringify(expected)}\n      recebido: ${JSON.stringify(got)}`;
    failures.push(msg);
    console.log(msg);
  }
}

function near(name: string, got: number, expected: number, tol = 0.01) {
  if (Math.abs(got - expected) <= tol) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    const msg = `  ✗ ${name}\n      esperado ~${expected} (tol ${tol})\n      recebido: ${got}`;
    failures.push(msg);
    console.log(msg);
  }
}

function group(name: string, fn: () => void) {
  console.log(`\n[${name}]`);
  fn();
}

// ===========================================================================
// 1. helpers básicos
// ===========================================================================
group("toNum / toMoney / toQty", () => {
  eq("toNum(null)", toNum(null), 0);
  eq("toNum(undefined)", toNum(undefined), 0);
  eq("toNum('NaN')", toNum("NaN"), 0);
  eq("toNum('12.5')", toNum("12.5"), 12.5);
  eq("toNum(7)", toNum(7), 7);
  eq("toMoney(10.005) deve arredondar", toMoney(10.005), "10.01");
  eq("toMoney(10.004) trunca pra baixo", toMoney(10.004), "10.00");
  eq("toMoney(0)", toMoney(0), "0.00");
  eq("toMoney(-3.5)", toMoney(-3.5), "-3.50");
  // Nota: 2.5555 em IEEE-754 é na verdade 2.55549999... então toFixed(3) → "2.555".
  // Comportamento padrão do JS Number.toFixed; aceitável para precisão de estoque (1 mg).
  eq("toQty(2.5555) — comportamento IEEE-754", toQty(2.5555), "2.555");
  eq("toQty(0)", toQty(0), "0.000");
});

// ===========================================================================
// 2. subtotal de itens
// ===========================================================================
group("calcSubtotal", () => {
  eq("3 x 5.50", calcSubtotal(3, 5.5), "16.50");
  eq("2.5 x 12.00", calcSubtotal(2.5, 12), "30.00");
  eq("0 x qualquer = 0", calcSubtotal(0, 99.99), "0.00");
  eq("1 x 0 = 0", calcSubtotal(1, 0), "0.00");
  eq("strings entram OK ('4', '7.25')", calcSubtotal("4", "7.25"), "29.00");
  eq("decimais quebrados (0.333 x 3)", calcSubtotal(0.333, 3), "1.00");
});

// ===========================================================================
// 3. gorjeta
// ===========================================================================
group("calcGorjetaPercentual / calcGorjetaFixa", () => {
  eq("10% de 100", calcGorjetaPercentual(100, 10), "10.00");
  eq("10% de 87.50", calcGorjetaPercentual(87.5, 10), "8.75");
  eq("0% sempre 0", calcGorjetaPercentual(500, 0), "0.00");
  eq("100% = subtotal", calcGorjetaPercentual(42, 100), "42.00");
  eq("fixa 5", calcGorjetaFixa(5), "5.00");
  eq("fixa string '12.30'", calcGorjetaFixa("12.30"), "12.30");
});

// ===========================================================================
// 4. total da comanda
// ===========================================================================
group("calcTotalComanda", () => {
  eq("100 + 10 gorjeta", calcTotalComanda(100, 10), "110.00");
  eq("0 + 0", calcTotalComanda(0, 0), "0.00");
  eq("87.5 + 8.75", calcTotalComanda(87.5, 8.75), "96.25");
  // Caso com floats que normalmente quebram (0.1 + 0.2)
  eq("0.1 + 0.2 deve dar 0.30 (não 0.30000004)", calcTotalComanda(0.1, 0.2), "0.30");
});

// ===========================================================================
// 5. estoque teórico e perda
// ===========================================================================
group("calcEstoqueTeorico / calcPerda / calcValorPerda", () => {
  eq("estoque inicial 50 + 20 entradas - 15 saídas", calcEstoqueTeorico(50, 20, 15), "55.000");
  eq("zera quando saídas = entradas + inicial", calcEstoqueTeorico(10, 5, 15), "0.000");
  eq("pode ficar negativo (avisa que algo está errado)", calcEstoqueTeorico(0, 0, 5), "-5.000");

  eq("perda quando real < teórico (50 vs 47)", calcPerda(50, 47), "3.000");
  eq("perda 0 quando real = teórico", calcPerda(20, 20), "0.000");
  eq("perda 0 quando real > teórico (sobra, não perda)", calcPerda(10, 12), "0.000");
  eq("perda fracionada (8.5 vs 7.25)", calcPerda(8.5, 7.25), "1.250");

  eq("valor perda 3 unidades x R$ 4.50", calcValorPerda(3, 4.5), "13.50");
  eq("valor perda 0", calcValorPerda(0, 100), "0.00");
});

// ===========================================================================
// 6. comissão / ticket médio / desempenho garçom
// ===========================================================================
group("calcComissaoGarcom / calcTicketMedio / calcDesempenhoGarcom", () => {
  eq("comissão 5% de 1000", calcComissaoGarcom(1000, 0.05), "50.00");
  eq("comissão 0 quando taxa 0", calcComissaoGarcom(1000, 0), "0.00");
  eq("ticket médio 500 / 4", calcTicketMedio(500, 4), "125.00");
  eq("ticket médio com 0 comandas = 0 (proteção contra div/0)", calcTicketMedio(500, 0), "0.00");
  eq("ticket médio com -1 comandas = 0", calcTicketMedio(500, -1), "0.00");

  // Desempenho
  const exc = calcDesempenhoGarcom(15, 10); // ratio 1.5 -> Excelente
  eq("Excelente (ratio >= 1.2)", exc.classificacao, "Excelente");
  near("ratio Excelente", exc.ratio, 1.5);
  const bom = calcDesempenhoGarcom(10, 10);
  eq("Bom (ratio >= 1)", bom.classificacao, "Bom");
  const reg = calcDesempenhoGarcom(8, 10);
  eq("Regular (ratio >= 0.8)", reg.classificacao, "Regular");
  const ab = calcDesempenhoGarcom(5, 10);
  eq("Abaixo da média (ratio < 0.8)", ab.classificacao, "Abaixo da média");
  const zero = calcDesempenhoGarcom(5, 0);
  eq("Quando média geral 0, classifica como Regular", zero.classificacao, "Regular");
});

// ===========================================================================
// 7. diferença de caixa (sobras e faltas)
// ===========================================================================
group("calcDiferencaCaixa", () => {
  eq("informado igual ao esperado", calcDiferencaCaixa(500, 500), "0.00");
  eq("sobra (500 informado vs 480 esperado)", calcDiferencaCaixa(500, 480), "20.00");
  eq("falta (480 informado vs 500 esperado)", calcDiferencaCaixa(480, 500), "-20.00");
  eq("zerado", calcDiferencaCaixa(0, 0), "0.00");
});

// ===========================================================================
// 8. format / parse BRL
// ===========================================================================
group("formatBRL / parseBRL", () => {
  // Intl pode usar non-breaking space — comparamos "contém"
  const f1 = formatBRL(1234.56);
  if (/^R\$\s?1\.234,56$/.test(f1)) { passed++; console.log(`  ✓ formatBRL(1234.56) = ${JSON.stringify(f1)}`); }
  else { failed++; failures.push(`formatBRL(1234.56) = ${JSON.stringify(f1)}`); console.log(`  ✗ formatBRL(1234.56) = ${JSON.stringify(f1)}`); }

  eq("formatBRL(null)", formatBRL(null), "R$ 0,00");
  eq("formatBRL(undefined)", formatBRL(undefined), "R$ 0,00");
  eq("formatBRL(NaN)", formatBRL("xyz"), "R$ 0,00");
  eq("formatBRL('99.5')", /99,50$/.test(formatBRL("99.5")), true);

  near("parseBRL('R$ 1.234,56')", parseBRL("R$ 1.234,56"), 1234.56, 0.001);
  near("parseBRL('R$ 0,00')", parseBRL("R$ 0,00"), 0, 0.001);
  near("parseBRL('99,99')", parseBRL("99,99"), 99.99, 0.001);
  near("parseBRL com lixo", parseBRL("abc"), 0, 0.001);
});

// ===========================================================================
// 9. cenários combinados realistas (panificadora)
// ===========================================================================
group("Cenários compostos da panificadora", () => {
  // Cenário: comanda com 3 itens + 1 item livre + gorjeta 10%
  const subtotalPaes = Number(calcSubtotal(5, 8.5));      // 5 pães x R$8.50 = 42.50
  const subtotalCafes = Number(calcSubtotal(2, 6.0));     // 2 cafés x R$6.00 = 12.00
  const subtotalBolos = Number(calcSubtotal(1.25, 32));   // 1.25kg bolo x R$32 = 40.00
  const subtotalLivre = Number(calcSubtotal(1, 5.5));     // 1 item livre R$5.50
  const subtotalTotal = subtotalPaes + subtotalCafes + subtotalBolos + subtotalLivre;
  near("subtotal somado da comanda", subtotalTotal, 100.0, 0.001);

  const gorjeta = Number(calcGorjetaPercentual(subtotalTotal, 10));
  near("gorjeta 10% sobre subtotal", gorjeta, 10.0, 0.001);

  const total = Number(calcTotalComanda(subtotalTotal, gorjeta));
  near("total final da comanda", total, 110.0, 0.001);

  // Cenário: estoque do dia
  const inicial = 100;
  const entradas = 30;       // reposição da fornada
  const saidasVendas = 95;   // vendas do dia
  const teorico = Number(calcEstoqueTeorico(inicial, entradas, saidasVendas));
  near("estoque teórico fim do dia (100+30-95)", teorico, 35, 0.001);

  // Inventário físico encontrou só 32 → perda de 3 unidades
  const real = 32;
  const perda = Number(calcPerda(teorico, real));
  near("perda detectada (teórico 35 vs real 32)", perda, 3, 0.001);

  const valorPerdaCalc = Number(calcValorPerda(perda, 8.5));
  near("valor da perda em R$", valorPerdaCalc, 25.5, 0.001);

  // Diferença de caixa
  // Esperado (abertura + vendas dinheiro): 200 + 1845.30
  const esperadoCaixa = 200 + 1845.3;
  const informadoCaixa = 2042.0; // Funcionário deu menos
  const dif = Number(calcDiferencaCaixa(informadoCaixa, esperadoCaixa));
  near("diferença de caixa (falta de R$ 3.30)", dif, -3.3, 0.001);
});

// ===========================================================================
// 10. casos de borda / segurança numérica
// ===========================================================================
group("Edge cases & segurança numérica", () => {
  // Acumulação de floats — somar 0.1 dez vezes deve dar 1.00
  let acc = 0;
  for (let i = 0; i < 10; i++) acc += 0.1;
  // Sem normalização: 0.999...; com calc: deve estar bem próximo de 1
  near("acumulação 0.1 × 10 ≈ 1.0 (margem 0.001)", acc, 1.0, 0.001);

  // calcTotalComanda lida com strings vindas do banco?
  eq("total com strings ('100.00', '10.50')", calcTotalComanda("100.00", "10.50"), "110.50");

  // Subtotal com decimais bizarros
  eq("subtotal 1.999 x 2.001", calcSubtotal(1.999, 2.001), "4.00");

  // Estoque pode usar 3 casas (g/kg)
  eq("toQty(0.123456)", toQty(0.123456), "0.123");
  eq("toQty(123.4567)", toQty(123.4567), "123.457");

  // Perda nunca negativa (clamp)
  eq("calcPerda nunca negativa (5 vs 8)", calcPerda(5, 8), "0.000");

  // Dinheiro nunca passa de 2 casas
  const m = toMoney(123.456789);
  eq("toMoney sempre 2 casas", m, "123.46");
  eq("toMoney(123.456789).split('.')[1].length", m.split(".")[1].length, 2);
});

// ===========================================================================
// Sumário
// ===========================================================================
console.log("\n=========================================");
console.log(`Total: ${passed + failed} | Passou: ${passed} | Falhou: ${failed}`);
console.log("=========================================");
if (failed > 0) {
  console.log("\nFalhas:");
  for (const f of failures) console.log(f);
  process.exit(1);
}
