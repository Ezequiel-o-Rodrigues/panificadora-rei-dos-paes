# Panificadora Rei dos Pães — Briefing de continuação

Sistema completo de gestão para panificadora. **Em produção** com a padaria do dono (Ezequiel) usando o sistema. Dois colaboradores em máquinas diferentes (casa + trabalho). Atualize este arquivo a cada sessão importante.

---

## 🚧 Estado em 2026-05-07 — leia antes de qualquer coisa

Tem duas frentes em paralelo. Antes de partir pra qualquer outro trabalho, cheque onde estão.

### Frente 1 — Migração do banco (Neon `us-east-1` → `sa-east-1`)

Motivação: PDV está lento (POSTs ~3-4s) porque o DB está em Virginia e cada query atravessa o Atlântico (~200ms RTT). São Paulo deve cair pra ~30ms.

Onde estamos:
- ✅ Projeto Neon novo `sistema_PDV` criado em `aws-sa-east-1`
- ✅ Import via "Import data" do Neon completou (branch `import-2026-05-07T...`, compute `ep-calm-tree-ac5odvve`)
- ⏳ **Falta**: rodar `npm run migrate:validate` (compara contagem de linhas), trocar `DATABASE_URL` no `.env.local` + Vercel, redeploy, monitorar 24-48h
- 📅 Só deletar projeto antigo após 1 semana sem incidente

### Frente 2 — App desktop (Electron)

Modelo de venda: NÃO é SaaS multi-tenant. É **instalação independente por cliente** — cada padaria tem DB próprio, cardápio próprio em subdomínio sob `ezzedev.com.br`, e admin desktop instalado no PC dela. Ezequiel vai pessoalmente na loja instalar.

Onde estamos:
- ✅ **Phase 1 (dev mode)**: `npm run desktop:dev` abre janela do admin (Electron 33 + concurrently com Next.js dev). Atalho na área de trabalho via VBS wrapper (sem terminal, sem DevTools).
- ⏳ **Phase 2 (produção)**: build de produção com electron-builder, instalador NSIS, auto-update via electron-updater, first-run config wizard (`%APPDATA%\PadariaApp\config.json`), spawn do Next.js standalone embutido. **Ainda não iniciada.**
- ⏳ **Phase 3 (cardápio multi-cliente)**: deploy do cardápio público em Cloudflare Pages com `APP_MODE=public`, refator do middleware pra honrar APP_MODE. **Ainda não iniciada.**

Detalhes estratégicos (per-client install, evitar Vercel Pro, escolha de stack) ficam nas memórias persistentes do Claude em `memory/MEMORY.md`.

---

## Onde tudo está

- **Diretório local**: `c:\Users\EZEQUIEL\Documents\p-rojetos\panificadora\panificadora-rei-dos-paes`
- **Repositório**: https://github.com/Ezequiel-o-Rodrigues/panificadora-rei-dos-paes (branch `main`)
- **Produção web (no ar)**: https://reidospaes.ezzedev.com.br
- **Banco ativo (us-east-1)**: Neon `ep-withered-bird-amciydr9-pooler.c-5.us-east-1.aws.neon.tech` — usado pela Vercel até a migração ser virada
- **Banco novo (sa-east-1)**: Neon projeto `sistema_PDV`, compute `ep-calm-tree-ac5odvve` — recebeu o import; ainda não é o ativo
- **Deploy web**: Vercel (auto-deploy a cada `git push origin main`)
- **DNS**: domínio `ezzedev.com.br` no Cloudflare → CNAME `reidospaes` (DNS only) → Vercel
- **Storage de imagens**: Vercel Blob (com fallback para filesystem local em dev)

## Stack

