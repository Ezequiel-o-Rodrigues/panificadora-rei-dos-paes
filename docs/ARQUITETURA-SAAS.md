# Arquitetura SaaS — PDV Multi-Segmento

Este documento explica como o sistema funciona como SaaS vendável para múltiplos estabelecimentos food service.

---

## Visão geral

O sistema é um **PDV (ponto de venda) genérico** que atende panificadoras, churrascarias, lanchonetes, restaurantes, pizzarias e cafeterias. O mesmo código fonte serve todos os clientes — a única coisa que muda entre eles são as **variáveis de ambiente** e o **banco de dados**.

```
SEU REPOSITÓRIO TEMPLATE (o molde)
        │
        ├──> Clone 1: reidospaes.ezzedevs.com     (padaria)
        │    └── DB Neon próprio
        │    └── Env vars: nome="Rei dos Pães", segmento="panificadora"
        │
        ├──> Clone 2: churrascariadoze.ezzedevs.com (churrascaria)
        │    └── DB Neon próprio
        │    └── Env vars: nome="Churrascaria do Zé", segmento="churrascaria"
        │
        └──> Clone 3: pizzadopedro.ezzedevs.com    (pizzaria)
             └── DB Neon próprio
             └── Env vars: nome="Pizza do Pedro", segmento="pizzaria"
```

Cada cliente é **um deploy independente na Vercel**, com **seu próprio banco no Neon**. O código é idêntico.

---

## Como o TENANT_CONFIG funciona

O arquivo `lib/config/tenant.ts` é o cérebro da identidade do sistema:

```
ENV VAR existe?  ──sim──>  usa o valor da env var
                  │
                  não
                  │
                  v
            usa o default (que é "Panificadora Rei dos Pães")
```

Quando você seta `NEXT_PUBLIC_TENANT_NOME="Pizza do Pedro"` na Vercel, **todo o site** muda automaticamente:
- O logo mostra "Pizza do Pedro"
- O footer mostra "© 2026 Pizza do Pedro"
- O comprovante de venda imprime "PIZZA DO PEDRO"
- O SEO mostra "Pizza do Pedro" no Google

**Sem mudar uma linha de código.**

### Presets de segmento

Quando você seta `NEXT_PUBLIC_TENANT_SEGMENTO=churrascaria`, o sistema carrega:

| O que muda | Panificadora | Churrascaria | Pizzaria |
|---|---|---|---|
| Hero tagline | "Fornada quente todo dia" | "Na brasa todo dia" | "Massa fresca todo dia" |
| Hero título | "O rei do pão" | "Churrasco" | "Pizza" |
| Emojis da home | 👑🥖🥐🧁🔥 | 🔥🥩🍖🥗🍺 | 🍕🧀🍅🫒🔥 |
| Seed de categorias | Pães, Doces, Salgados | Carnes, Porções, Acompanhamentos | Pizzas Salgadas, Doces, Bordas |
| Seed de produtos | Pão Francês, Bolo | Picanha, Costela, Batata Frita | Margherita, Calabresa |

Se o dono quiser customizar além do preset, é só setar a env var específica (ex.: `NEXT_PUBLIC_TENANT_HERO_TAGLINE=Churrasco premium`) e o preset é sobrescrito.

---

## Como as feature flags funcionam

Nem todo cliente quer as mesmas funcionalidades. O arquivo `lib/features.ts` controla isso:

```
NEXT_PUBLIC_FEATURE_WHATSAPP_ORDERS = true    →  mostra carrinho + botão WhatsApp
NEXT_PUBLIC_FEATURE_MERCADOPAGO_PIX = true    →  mostra QR code Pix no caixa
NEXT_PUBLIC_FEATURE_CARDAPIO_QR_MESA = true   →  mostra banner de mesa + página admin QR
```

No código, antes de mostrar qualquer funcionalidade opcional:

```typescript
if (isFeatureEnabled("whatsapp_orders")) {
  // mostra o botão
}
// senão, não mostra nada — como se o módulo não existisse
```

