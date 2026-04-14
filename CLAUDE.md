# Panificadora Rei dos Pães — Briefing de continuação

Você está retomando o desenvolvimento de um sistema completo de gestão para panificadora. O projeto **já está em produção** e tem dois colaboradores trabalhando nele de máquinas diferentes (uma em casa, outra no trabalho). Quando uma máquina termina uma sessão, ela atualiza este arquivo se algo importante mudou.

## Onde tudo está

- **Diretório local**: `c:\Users\EZEQUIEL\Documents\p-rojetos\panificadora\panificadora-rei-dos-paes`
- **Repositório**: https://github.com/Ezequiel-o-Rodrigues/panificadora-rei-dos-paes (branch `main`)
- **Produção (no ar agora)**: https://reidospaes.ezzedev.com.br
- **Banco**: Neon PostgreSQL (`neondb_owner@ep-withered-bird-amciydr9-pooler.c-5.us-east-1.aws.neon.tech/neondb`)
- **Deploy**: Vercel (auto-deploy a cada `git push origin main`)
- **DNS**: domínio `ezzedev.com.br` no Cloudflare → CNAME `reidospaes` (DNS only) → Vercel
- **Storage de imagens**: Vercel Blob (com fallback para filesystem local em dev)

## Stack

- **Next.js 15.5** App Router + **React 19** + **TypeScript** + **Tailwind CSS v4** (CSS-first, sem `tailwind.config.ts`)
- **Drizzle ORM** + `@neondatabase/serverless` (HTTP driver)
- **Auth.js v5 (next-auth@beta)** com Credentials provider, JWT, perfis `admin`/`usuario`
- **Framer Motion**, **React Three Fiber + drei**, **Vaul** (sheets), **Embla Carousel**, **Recharts**
- **lucide-react v1.x** (⚠️ removeu ícones de marca — Instagram precisou virar SVG inline em [components/shared/icons.tsx](components/shared/icons.tsx))
- **bcryptjs** para hash de senhas
- **@vercel/blob** para upload de imagens em produção

## Como rodar localmente

```bash
git pull origin main
npm install                     # @vercel/blob é dep relativamente nova
cp .env.local.example .env.local
# Edite .env.local — veja seção CREDENCIAIS abaixo
npm run db:push                 # se houver mudanças de schema
npm run dev                     # abre em http://localhost:3000
```

Scripts disponíveis: `dev`, `build`, `lint`, `typecheck`, `db:generate`, `db:push`, `db:studio`, `db:seed` (este último usa `tsx --env-file=.env.local`).

## ⚠️ CREDENCIAIS — rotacionadas, IMPORTANTE

A senha do banco Neon e a senha do admin foram **rotacionadas** por motivo de segurança (foram expostas em chat durante o setup inicial). Para setup local você precisa:

1. **DATABASE_URL nova**: entre em https://console.neon.tech → projeto `neondb` → Dashboard → Connection Details → copie a connection string atual e cole em `.env.local` no campo `DATABASE_URL`
2. **Senha do admin**: o usuário (Ezequiel) sabe a nova senha de cabeça. Se precisar usar para teste local, peça a ele. Se precisar resetar, rode no Neon SQL Editor: `DELETE FROM usuarios WHERE email='ezequiel@reidospaes.com.br';` e depois `npm run db:seed` com nova `SEED_ADMIN_PASSWORD` no `.env.local`
3. **Vercel já tem as env vars corretas em produção** — não mexe se não precisar. Se precisar, vai em Settings → Environment Variables.

Variáveis essenciais no `.env.local`:
```
DATABASE_URL="<nova connection string do Neon>"
AUTH_SECRET="<gerar com openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
BLOB_READ_WRITE_TOKEN=""        # vazio em dev (cai pra fs local)
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_WHATSAPP="5564992070004"
NEXT_PUBLIC_ENABLE_3D="true"
SEED_ADMIN_EMAIL="ezequiel@reidospaes.com.br"
SEED_ADMIN_PASSWORD="<nova senha>"
```