### Web
- **Next.js 15.5** App Router + **React 19** + **TypeScript** + **Tailwind CSS v4** (CSS-first, sem `tailwind.config.ts`)
- **Drizzle ORM** + `@neondatabase/serverless` (HTTP driver via `drizzle-orm/neon-http`. Avaliar trocar pra WebSocket Pool em modo desktop pra cortar handshake por query — está nos próximos passos)
- **Auth.js v5 (next-auth@beta)** com Credentials provider, JWT, perfis `admin`/`usuario`
- **Framer Motion**, **React Three Fiber + drei**, **Vaul** (sheets), **Embla Carousel**, **Recharts**
- **lucide-react v1.x** (⚠️ removeu ícones de marca — Instagram precisou virar SVG inline em [components/shared/icons.tsx](components/shared/icons.tsx))
- **bcryptjs** para hash de senhas
- **@vercel/blob** para upload de imagens em produção

### Desktop (Phase 1)
- **Electron 33** (devDep) — janela nativa
- **electron-builder** (devDep) — packaging futuro pra Phase 2
- **concurrently** + **wait-on** (devDeps) — orquestrar Next.js dev + Electron juntos

## Como rodar localmente

```bash
git pull origin main
npm install                     # tem deps novas (Electron etc)
cp .env.local.example .env.local
# Edite .env.local — veja seção CREDENCIAIS abaixo
npm run db:push                 # se houver mudanças de schema
npm run dev                     # web em http://localhost:3000
npm run desktop:dev             # mesma coisa, mas com janela Electron + admin
```

Scripts: `dev`, `build`, `lint`, `typecheck`, `db:generate`, `db:push`, `db:studio`, `db:seed`, `desktop:dev`, `migrate:validate`.

## ⚠️ CREDENCIAIS — múltiplas exposições, IMPORTANTE rotacionar

A senha do banco Neon e do admin já foram rotacionadas uma vez por motivo de segurança (foram expostas em chat no setup inicial). Em **2026-05-07** mais duas senhas foram expostas em screenshots durante a migração:
- Senha do DB antigo (`us-east-1`) — rotaciona quando descomissionar o projeto antigo
- Senha do DB novo (`sa-east-1`, projeto `sistema_PDV`) — **rotacionar logo após a migração estar estável**

Para setup local você precisa:

1. **DATABASE_URL atual**: console.neon.tech → projeto certo → Connection Details → copia connection string (com pooler ON)
2. **Senha do admin**: Ezequiel sabe de cabeça. Se precisar resetar, no Neon SQL Editor: `DELETE FROM usuarios WHERE email='ezequiel@reidospaes.com.br';` depois `npm run db:seed` com nova `SEED_ADMIN_PASSWORD` no `.env.local`
3. **Vercel já tem env vars corretas em produção** — não mexa sem necessidade

Variáveis essenciais no `.env.local`:
```
DATABASE_URL="<connection string atual do Neon>"     # us-east-1 enquanto a migração não vira
DATABASE_URL_NEW="<connection string do sa-east-1>"  # só durante migração; remova depois
AUTH_SECRET="<gerar com openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
BLOB_READ_WRITE_TOKEN=""        # vazio em dev (cai pra fs local)
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_WHATSAPP="5564992070004"
NEXT_PUBLIC_ENABLE_3D="true"
SEED_ADMIN_EMAIL="ezequiel@reidospaes.com.br"
SEED_ADMIN_PASSWORD="<senha>"
APP_MODE=""                     # "admin" no PC do cliente, "public" no CF Pages, vazio em dev
NEXT_PUBLIC_PUBLIC_URL="http://localhost:3000"  # URL do cardápio público do cliente
```

## Identidade visual oficial

Marca **dark + laranja vivo + vermelho brasa**, baseada em fotos da loja real. Tokens em [app/globals.css](app/globals.css):

- **`onyx`** (preto/carvão quente): fundos
- **`flame`** (laranja `#ff6d0a`, cor do logo): primária, CTAs, destaques
- **`rust`** (vermelho `#dc2626`): acentos, gradientes com flame
- **`ivory`** (`#fafaf5`): texto sobre escuro