### Modelo de planos sugerido

| Plano | Preço | Features |
|---|---|---|
| Básico | R$ 150/mês | PDV + cardápio |
| Profissional | R$ 250/mês | + WhatsApp + QR mesa |
| Premium | R$ 350/mês | + Mercado Pago Pix + tudo |

A única diferença entre os planos é quais env vars estão `true` ou `false`.

---

## Banco de dados isolado

```
Cliente 1 (Rei dos Pães)        Cliente 2 (Churrascaria do Zé)
         │                                │
         v                                v
   Neon Project A                   Neon Project B
   DATABASE_URL=postgres://a...     DATABASE_URL=postgres://b...
         │                                │
         v                                v
   ┌─────────────┐                ┌─────────────┐
   │ usuarios    │                │ usuarios    │
   │ produtos    │                │ produtos    │
   │ comandas    │                │ comandas    │
   │ ...         │                │ ...         │
   └─────────────┘                └─────────────┘
```

As tabelas são idênticas (mesmo schema), mas os dados são completamente separados:

- **Segurança**: um bug no código não vaza dados de um cliente pro outro
- **Performance**: se a churrascaria tiver 10.000 produtos, não afeta a velocidade da panificadora
- **Backup**: você pode restaurar o banco de um cliente sem afetar os outros
- **Compliance**: cada cliente é "dono" dos seus dados, fisicamente separados

---

## Como os subdomínios funcionam

```
                    ezzedevs.com (seu domínio)
                         │
            ┌────────────┼────────────┐
            │            │            │
   reidospaes.      churrascariadoze.   pizzadopedro.
   ezzedevs.com     ezzedevs.com        ezzedevs.com
            │            │            │
            v            v            v
      Vercel App 1   Vercel App 2   Vercel App 3
      (DB Neon A)    (DB Neon B)    (DB Neon C)
```

Na Cloudflare (DNS), você cria um CNAME para cada cliente:

```
reidospaes         CNAME  →  cname.vercel-dns.com
churrascariadoze   CNAME  →  cname.vercel-dns.com
pizzadopedro       CNAME  →  cname.vercel-dns.com
```

Na Vercel, cada projeto tem o subdomínio configurado em Settings > Domains. A Vercel emite o certificado SSL automaticamente.

---

## O que cada módulo faz na prática

### WhatsApp Orders

```
Cliente abre o cardápio no celular
    → vê os produtos com botão "Adicionar"
    → monta um carrinho (2x Picanha, 1x Cerveja)
    → clica no botão verde "Pedir pelo WhatsApp"
    → abre o WhatsApp com mensagem formatada:

    "Olá! Gostaria de fazer um pedido na Churrascaria do Zé (Mesa 5):
     • 2x Picanha — R$ 179,80
     • 1x Cerveja Long Neck — R$ 9,00
     *Total: R$ 188,80*"
```

### Mercado Pago Pix

```
Operador no caixa finaliza comanda
    → seleciona "PIX" como forma de pagamento
    → clica "Gerar QR Code Pix"
    → sistema chama API do Mercado Pago
    → tela mostra QR code grande + botão "Copiar código"
    → cliente escaneia com app do banco
    → banco paga → Mercado Pago notifica via webhook
    → sistema detecta (polling a cada 4s ou webhook)
    → comanda finalizada automaticamente
    → tela mostra comprovante → operador imprime
```

### QR Code por Mesa

```
Admin acessa /admin/qr-mesas
    → define "10 mesas, começando pela mesa 1"
    → sistema gera 10 QR codes
    → cada QR aponta pra: churrascariadoze.ezzedevs.com/cardapio?mesa=3
    → admin imprime e cola nas mesas
    → cliente escaneia → abre cardápio → banner "Mesa 3" aparece
    → pedido via WhatsApp inclui "Mesa 3" na mensagem
```

### Comprovante de Venda

