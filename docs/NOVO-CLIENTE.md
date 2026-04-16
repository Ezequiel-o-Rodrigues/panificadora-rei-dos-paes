# Provisionamento de novo cliente (Fase 1)

Este documento descreve o processo manual de colocar uma nova panificadora/churrascaria/lanchonete/restaurante/pizzaria/cafeteria no ar, usando o modelo "clone por cliente" da Fase 1 do SaaS.

**Tempo total estimado:** 15–20 min por cliente.

---

## Pré-requisitos (uma vez só)

- [ ] Domínio `ezzedevs.com` registrado com DNS na Cloudflare
- [ ] Conta Vercel (plano Hobby no início, Pro depois do 3º cliente pagante)
- [ ] Conta Neon (plano Free atende até 10 projetos)
- [ ] Repositório-template deste projeto no GitHub (o repo atual)
- [ ] Se o cliente usar Mercado Pago Pix: conta de produção Mercado Pago dele + access token

---

## Passos por cliente

### 1. Escolher slug e segmento

- **Slug**: curto, sem acento, sem espaço. Exemplo: `churrascariadoze`, `pizzariadopedro`
- **Segmento**: `panificadora` | `churrascaria` | `lanchonete` | `restaurante` | `pizzaria` | `cafeteria` | `generico`

> O slug vira o subdomínio: `churrascariadoze.ezzedevs.com`

### 2. Criar projeto Neon