Utilitários: `.glass`, `.text-gradient-flame`, `.shadow-flame`, `.animate-flicker`.
Fontes: **Fraunces** (display, classe `.font-display`) + **Inter** (sans).
Instagram oficial: **@reidospaes_1**

⚠️ **NUNCA volte para a paleta antiga** (cream/bread/wood/dourado). Foi rejeitada pelo cliente. A marca real é dark com calor de forno.

## Estrutura de pastas

```
app/
├─ (public)/        layout, page (landing), cardapio, sobre, contato
├─ (admin)/         layout (sidebar + auth guard) + admin/{caixa,comandas,produtos,categorias,estoque,relatorios,usuarios,configuracoes}
├─ api/auth/[...nextauth]/route.ts
├─ login/page.tsx   server action handleLogin com try/catch AuthError
├─ globals.css      tema completo (onyx/flame/rust/ivory)
└─ layout.tsx       fonts + metadata + Toaster
components/
├─ admin/           Button, Card, DataTable, Dialog, Sidebar (shadcn-like manual)
├─ public/          SiteHeader, SiteFooter
└─ shared/          Logo, ProductImage, icons (InstagramIcon)
db/
├─ schema.ts        12 tabelas + 6 enums + relations + types
├─ index.ts         drizzle client (neon-http)
├─ seed.ts          admin + 6 categorias + 9 produtos + 8 configs
└─ migrations/      0000_early_chat.sql + init-neon.sql
desktop/                   # Phase 1 do app desktop
├─ main.cjs                Electron main process (janela 1280x800, F12 toggle DevTools)
├─ launch.cjs              Workaround pro bug ELECTRON_RUN_AS_NODE leakado pelo VSCode
├─ start-dev.bat           Wrapper do `npm run desktop:dev` (output em last-run.log)
└─ start-dev.vbs           VBS roda o .bat com janela escondida — target do atalho na área de trabalho
scripts/
└─ validate-migration.ts   compara contagem por tabela entre DATABASE_URL e DATABASE_URL_NEW
lib/
├─ auth.ts, auth.config.ts
├─ upload.ts                Vercel Blob com fallback local
├─ session.ts, slugify.ts, calculations.ts, money.ts, dates.ts, utils.ts
└─ validators/              zod schemas por entidade
middleware.ts               protege /admin (vai precisar evoluir pra honrar APP_MODE em Phase 3)
next.config.ts              output: 'standalone' ativa SO em BUILD_TARGET=desktop (não afeta Vercel)
```

## O que ESTÁ feito (não refaz)

### Site público (mobile-first, dark theme)
- Landing `/` com hero animado, blob pulsante, badge "Fornada quente"
- `/cardapio` com produtos reais do Neon, cards com imagem (ProductImage), badge TOP, gradientes flame
- `/sobre` e `/contato` (placeholders simples — pode melhorar)

### Admin completo (todas rotas funcionam, com queries reais)
- **Dashboard** `/admin` com 4 KPIs + 3 charts + comandas recentes
- **PDV/Caixa** `/admin/caixa` — abrir sessão, PDVInterface, finalizar comanda (6 formas pgto + gorjeta), fechar caixa com diferença esperado vs informado
- **Comandas** `/admin/comandas` — lista, filtros, detalhe `[id]` com cancelamento
- **Produtos** `/admin/produtos` — CRUD com upload via [lib/upload.ts](lib/upload.ts)
- **Categorias** `/admin/categorias` — CRUD com ordem
- **Estoque** `/admin/estoque` (+ entrada, inventário, perdas)
- **Relatórios** `/admin/relatorios` (+ vendas, produtos, garçons, estoque) — Recharts + CSV
- **Usuários** `/admin/usuarios` — CRUD com perfis admin/usuario
- **Configurações** `/admin/configuracoes` — white-label, gorjeta, garçons (CRUD)