```
Toda comanda finalizada (qualquer forma de pagamento)
    → modal de prévia aparece automaticamente
    → texto formatado pra impressora térmica (80mm)
    → botões: Imprimir / Enviar por WhatsApp / Fechar
    → se Pix: prévia aparece logo após confirmação do pagamento
```

---

## Tabela completa de variáveis de ambiente

### Identidade do tenant (obrigatórias)

| Variável | Exemplo | O que controla |
|---|---|---|
| `DATABASE_URL` | `postgres://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb` | Conexão com o banco Neon |
| `AUTH_SECRET` | *(gerar com `openssl rand -base64 32`)* | Chave de encriptação do NextAuth |
| `AUTH_URL` | `https://reidospaes.ezzedevs.com` | URL base do NextAuth |
| `NEXT_PUBLIC_SITE_URL` | `https://reidospaes.ezzedevs.com` | URL pública do site |
| `NEXT_PUBLIC_TENANT_NOME` | `Panificadora Rei dos Pães` | Nome exibido em todo o site |
| `NEXT_PUBLIC_TENANT_SLUG` | `reidospaes` | Identificador curto |
| `NEXT_PUBLIC_TENANT_SEGMENTO` | `panificadora` | Define textos e seeds. Valores: `panificadora`, `churrascaria`, `lanchonete`, `restaurante`, `pizzaria`, `cafeteria`, `generico` |
| `NEXT_PUBLIC_TENANT_SUBTITULO` | `Panificadora & Confeitaria` | Texto pequeno abaixo do logo |

### Branding visual

| Variável | Exemplo | O que controla |
|---|---|---|
| `NEXT_PUBLIC_TENANT_LOGO_URL` | `/images/logo.png` | Caminho da logo |
| `NEXT_PUBLIC_TENANT_FAVICON` | `/favicon.ico` | Favicon do site |
| `NEXT_PUBLIC_TENANT_COR_PRIMARIA` | `#d97706` | Cor primária (botões, destaques) |
| `NEXT_PUBLIC_TENANT_COR_SECUNDARIA` | `#ea580c` | Cor secundária |
| `NEXT_PUBLIC_TENANT_COR_ACENTO` | `#f59e0b` | Cor de acento |

### SEO e metatags

| Variável | Exemplo | O que controla |
|---|---|---|
| `NEXT_PUBLIC_TENANT_META_TITULO` | `Panificadora Rei dos Pães` | `<title>` e OpenGraph title |
| `NEXT_PUBLIC_TENANT_META_DESCRICAO` | `O melhor pão da cidade, feito com tradição.` | Meta description e footer |

### Hero da home (opcional — se omitido, usa preset do segmento)

| Variável | Exemplo panificadora | Exemplo churrascaria |
|---|---|---|
| `NEXT_PUBLIC_TENANT_HERO_TAGLINE` | `Fornada quente todo dia` | `Na brasa todo dia` |
| `NEXT_PUBLIC_TENANT_HERO_TITULO` | `O rei do pão` | `Churrasco` |
| `NEXT_PUBLIC_TENANT_HERO_TITULO_DESTAQUE` | `chegou fresquinho.` | `de verdade.` |
| `NEXT_PUBLIC_TENANT_HERO_DESCRICAO` | `Pães artesanais, bolos caseiros...` | `Cortes nobres, tempero da casa...` |

### Contato

| Variável | Exemplo | O que controla |
|---|---|---|
| `NEXT_PUBLIC_TENANT_TELEFONE` | `(11) 4002-8922` | Telefone no footer e contato |
| `NEXT_PUBLIC_TENANT_WHATSAPP` | `5511912345678` | Número do WhatsApp (DDI+DDD+num) |
| `NEXT_PUBLIC_TENANT_EMAIL` | `contato@reidospaes.com.br` | Email de contato |
| `NEXT_PUBLIC_TENANT_INSTAGRAM` | `@reidospaes_1` | Instagram no footer e home |

### Endereço (opcional)