1. Acessar [console.neon.tech](https://console.neon.tech)
2. Criar novo projeto: nome `pdv-<slug>` (ex.: `pdv-churrascariadoze`)
3. Região: `AWS us-east-1` (ou a mais próxima do cliente)
4. **Copiar a `DATABASE_URL`** — guardar com cuidado

### 3. Clonar o repositório-template

```bash
# No seu terminal
gh repo create pdv-<slug> --private --clone \
  --template Ezequiel-o-Rodrigues/panificadora-rei-dos-paes
cd pdv-<slug>
```

Ou manualmente pelo GitHub: "Use this template" → criar novo repo privado → clonar.

### 4. Configurar env vars (`.env.local` para dev local, Vercel para produção)

Variáveis obrigatórias:

```bash
DATABASE_URL=postgres://...        # do passo 2
AUTH_SECRET=<gerar com `openssl rand -base64 32`>
AUTH_URL=https://<slug>.ezzedevs.com
NEXT_PUBLIC_SITE_URL=https://<slug>.ezzedevs.com
SEGMENTO=<segmento>                # também usado pelo seed

# Identidade do tenant
NEXT_PUBLIC_TENANT_NOME=Churrascaria do Zé
NEXT_PUBLIC_TENANT_SLUG=<slug>
NEXT_PUBLIC_TENANT_SEGMENTO=<segmento>
NEXT_PUBLIC_TENANT_SUBTITULO=Churrasco & Petiscos
NEXT_PUBLIC_TENANT_LOGO_URL=/images/logo.png
NEXT_PUBLIC_TENANT_META_TITULO=Churrascaria do Zé
NEXT_PUBLIC_TENANT_META_DESCRICAO=O melhor churrasco da cidade
NEXT_PUBLIC_TENANT_TELEFONE=(11) 4002-8922
NEXT_PUBLIC_TENANT_WHATSAPP=5511912345678
NEXT_PUBLIC_TENANT_INSTAGRAM=@churrascariadoze
NEXT_PUBLIC_TENANT_COR_PRIMARIA=#d97706
NEXT_PUBLIC_TENANT_COR_SECUNDARIA=#ea580c
NEXT_PUBLIC_TENANT_COR_ACENTO=#f59e0b
```

### 5. Módulos opcionais (feature flags)

Ativar só os que o cliente contratou:

```bash
# WhatsApp Orders (botão "Pedir pelo WhatsApp" no cardápio)
NEXT_PUBLIC_FEATURE_WHATSAPP_ORDERS=true
NEXT_PUBLIC_WHATSAPP_NUMERO=5511912345678

# Mercado Pago Pix (QR Code no caixa)
NEXT_PUBLIC_FEATURE_MERCADOPAGO_PIX=true
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-yyyyyyyy
MERCADOPAGO_WEBHOOK_SECRET=<webhook secret do painel MP>

# Cardápio com QR Code por mesa
NEXT_PUBLIC_FEATURE_CARDAPIO_QR_MESA=true

# Impressão na cozinha (a implementar)
NEXT_PUBLIC_FEATURE_IMPRESSAO_COZINHA=false
```

### 6. Seed inicial (schema + categorias + produtos modelo + admin)

```bash
# Aplicar schema do Drizzle no Neon recém-criado
DATABASE_URL="<url-do-neon-novo>" npm run db:push

# Seedar admin user + dados iniciais do segmento
DATABASE_URL="<url-do-neon-novo>" \
  SEGMENTO=churrascaria \
  NEXT_PUBLIC_TENANT_NOME="Churrascaria do Zé" \
  SEED_ADMIN_EMAIL=admin@churrascariadoze.com.br \
  SEED_ADMIN_PASSWORD=trocar-essa-senha \
  npm run db:seed
```

O seed carrega categorias e produtos-modelo específicos do segmento (Carnes, Acompanhamentos, Porções, etc para churrascaria). O cliente vai ajustar depois.

### 7. Criar projeto Vercel

1. No [vercel.com](https://vercel.com) → "Add New" → "Project"
2. Importar o repo `pdv-<slug>`
3. Framework: Next.js (detectado)
4. Project Name: `pdv-<slug>`
5. **Colar todas as env vars** dos passos 4 e 5
6. Deploy

### 8. Configurar domínio do cliente

1. No projeto Vercel → Settings → Domains
2. Adicionar `<slug>.ezzedevs.com`
3. Vercel mostra um CNAME target (ex.: `cname.vercel-dns.com`)

### 9. Apontar DNS na Cloudflare

1. Acessar o painel Cloudflare da zona `ezzedevs.com`
2. DNS → Records → Add record
3. Type: `CNAME`
4. Name: `<slug>`
5. Target: `cname.vercel-dns.com`
6. **Proxy status: DNS only** (desligado — Vercel precisa do CNAME direto para emitir o certificado)
7. Salvar

### 10. Aguardar SSL e testar

- Propagação DNS: ~2–5 min
- Vercel emite o cert automaticamente
- Acessar `https://<slug>.ezzedevs.com` → deve carregar a home
- Acessar `https://<slug>.ezzedevs.com/login` → testar com credenciais do admin seedado no passo 6
- Se `cardapio_qr_mesa` ativo: acessar `https://<slug>.ezzedevs.com/cardapio?mesa=5` → verificar banner "Mesa 5"
- Se `mercadopago_pix` ativo: abrir uma comanda de teste → finalizar com Pix → QR Code aparece → cancelar (sem pagar) na tela

### 11. Se Mercado Pago Pix ativo: configurar webhook no painel MP

1. Acessar [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
2. Suas aplicações → a app do cliente → Webhooks
3. URL: `https://<slug>.ezzedevs.com/api/webhooks/mercadopago`
4. Eventos: `Pagamentos`
5. Copiar o **Signing secret** → colar em `MERCADOPAGO_WEBHOOK_SECRET` no Vercel → redeploy

### 12. Registrar o cliente no controle interno

Atualizar sua planilha / Notion / CRM com:
- Slug
- Segmento
- Subdomínio
- Nome do estabelecimento
- `DATABASE_URL` (encriptar em um cofre — 1Password, Bitwarden, etc)
- Features ativas
- Data de ativação
- Plano
- Valor cobrado
- Contato do dono

---

## Dicas

- **Nunca commitar `.env.local`** — o `.gitignore` já bloqueia, mas confirme
- **Senha do admin**: gerar aleatória no passo 6 e enviar pelo canal seguro ao dono. O dono deve trocar no primeiro login
- **Backup do DB**: Neon tem PITR automático, mas exportar um dump lógico semanal como defesa em profundidade é bom
- **Logs**: sempre consultar logs do Vercel quando algo falhar em produção. Erros de `neon-http` costumam aparecer claramente
- **Deploy de atualização do código**: cada cliente tem seu próprio repo. Para atualizar todos, você precisa aplicar a mudança em cada repo (ou usar um script que faz `git pull` de um upstream comum). Quando virar insustentável, é hora de ir pra **Fase 2** (multi-tenant real com um único deploy)

---

## Troubleshooting

### "Database does not exist" ou erro de conexão
- Verificar que `DATABASE_URL` está correto no Vercel
- Testar localmente com `DATABASE_URL=... npm run db:push` antes de subir

### Subdomínio não resolve
- Confirmar CNAME na Cloudflare com proxy DESLIGADO
- Aguardar até 10 min para propagação
- `dig <slug>.ezzedevs.com` deve retornar o CNAME da Vercel

### SSL não emitido
- Mesmo problema do Cloudflare proxy — precisa estar em DNS only
- Na Vercel, marcar domínio para re-verificação

### Módulo Pix não gera QR
- Confirmar `MERCADOPAGO_ACCESS_TOKEN` é de **produção** (prefixo `APP_USR-`)
- Verificar `NEXT_PUBLIC_FEATURE_MERCADOPAGO_PIX=true`
- Logs do Vercel vão mostrar `[MP Pix]` com o erro

### WhatsApp abre sem número
- `NEXT_PUBLIC_WHATSAPP_NUMERO` precisa ser o DDI+DDD+número, só dígitos. Ex.: `5511912345678`
