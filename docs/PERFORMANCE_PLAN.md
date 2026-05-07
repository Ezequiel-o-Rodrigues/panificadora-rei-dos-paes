# Plano de aceleração — Panificadora Rei dos Pães (PDV/admin)

## Contexto

Sistema de gestão para panificadora **em produção** (Next.js 15 App Router + Drizzle ORM + Neon Postgres em São Paulo + Auth.js v5). Já tem **app desktop Electron empacotado** funcionando com Next standalone embutido — fala direto com o Neon, independente da Vercel. Briefing completo em [CLAUDE.md](../CLAUDE.md).

**Sintoma:** ações do PDV demoram 2-7 segundos (adicionar item, finalizar comanda, criar comanda). Visível no log `desktop/last-run.log`. A moça do caixa precisa atender com fluidez — alvo é **abaixo de 100ms por clique**.

**Causa raiz:** (a) sem índices nos campos quentes do schema; (b) múltiplos round-trips DB sequenciais por ação; (c) `router.refresh()` re-fetcha a árvore inteira após cada ação; (d) dados estáticos (produtos, categorias, garçons) re-buscados a cada render mesmo nunca mudando.

## Já feito nesta linha — não refazer

- ✅ 1-clique adiciona 1 unidade direto (sem dialog) para produtos contáveis (`un`, `fatia`, `pacote`, `porcao`, `combo`); dialog só pra peso (`kg`, `g`, `litro`, `ml`, `metro`)
- ✅ UI otimista no `adicionarItem`: item aparece na comanda na hora, servidor confirma em background
- ✅ Consolidação de linhas: clicar 8× no pão vira `8 un × R$ 0,80` numa única linha (backend faz UPDATE em row existente, não INSERT)
- ✅ Grid de produtos não trava durante save — caixa pode clicar rápido sem esperar
- ✅ Refresh debounced após adicionar item (rajadas de cliques fazem 1 refresh, não N)
- ✅ App desktop Electron empacotado (`npm run desktop:dist` → `dist-desktop/Painel Padaria Setup 0.1.0.exe`)

Arquivos: [PDVInterface.tsx](../app/(admin)/admin/caixa/_components/PDVInterface.tsx), [_actions.ts](../app/(admin)/admin/caixa/_actions.ts), [desktop/main.cjs](../desktop/main.cjs).

---

## TAREFAS PRIORIZADAS

### TIER 1 — Alto impacto, esforço baixo/médio (fazer primeiro)

#### 1. Adicionar índices ao schema do banco

[db/schema.ts](../db/schema.ts) não tem índice nos campos quentes. Adicionar:

| Tabela | Colunas | Por que |
|--------|---------|---------|
| `comandas` | `(caixa_sessao_id, status)` | listagem de comandas abertas (toda renderização do PDV) |
| `comandas` | `(numero)` | `getProximoNumeroComanda` faz `MAX(numero)` |
| `produtos` | `(ativo, disponivel_hoje)` | listagem do PDV |
| `itens_comanda` | UNIQUE `(comanda_id, produto_id)` | consolidação do `adicionarItem` (precisa pro `ON CONFLICT` da tarefa #2) |
| `itens_comanda` | `(comanda_id)` | recalc de subtotal |
| `caixa_sessoes` | `(status)` | `getSessaoAberta` |

Aplicar via Drizzle: `npm run db:generate` → revisar SQL → `npm run db:push`.

**Métrica de sucesso:** `EXPLAIN ANALYZE` em produção mostra `Index Scan` em vez de `Seq Scan` para essas queries.

#### 2. Reduzir `adicionarItem` de 7 round-trips para 2 (com CTE)

Hoje em [_actions.ts](../app/(admin)/admin/caixa/_actions.ts), o fluxo faz: `findFirst comandas` → `findFirst produtos` → `findFirst itensComanda` → `UPDATE ou INSERT` → `findMany itens` (recalc) → `findMany livres` (recalc) → `UPDATE comandas`. Em Neon-SP a 30ms cada = 210ms só de rede.

Reescrever em SQL puro com 2 queries:

```sql
-- 1ª query: validar + upsert numa CTE (precisa do índice UNIQUE da tarefa #1)
WITH valido AS (
  SELECT c.id AS comanda_id, p.id AS produto_id, p.preco
  FROM comandas c JOIN produtos p ON p.id = $2
  WHERE c.id = $1 AND c.status = 'aberta'
    AND p.ativo AND p.disponivel_hoje
)
INSERT INTO itens_comanda (comanda_id, produto_id, quantidade, preco_unitario, subtotal)
SELECT comanda_id, produto_id, $3, preco, preco * $3 FROM valido
ON CONFLICT (comanda_id, produto_id) DO UPDATE
  SET quantidade = itens_comanda.quantidade + EXCLUDED.quantidade,
      subtotal = (itens_comanda.quantidade + EXCLUDED.quantidade) * itens_comanda.preco_unitario
RETURNING id;

-- 2ª query: recalcular total
UPDATE comandas SET valor_total = (
  COALESCE((SELECT SUM(subtotal) FROM itens_comanda WHERE comanda_id = $1), 0) +
  COALESCE((SELECT SUM(subtotal) FROM itens_livres   WHERE comanda_id = $1), 0)
) WHERE id = $1;
```

Drizzle suporta `db.execute(sql\`...\`)` pra SQL puro. Manter o action retornando `ActionResult` igual hoje.

**Métrica de sucesso:** `adicionarItem` cai de ~500ms para <100ms (medido com `console.time`).

#### 3. Cachear dados estáticos com `unstable_cache` + tags

[_queries.ts](../app/(admin)/admin/caixa/_queries.ts) re-executa `getProdutosParaPDV`, `getCategoriasComProdutos`, `getGarconsAtivos`, `getConfigGorjeta` a cada renderização. Esses dados mudam **raramente** (só quando admin edita).

Aplicar:

```ts
import { unstable_cache } from 'next/cache';

export const getProdutosParaPDV = unstable_cache(
  async () => { /* query atual */ },
  ['produtos-pdv'],
  { tags: ['produtos'], revalidate: 3600 }
);
```

E nas actions que editam (`app/(admin)/admin/produtos/_actions.ts`, `categorias/_actions.ts`, `configuracoes/_actions.ts`):

```ts
import { revalidateTag } from 'next/cache';
revalidateTag('produtos');     // após editar/criar/deletar produto
revalidateTag('categorias');   // idem categoria
revalidateTag('garcons');      // idem garçom
revalidateTag('config-gorjeta'); // após mudar config
```

**Métrica de sucesso:** página `/admin/caixa/[sessaoId]` no Network do DevTools fetcha só comandas. Produtos/categorias/garçons vêm do cache (verificar com log/timestamp).

---

### TIER 2 — Médio impacto

#### 4. Eliminar `router.refresh()` em ações de comanda

Hoje a `quickAddProduto` em [PDVInterface.tsx](../app/(admin)/admin/caixa/_components/PDVInterface.tsx) chama `router.refresh()` (debounced) após sucesso, que re-renderiza a página inteira no servidor. Substituir por:

- Server actions retornam a comanda atualizada (não só `{success}`)
- Cliente faz `setComandasAbertas(prev => merge(prev, retorno))` em vez de refresh
- `router.refresh()` só ao criar/cancelar comanda (mudança estrutural rara)

Mexer também em: `removerItemComanda`, `removerItemLivre`, `atualizarGarcomComanda`.

**Métrica de sucesso:** após adicionar item, nenhum GET aparece no Network — só o POST.

#### 5. WebSocket Pool driver no modo desktop

[db/index.ts](../db/index.ts) usa `drizzle-orm/neon-http` (handshake TLS por query). Em modo desktop (processo persistente, não serverless), `drizzle-orm/neon-serverless` (WebSocket Pool) reaproveita conexões.

Decidir via env:
```ts
const isDesktop = process.env.BUILD_TARGET === 'desktop' || !!process.env.ELECTRON_RUN_AS_NODE;
```

Manter HTTP no Vercel (funções serverless são curtas, pool não ajuda).

**Métrica de sucesso:** ações no desktop ficam 50-100ms mais rápidas — handshake amortizado.

---

### TIER 3 — Polish (depois)

6. **Streaming + Suspense** em `/admin/caixa/[sessaoId]/page.tsx` — shell aparece imediato, dados streamados
7. **Instrumentação** — `console.time`/`timeEnd` em todos os server actions, exportar métricas
8. **Splash screen** Electron enquanto Next standalone sobe (3-5s de tela preta hoje)

---

## Como medir antes/depois

Após cada tarefa:

1. Abrir DevTools → Network em `/admin/caixa/[sessaoId]` (modo desktop ou web)
2. Adicionar 10 produtos rapidamente
3. Anotar tempo total + tempo por POST `/admin/caixa/[sessaoId]`
4. Comparar com baseline em [desktop/last-run.log](../desktop/last-run.log) (POSTs hoje variam de 2-7s)

**Alvo final:** cada `adicionarItem` < 100ms da clicada até item confirmed.

---

## Restrições

- ❌ Não introduzir libs novas pesadas (stack está em [package.json](../package.json))
- ❌ Não quebrar Auth.js v5 — testar `/admin` com user não-logado e logado depois de cada mudança
- ❌ Não voltar pra paleta antiga (cream/bread/wood/dourado) — usar onyx/flame/rust/ivory
- ❌ Não tocar em estoque/finalização sem ler regras do PHP antigo em `c:\Users\EZEQUIEL\Documents\p-rojetos\sitemacaixa.cardapio` (fonte de verdade das regras de negócio)
- ✅ Manter mobile-first (PDV usa em tablet também)
- ✅ Sempre `npm run typecheck` + `npm run desktop:build` antes de commitar
- ✅ Confirmar com Ezequiel antes de ações com blast radius (drop tabela, force-push, mudar env vars de prod)

---

## Arquivos centrais

| Arquivo | Para qual tarefa |
|---------|------------------|
| [db/schema.ts](../db/schema.ts) | #1 índices |
| [db/index.ts](../db/index.ts) | #5 driver WebSocket no desktop |
| [app/(admin)/admin/caixa/_actions.ts](../app/(admin)/admin/caixa/_actions.ts) | #2 SQL puro, #4 retornar estado |
| [app/(admin)/admin/caixa/_queries.ts](../app/(admin)/admin/caixa/_queries.ts) | #3 unstable_cache |
| [app/(admin)/admin/caixa/_components/PDVInterface.tsx](../app/(admin)/admin/caixa/_components/PDVInterface.tsx) | #4 remover router.refresh |
| [app/(admin)/admin/produtos/_actions.ts](../app/(admin)/admin/produtos/_actions.ts) | #3 revalidateTag('produtos') |
| [app/(admin)/admin/categorias/_actions.ts](../app/(admin)/admin/categorias/_actions.ts) | #3 revalidateTag('categorias') |
| [CLAUDE.md](../CLAUDE.md) | briefing geral do projeto |

---

**Ordem sugerida de execução:** 1 → 2 → 3 (Tier 1 todo). Validar com métrica antes de seguir pro Tier 2. Se PDV ficar imperceptível pro caixa, parar — Tier 2 e 3 só se ainda houver atrito perceptível.