| Variável | Exemplo |
|---|---|
| `NEXT_PUBLIC_TENANT_RUA` | `Rua Exemplo, 123` |
| `NEXT_PUBLIC_TENANT_BAIRRO` | `Centro` |
| `NEXT_PUBLIC_TENANT_CIDADE` | `São Paulo` |
| `NEXT_PUBLIC_TENANT_UF` | `SP` |
| `NEXT_PUBLIC_TENANT_CEP` | `01001-000` |

### Feature flags (módulos opcionais)

| Variável | Valor | O que ativa |
|---|---|---|
| `NEXT_PUBLIC_FEATURE_WHATSAPP_ORDERS` | `true` ou `false` | Carrinho + botão "Pedir pelo WhatsApp" no cardápio |
| `NEXT_PUBLIC_FEATURE_MERCADOPAGO_PIX` | `true` ou `false` | QR Code Pix no caixa ao finalizar comanda |
| `NEXT_PUBLIC_FEATURE_CARDAPIO_QR_MESA` | `true` ou `false` | Banner de mesa no cardápio + página admin `/admin/qr-mesas` |
| `NEXT_PUBLIC_FEATURE_IMPRESSAO_COZINHA` | `true` ou `false` | Impressão na cozinha (a implementar) |

### Credenciais do Mercado Pago (só se Pix ativo)

| Variável | Exemplo | Obs |
|---|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | `APP_USR-xxxxxxxxx` | **Server-side only** — token de produção |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | `APP_USR-yyyyyyyy` | Public key (opcional) |
| `MERCADOPAGO_WEBHOOK_SECRET` | *(copiar do painel MP)* | **Server-side only** — valida HMAC do webhook |

### WhatsApp (só se WhatsApp Orders ativo)

| Variável | Exemplo | Obs |
|---|---|---|
| `NEXT_PUBLIC_WHATSAPP_NUMERO` | `5511912345678` | Só dígitos, com DDI |
| `NEXT_PUBLIC_WHATSAPP_MENSAGEM_PADRAO` | `Olá! Vi o cardápio e gostaria de pedir:` | Opcional |

### Cardápio QR Mesa (só se QR Mesa ativo)

| Variável | Exemplo | Obs |
|---|---|---|
| `NEXT_PUBLIC_CARDAPIO_QR_URL_BASE` | `https://reidospaes.ezzedevs.com` | Se omitido, usa `NEXT_PUBLIC_SITE_URL` |

**Mínimo para funcionar** (sem módulos opcionais): as 8 variáveis da seção "Identidade do tenant". O resto usa defaults inteligentes baseados no segmento.

---

## Tutorial: Configurar Mercado Pago Pix para cada cliente

O Mercado Pago Pix permite que o caixa gere um QR Code na tela e o cliente pague escaneando com o app do banco. Cada estabelecimento precisa de **sua própria conta Mercado Pago** (o dinheiro vai pra conta dele, não pra sua).

### Passo 1 — O dono do estabelecimento cria conta Mercado Pago

O **dono do restaurante/padaria** (não você) precisa:
1. Ter uma conta Mercado Pago ativa (PJ de preferência, mas PF funciona)
2. A conta precisa estar verificada com documentos

### Passo 2 — Você cria uma aplicação no Mercado Pago Developers