## Identidade visual oficial

A marca é **dark + laranja vivo + vermelho brasa**, baseada em fotos da loja real. Tokens em [app/globals.css](app/globals.css):

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
├─ admin/           Button, Card, DataTable, Dialog, Sidebar, etc (shadcn-like manual)
├─ public/          SiteHeader, SiteFooter
└─ shared/          Logo (com fs.existsSync para logo.png), ProductImage, icons (InstagramIcon)
db/
├─ schema.ts        12 tabelas + 6 enums + relations + types
├─ index.ts         drizzle client
├─ seed.ts          admin + 6 categorias + 9 produtos + 8 configs
└─ migrations/      0000_early_chat.sql + init-neon.sql
lib/
├─ auth.ts, auth.config.ts        Auth.js v5
├─ upload.ts        Vercel Blob com fallback local — saveProductImage/deleteProductImage
├─ session.ts, slugify.ts, calculations.ts, money.ts, dates.ts, utils.ts
└─ validators/      zod schemas por entidade
middleware.ts       protege /admin
```

## O que ESTÁ feito (não refaz)

### Site público (mobile-first, dark theme)
- Landing `/` com hero animado, blob pulsante, badge "Fornada quente"
- `/cardapio` com produtos reais do Neon, cards com imagem (ProductImage), badge TOP, gradientes flame
- `/sobre` e `/contato` (placeholders simples — pode melhorar)

### Admin completo (todas rotas funcionam, com queries reais)
- **Dashboard** `/admin` com 4 KPIs (vendas hoje, comandas abertas, produtos ativos, estoque crítico) + 3 charts (vendas 7d, top categorias, vendas mensais) + lista de comandas recentes
- **PDV/Caixa** `/admin/caixa` — abrir sessão, PDVInterface com busca de produtos, item livre, finalizar comanda (6 formas pgto + gorjeta), fechar caixa com diferença esperado vs informado
- **Comandas** `/admin/comandas` — lista, filtros (status/garçom/forma pgto/período), detalhe `[id]` com cancelamento
- **Produtos** `/admin/produtos` — CRUD com upload de imagem (lib/upload.ts → Vercel Blob)
- **Categorias** `/admin/categorias` — CRUD com ordem
- **Estoque** `/admin/estoque` (+ entrada, inventário, perdas) — inventário físico gera perda automática
- **Relatórios** `/admin/relatorios` (+ vendas, produtos, garçons, estoque) — gráficos Recharts + exportação CSV
- **Usuários** `/admin/usuarios` — CRUD com perfis admin/usuario
- **Configurações** `/admin/configuracoes` — white-label, gorjeta, garçons (CRUD)

### Schema do banco (12 tabelas)
`usuarios`, `categorias`, `produtos`, `garcons`, `caixa_sessoes`, `comandas`, `itens_comanda`, `itens_livres`, `movimentacoes_estoque`, `perdas_estoque`, `comprovantes_venda`, `configuracoes_sistema` — todas com relations e tipos inferidos. Enums: `perfil_usuario`, `unidade_medida`, `status_comanda`, `tipo_movimentacao`, `status_caixa`, `forma_pagamento`.

### Deploy
- Vercel + Neon + Vercel Blob configurados
- Domínio `reidospaes.ezzedev.com.br` com SSL automático
- CNAME no Cloudflare (DNS only, não Proxied)
- Auto-deploy a cada push na main
- Detalhes em [DEPLOY.md](DEPLOY.md)

### Material de venda
[README.md](README.md) é uma **carta de venda / outdoor comercial** (não é README técnico). Tem ROI, objeções, roteiro de demo, frases prontas — uso comercial pelo Ezequiel. **Não sobrescrever** sem combinar antes.

## Próximos passos sugeridos (escolher com o usuário)

### Não-bloqueantes / cosmético
1. **Salvar logo oficial** em `public/images/logo.png` — o componente [Logo](components/shared/Logo.tsx) já checa via `fs.existsSync` e troca o SVG fallback automaticamente
2. **Botão de logout** no admin (sidebar ou header)
3. **Páginas /sobre e /contato** — desenhar com história, fotos da loja, mapa, formulário

### Features novas (Fase 4+)
4. **Camada 3D no hero** — Three.js / R3F com pães flutuantes, parallax, modelos .glb (Fase 4 do plano original)
5. **Módulo de Produção Diária** — sugerir fornada do dia seguinte com base no histórico de vendas dos últimos 7-30 dias por produto. Não existe ainda, foi pedido pelo cliente como feature de venda
6. **NFC-e** — emissão de nota fiscal eletrônica (integração SEFAZ via API)
7. **Pagamento online** — cliente pagar pelo cardápio (Pagar.me, Stripe, Mercado Pago)
8. **Fidelidade / cashback** — programa de pontos por cliente
9. **Delivery integrado** — pedido pelo cardápio + roteirização

### Manutenção
10. Adicionar **logout** no admin
11. Cadastrar **produtos reais da loja** (substituir os 9 de exemplo do seed)
12. Configurar dados reais em `/admin/configuracoes` (endereço, WhatsApp 64 99207-0004, horário real)
13. Trocar `NEXT_PUBLIC_WHATSAPP` na Vercel pelo `5564992070004`

## Regras de ouro deste projeto

1. **Não inventar features** — se o usuário pede algo, primeiro pesquise se já existe no código (Grep/Glob). O sistema é robusto e quase tudo do PDV/admin já está pronto
2. **Mobile-first sempre** — base 375px, desktop é progressive enhancement
3. **Sem voltar pra paleta antiga** — onyx/flame/rust/ivory, não cream/bread/wood
4. **Não mudar `lucide-react`** sem necessidade — a v1.x quebra ícones de marca, use SVG inline
5. **Upload sempre via `lib/upload.ts`** — interface `saveProductImage`/`deleteProductImage`. Não importar `@vercel/blob` direto em outros lugares
6. **Server actions com try/catch de `AuthError`** — veja [app/login/page.tsx](app/login/page.tsx) como referência
7. **Antes de commit/push** — sempre `npm run typecheck` e `npm run build` localmente
8. **Decisões com blast radius** (deletar dados, force-push, mudar env vars de prod, dropar tabelas) — confirmar com o usuário antes
9. **`.env.local` nunca vai pro git** — `.env.local.example` sim
10. **Sistema sitemacaixa.cardapio (PHP antigo) em `c:\Users\EZEQUIEL\Documents\p-rojetos\sitemacaixa.cardapio`** — fonte de verdade das regras de negócio se houver dúvida sobre comportamento de comanda/estoque/perdas

## Contato do dono

- **Ezequiel** (dono e dev do projeto)
- WhatsApp: `64 99207-0004`
- Email: `ezequielrod2020@gmail.com`
- Instagram do estabelecimento: `@reidospaes_1`
- GitHub: `Ezequiel-o-Rodrigues`

## Sua primeira ação ao retomar este projeto

1. Faça `git pull origin main` para sincronizar
2. `npm install` (caso haja dep nova adicionada na outra máquina)
3. Atualize o `.env.local` com a `DATABASE_URL` atual do Neon (peça a senha do admin atual ao Ezequiel se precisar)
4. Rode `npm run dev` e abra http://localhost:3000 — confirme que tudo carrega
5. Pergunte ao Ezequiel **qual dos próximos passos** ele quer atacar primeiro

Mantenha a qualidade alta, o código limpo, e sempre consulte o usuário antes de decisões grandes. Quando concluir uma sessão importante, atualize este arquivo (`CLAUDE.md`) com o que mudou para a próxima máquina não ficar no escuro.