### Schema do banco (12 tabelas)
`usuarios`, `categorias`, `produtos`, `garcons`, `caixa_sessoes`, `comandas`, `itens_comanda`, `itens_livres`, `movimentacoes_estoque`, `perdas_estoque`, `comprovantes_venda`, `configuracoes_sistema` — todas com relations e tipos inferidos. Enums: `perfil_usuario`, `unidade_medida`, `status_comanda`, `tipo_movimentacao`, `status_caixa`, `forma_pagamento`.

### Deploy web
- Vercel + Neon + Vercel Blob configurados, domínio com SSL automático, auto-deploy
- Detalhes em [DEPLOY.md](DEPLOY.md)

### App desktop — Phase 1 (dev mode funcional)
- `npm run desktop:dev` abre janela do admin (Electron 33 com Next.js dev rodando junto via concurrently)
- F12 toggle DevTools (não abrem por padrão — clientes não veem DevTools nem terminal)
- Atalho na área de trabalho via VBS wrapper (sem terminal visível). Target: `wscript.exe "...desktop\start-dev.vbs"`
- **Hack importante**: VSCode/Claude Code propagam `ELECTRON_RUN_AS_NODE=1` pra child processes, fazendo electron rodar em modo Node em vez de modo app. [desktop/launch.cjs](desktop/launch.cjs) deleta essa env var antes de spawnar Electron. **Não remover esse launcher.**

### Migração de banco (em andamento — vide topo)
- Projeto Neon novo em `sa-east-1` criado e populado via "Import data". Falta validar e virar.

### Material de venda
[README.md](README.md) é uma **carta de venda / outdoor comercial** (não é README técnico). Tem ROI, objeções, roteiro de demo, frases prontas — uso comercial pelo Ezequiel. **Não sobrescrever** sem combinar antes.

## Próximos passos priorizados

### 🔥 Bloqueadores / em andamento
1. **Fechar a migração de banco** (Frente 1 acima): `npm run migrate:validate` → trocar URL `.env.local` → testar local → trocar URL Vercel → Redeploy → monitorar
2. **Phase 2 do app desktop**: build de produção com electron-builder
   - `BUILD_TARGET=desktop next build` produzindo standalone bundle
   - `electron-builder.yml` com NSIS, ícone próprio, info da padaria
   - Spawnar Next.js standalone server dentro do Electron em produção (em dev é `next dev`)
   - First-run config wizard: tela inicial pedindo `DATABASE_URL` e nome da padaria, persiste em `%APPDATA%\PadariaApp\config.json`
   - Auto-update via electron-updater + GitHub Releases (repo privado)

### Performance (depois da migração de região)
3. Trocar driver Neon de HTTP pra **WebSocket Pool** em modo desktop — corta handshake por query
4. Adicionar script `desktop:start` que roda **build de produção** + Electron (em vez de `next dev`) — runtime 30-50% mais rápido

### Phase 3 — cardápio público multi-cliente
5. Configurar Cloudflare Pages com `APP_MODE=public` pra deploy de cardápios públicos por subdomínio (`padariaX.ezzedev.com.br`, cada um com env vars próprias)
6. Refatorar [middleware.ts](middleware.ts) pra honrar `APP_MODE`: bloquear `/admin` no deploy public, redirecionar páginas públicas no deploy admin

### Cosmético / polish
7. Logo oficial em `public/images/logo.png` ([Logo](components/shared/Logo.tsx) já checa via `fs.existsSync` e troca o SVG fallback)
8. Botão de logout no admin (sidebar ou header)
9. Páginas /sobre e /contato — desenhar com história, fotos da loja, mapa, formulário