1. Acesse [mercadopago.com.br/developers/panel/app](https://www.mercadopago.com.br/developers/panel/app)
2. Clique "Criar aplicação"
3. Nome: `PDV - <nome do cliente>` (ex.: "PDV - Churrascaria do Zé")
4. Selecione "Pagamentos online" como produto
5. Modelo de integração: "CheckoutAPI"
6. Clique "Criar aplicação"

### Passo 3 — Obter as credenciais de PRODUÇÃO

> **IMPORTANTE**: Use credenciais de **produção**, não de teste. Credenciais de teste geram QR codes que não podem ser pagos de verdade.

1. Na sua aplicação criada, vá em **Credenciais de produção**
2. Copie:
   - **Access Token**: começa com `APP_USR-` seguido de um número longo
   - **Public Key**: começa com `APP_USR-` seguido de outro valor
3. Guarde o Access Token em local seguro (1Password, Bitwarden) — ele dá acesso total à conta MP do cliente

### Passo 4 — Configurar o webhook

O webhook é a URL que o Mercado Pago chama quando um pagamento é aprovado. Sem ele, o sistema só detecta pagamento por polling (mais lento).

1. Na sua aplicação do MP, vá em **Webhooks** (menu lateral ou aba "Webhooks")
2. URL de notificação: `https://<slug>.ezzedevs.com/api/webhooks/mercadopago`
   - Exemplo: `https://churrascariadoze.ezzedevs.com/api/webhooks/mercadopago`
3. Eventos: marque **Pagamentos** (`payment`)
4. Clique "Salvar"
5. Após salvar, o painel mostra o **Signing Secret** (ou "Secret key") — **copie este valor**

### Passo 5 — Setar as env vars na Vercel do cliente

No painel Vercel do projeto do cliente (Settings > Environment Variables), adicione:

```
NEXT_PUBLIC_FEATURE_MERCADOPAGO_PIX = true
MERCADOPAGO_ACCESS_TOKEN = APP_USR-1234567890123456-010101-abcdef1234567890abcdef1234567890-123456789
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY = APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MERCADOPAGO_WEBHOOK_SECRET = a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
```

**ATENÇÃO:**
- `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` **NÃO** devem ter prefixo `NEXT_PUBLIC_` — são server-side only, nunca expostos ao browser
- Se o Mercado Pago não fornecer um webhook secret no seu painel, deixe `MERCADOPAGO_WEBHOOK_SECRET` vazio — o sistema aceita webhooks sem validação HMAC (menos seguro, ok para começar)

### Passo 6 — Redeploy e testar

1. Após salvar as env vars, faça um redeploy na Vercel (Deployments > Redeploy)
2. Acesse o admin do cliente → Caixa → Abra uma sessão → Crie uma comanda de teste → Adicione um produto
3. Clique "Finalizar Comanda" → selecione "PIX" → clique "Gerar QR Code Pix"
4. Deve aparecer o QR code na tela
5. Escaneie com o app do banco para pagar (use um valor baixo, tipo R$ 0,50, pra teste)
6. Após pagamento, a tela deve mudar automaticamente para "Pagamento confirmado!" e mostrar o comprovante

### Passo 7 — Testar o webhook

Para confirmar que o webhook funciona:
1. Faça um pagamento real (R$ 0,50)
2. Veja nos logs da Vercel (Deployments > Functions > Logs) se aparece a chamada `POST /api/webhooks/mercadopago`
3. Se o pagamento foi detectado antes do webhook (via polling), tudo bem — o webhook é uma camada extra de segurança

### Troubleshooting do Mercado Pago

| Problema | Causa provável | Solução |
|---|---|---|
| "Integração Mercado Pago não configurada" | `MERCADOPAGO_ACCESS_TOKEN` não setado ou `NEXT_PUBLIC_FEATURE_MERCADOPAGO_PIX` não é `true` | Conferir env vars na Vercel, redeploy |
| QR code não aparece | Access Token de **teste** em vez de **produção** | Trocar pra credencial de produção (começa com `APP_USR-`) |
| QR code aparece mas pagamento nunca é detectado | Webhook URL errada ou access token de conta diferente | Conferir URL do webhook no painel MP (deve bater com a URL do site do cliente) |
| Erro 401 no webhook | `MERCADOPAGO_WEBHOOK_SECRET` errado | Copiar o secret correto do painel MP, ou remover a env var pra desativar validação |
| "Não foi possível gerar o QR Code Pix" | Access Token inválido/expirado ou conta MP com restrições | Verificar se a conta MP está verificada e sem bloqueios |

### Cada cliente = suas próprias credenciais

```
Cliente A (Churrascaria do Zé)
    MERCADOPAGO_ACCESS_TOKEN = APP_USR-111...     ← conta MP do Zé
    → dinheiro dos pagamentos Pix vai pra conta do Zé

Cliente B (Pizza do Pedro)
    MERCADOPAGO_ACCESS_TOKEN = APP_USR-222...     ← conta MP do Pedro
    → dinheiro dos pagamentos Pix vai pra conta do Pedro
```

Você (dono do SaaS) **nunca toca no dinheiro** dos clientes. O Mercado Pago transfere direto pra conta de cada estabelecimento. Você cobra separadamente a mensalidade do sistema (por Pix, boleto, etc).

---

## Modelo de receita

### Fase 1 — 3 clientes

```
CUSTOS
  Domínio ezzedevs.com         R$   4/mês
  Vercel Hobby                  R$   0
  Neon Free (3 projetos)        R$   0
  Cloudflare DNS                R$   0
  TOTAL                         R$   4/mês

RECEITA  (3 × R$ 200)          R$ 600/mês
MARGEM                          R$ 596/mês  (~99%)
```

### Fase 2 — 10 clientes

```
CUSTOS
  Vercel Pro                    R$ 100/mês
  Neon Scale                    R$ 170/mês
  Domínio                       R$   4/mês
  TOTAL                         R$ 274/mês

RECEITA  (10 × R$ 200)         R$ 2.000/mês
MARGEM                          R$ 1.726/mês (~86%)
```

---

## Transição para a Fase 2 (futuro, 3+ clientes)

Quando manter repos separados ficar insustentável (4+ clientes):

```
FASE 1 (agora)                          FASE 2 (futuro)

1 repo por cliente                      1 repo único
1 deploy Vercel por cliente             1 deploy Vercel só
Env vars definem identidade             Banco central define identidade
DNS manual por cliente                  Wildcard *.ezzedevs.com

┌─────────┐  ┌─────────┐              ┌──────────────────────┐
│ Clone 1 │  │ Clone 2 │              │   App único           │
│ Vercel  │  │ Vercel  │      →       │   Vercel Pro          │
│ DB A    │  │ DB B    │              │   Middleware detecta   │
└─────────┘  └─────────┘              │   subdomain → tenant  │
                                       │   → conecta no DB     │
                                       │      correto          │
                                       └──────────────────────┘
                                              │
                                       ┌──────┼──────┐
                                       v      v      v
                                     DB A   DB B   DB C
                                              │
                                       ┌──────────────┐
                                       │ DB Central    │
                                       │ (tenants,     │
                                       │  features,    │
                                       │  billing)     │
                                       └──────────────┘
```

A transição é suave:
- Os bancos dos clientes da Fase 1 já existem no Neon — só importar as connection strings pro banco central
- O `isFeatureEnabled()` e `TENANT_CONFIG` já existem — só muda a fonte (de env var para banco central)
- O código do core não muda

---

## Resumo da arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    SEU CÓDIGO (1 só)                     │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ TENANT   │  │ FEATURE  │  │ SEEDS    │              │
│  │ CONFIG   │  │ FLAGS    │  │ POR      │              │
│  │          │  │          │  │ SEGMENTO │              │
│  │ nome     │  │ whatsapp │  │          │              │
│  │ segmento │  │ pix      │  │ padaria  │              │
│  │ cores    │  │ qr mesa  │  │ churrasc │              │
│  │ contato  │  │ cozinha  │  │ lanch    │              │
│  │ hero     │  │          │  │ restaur  │              │
│  └────┬─────┘  └────┬─────┘  │ pizza    │              │
│       │             │        │ cafe     │              │
│       │             │        │ generico │              │
│       │             │        └────┬─────┘              │
│       │             │             │                     │
│       └─────────────┴─────────────┘                     │
│                     │                                   │
│              TUDO VEM DE ENV VARS                        │
│              (muda por cliente, zero código)             │
└─────────────────────────────────────────────────────────┘
```

**Um código, infinitos negócios.** Cada cliente é só um conjunto diferente de variáveis de ambiente + banco de dados próprio.
