# Deploy — Panificadora Rei dos Pães

Este guia cobre o deploy na **Vercel** com subdomínio apontado via CNAME na **Hostinger**.

Arquitetura final:
- Código e runtime: **Vercel** (plano Hobby, grátis)
- Banco de dados: **Neon PostgreSQL** (já configurado)
- Domínio: **Hostinger** (só como registrador/DNS)
- Subdomínio: **`reidospaes.ezzedev.com.br`**

---

## 1. Preparar o GitHub

O repositório já está em `https://github.com/Ezequiel-o-Rodrigues/panificadora-rei-dos-paes`.

Antes de fazer deploy, garanta que `main` está atualizada:

```bash
git pull origin main
npm install
npm run build   # precisa passar sem erros
git push origin main
```

---

## 2. Criar Blob Store na Vercel (para uploads de imagem)

1. Entre em <https://vercel.com> (login com GitHub)
2. Vá em **Storage** (menu topo) → **Create Database** → **Blob**
3. Nome: `panificadora-uploads`
4. Região: escolha a mais próxima (`iad1` — Washington D.C. é padrão)
5. Clique em **Create**
6. Na tela do blob, clique em **Connect Project** (fica pra depois de criar o projeto)

---

## 3. Importar o projeto na Vercel

1. Na Vercel: **Add New...** → **Project**
2. **Import Git Repository** → escolha `panificadora-rei-dos-paes`
3. Framework: `Next.js` (detectado automaticamente)
4. Root Directory: deixa vazio (raiz)
5. **Environment Variables** — cole as seguintes:

| Nome | Valor |
|------|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_aOyb7Ls0AupT@ep-withered-bird-amciydr9-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `AUTH_SECRET` | valor do seu `.env.local` (ou gere um novo com `openssl rand -base64 32`) |
| `AUTH_URL` | `https://reidospaes.ezzedev.com.br` |
| `AUTH_TRUST_HOST` | `true` |
| `NEXT_PUBLIC_SITE_URL` | `https://reidospaes.ezzedev.com.br` |
| `NEXT_PUBLIC_WHATSAPP` | `5511999999999` (troque pelo número real) |
| `NEXT_PUBLIC_ENABLE_3D` | `true` |

⚠️ **Importante**: rotacione a senha do Neon depois desta configuração — ela foi exposta em chat durante desenvolvimento.

6. Clique **Deploy**. O primeiro build leva ~2 min.

---

## 4. Conectar o Blob Store ao projeto

Depois que o projeto for criado:

1. Na Vercel, vá em **Storage** → `panificadora-uploads` → **Connect Project**
2. Selecione o projeto `panificadora-rei-dos-paes` → **Connect**
3. Isso adiciona automaticamente a env var `BLOB_READ_WRITE_TOKEN` ao projeto
4. **Redeploy** o projeto (Deployments → ... → Redeploy) para o token virar efetivo

---

## 5. Adicionar o domínio na Vercel

1. No projeto → **Settings** → **Domains**
2. Adicione `reidospaes.ezzedev.com.br` → **Add**
3. A Vercel vai mostrar o valor do CNAME para configurar na Hostinger:
   - Tipo: **CNAME**
   - Nome/Host: `reidospaes`
   - Valor: `cname.vercel-dns.com.`
4. Deixe essa aba aberta — volte depois de configurar o DNS

---

## 6. Configurar o CNAME na Hostinger

1. Entre no **hPanel** da Hostinger
2. **Domínios** → **ezzedev.com.br** → **DNS / Zona DNS**
3. **Adicionar registro**:
   - Tipo: **CNAME**
   - Nome: `reidospaes` (só o subdomínio, sem ponto nem domínio)
   - Aponta para: `cname.vercel-dns.com`
   - TTL: `3600` (ou automático)
4. Salvar

A propagação leva de **minutos a 1 hora**. A Vercel detecta e emite o SSL automaticamente quando o DNS propagar.

---

## 7. Atualizar AUTH_URL após domínio ativo

Assim que `https://reidospaes.ezzedev.com.br` responder com SSL válido:

1. Vercel → Settings → Environment Variables
2. Confirme que `AUTH_URL` está com `https://reidospaes.ezzedev.com.br`
3. Confirme que `NEXT_PUBLIC_SITE_URL` também está
4. **Redeploy**

---

## 8. Rodar o seed em produção (criar usuário admin)

O banco Neon já está populado com categorias, produtos e usuário admin (`ezequiel@reidospaes.com.br`).
**Não precisa rodar o seed novamente** — o banco é o mesmo que você já usa localmente.

Se um dia precisar resetar:

```bash
# Cuidado: isso recria dados de exemplo. Só use se o banco estiver vazio.
DATABASE_URL="..." npm run db:seed
```

---

## 9. Checklist de validação pós-deploy

Abra `https://reidospaes.ezzedev.com.br` e verifique:

- [ ] Landing `/` carrega com tema dark laranja
- [ ] `/cardapio` mostra as categorias e produtos reais do Neon
- [ ] `/login` aceita as credenciais do admin
- [ ] `/admin` mostra o dashboard com stats do banco
- [ ] `/admin/produtos/novo` permite criar produto com imagem (upload vai pro Blob)
- [ ] `/admin/caixa/nova-sessao` abre uma sessão de caixa
- [ ] Cada imagem de produto é servida de `*.public.blob.vercel-storage.com`

Se algo falhar, cheque **Deployments → [último] → Runtime Logs** na Vercel.

---

## Fluxo de atualização futuro

```bash
# Faça mudanças no código local
git add -A
git commit -m "feat: nova feature"
git push origin main

# A Vercel detecta o push e republica automaticamente em ~1 min
```

Preview deployments: qualquer branch/PR gera uma URL `https://panificadora-rei-dos-paes-git-*.vercel.app` para testes antes de merge.