### Features novas (sem ordem fixa, escolher com cliente)
- Camada 3D no hero — Three.js / R3F com pães flutuantes (Fase 4 do plano original)
- Módulo de Produção Diária — sugerir fornada do dia seguinte com base no histórico de vendas
- NFC-e (integração SEFAZ via API)
- Pagamento online (Pagar.me, Stripe, Mercado Pago)
- Fidelidade / cashback
- Delivery integrado

### Manutenção
- Cadastrar produtos reais (substituir 9 do seed)
- Configurar dados reais em `/admin/configuracoes`
- Trocar `NEXT_PUBLIC_WHATSAPP` na Vercel pelo `5564992070004`

## Regras de ouro deste projeto

1. **Não inventar features** — se o usuário pede algo, primeiro pesquise se já existe (Grep/Glob). O sistema é robusto e quase tudo do PDV/admin já está pronto
2. **Mobile-first sempre** — base 375px, desktop é progressive enhancement
3. **Sem voltar pra paleta antiga** — onyx/flame/rust/ivory, não cream/bread/wood
4. **Não mudar `lucide-react`** sem necessidade — v1.x quebra ícones de marca, use SVG inline
5. **Upload sempre via [lib/upload.ts](lib/upload.ts)** — interface `saveProductImage`/`deleteProductImage`. Não importar `@vercel/blob` direto em outros lugares
6. **Server actions com try/catch de `AuthError`** — veja [app/login/page.tsx](app/login/page.tsx) como referência
7. **Antes de commit/push** — sempre `npm run typecheck` e `npm run build` localmente
8. **Decisões com blast radius** (deletar dados, force-push, mudar env vars de prod, dropar tabelas, virar `DATABASE_URL` em produção) — confirmar com o usuário antes
9. **`.env.local` nunca vai pro git** — `.env.local.example` sim
10. **Sistema sitemacaixa.cardapio (PHP antigo) em `c:\Users\EZEQUIEL\Documents\p-rojetos\sitemacaixa.cardapio`** — fonte de verdade das regras de negócio se houver dúvida sobre comportamento de comanda/estoque/perdas
11. **Modelo de venda é per-client install, não SaaS multi-tenant** — não introduzir `tenant_id` no schema. Cada cliente é deploy independente.
12. **App desktop em Phase 1 NUNCA tem aplicação bundled** — é wrapper que aponta pra `localhost:3000` rodando `next dev`. Phase 2 vai bundlar Next.js standalone via electron-builder. Auto-update mantém clientes atualizados sem visita à loja.
13. **Cuidado com credenciais em chat** — múltiplas senhas já vazaram em screenshots/snippets. Sempre rotacionar após exposição.

## Contato do dono

- **Ezequiel** (dono e dev do projeto)
- WhatsApp: `64 99207-0004`
- Email: `ezequielrod2020@gmail.com`
- Instagram do estabelecimento: `@reidospaes_1`
- GitHub: `Ezequiel-o-Rodrigues`

## Sua primeira ação ao retomar este projeto

1. Faça `git pull origin main`
2. `npm install` (sempre — pode ter dep nova adicionada na outra máquina)
3. **Cheque o estado das duas frentes** (seção no topo deste arquivo):
   - Migração: `.env.local` aponta pra `sa-east-1`? Vercel idem? Migração concluída. Apontando pra `us-east-1`? Pendente — terminar primeiro com `npm run migrate:validate`.
   - Desktop: rodar `npm run desktop:dev` deve abrir janela. Se ainda em Phase 1, sem instalador.
4. Atualize o `.env.local` conforme [.env.local.example](.env.local.example)
5. Rode o ambiente apropriado:
   - `npm run dev` para trabalho web
   - `npm run desktop:dev` para trabalhar no app desktop
6. **Pergunte ao Ezequiel qual dos próximos passos** atacar primeiro

Mantenha qualidade alta, código limpo, e sempre consulte o usuário antes de decisões grandes. Quando concluir uma sessão importante, **atualize este arquivo (`CLAUDE.md`)** com o que mudou para a próxima máquina não ficar no escuro.
