# Manual do Sistema — Panificadora Rei dos Pães

Documento completo do sistema de gestão. Lista todos os módulos, o que cada um faz, qual o benefício para o negócio e como operar tela a tela. Serve tanto como manual de uso (para o padeiro, atendente e dono operarem no dia a dia) quanto como referência comercial (para entender o valor de cada funcionalidade antes de contratar).

---

## Sumário

1. [Visão geral do sistema](#1-visão-geral-do-sistema)
2. [Como o sistema é organizado](#2-como-o-sistema-é-organizado)
3. [Login e acesso](#3-login-e-acesso)
4. [Dashboard — a tela inicial do administrador](#4-dashboard--a-tela-inicial-do-administrador)
5. [Caixa / PDV — o coração da operação](#5-caixa--pdv--o-coração-da-operação)
6. [Comandas — histórico de vendas](#6-comandas--histórico-de-vendas)
7. [Produtos — cadastro do que se vende](#7-produtos--cadastro-do-que-se-vende)
8. [Categorias — organização do cardápio](#8-categorias--organização-do-cardápio)
9. [Estoque — controle do que entra e sai](#9-estoque--controle-do-que-entra-e-sai)
10. [Relatórios — o que vende e onde está o lucro](#10-relatórios--o-que-vende-e-onde-está-o-lucro)
11. [Usuários — quem pode acessar o quê](#11-usuários--quem-pode-acessar-o-quê)
12. [Configurações — ajustes gerais](#12-configurações--ajustes-gerais)
13. [Cardápio público — o que o cliente final vê](#13-cardápio-público--o-que-o-cliente-final-vê)
14. [QR Codes de mesa (opcional)](#14-qr-codes-de-mesa-opcional)
15. [Fluxos completos do dia a dia](#15-fluxos-completos-do-dia-a-dia)
16. [Suporte e contato](#16-suporte-e-contato)

---

## 1. Visão geral do sistema

O sistema é composto por duas partes que trabalham juntas:

**Painel administrativo (admin)**
Instalado direto no computador da padaria como aplicativo nativo do Windows. É onde o atendente abre o caixa, registra as vendas, cadastra produtos, controla estoque e o dono acompanha os relatórios. Abre por um atalho na área de trabalho, sem precisar abrir navegador.

**Cardápio público (web)**
Site público disponível 24 horas em um subdomínio próprio da padaria. É o que o cliente final vê no celular dele — fotos, preços, descrições, possibilidade de pedir via WhatsApp se essa opção estiver ativa.

Os dois compartilham o mesmo banco de dados. O que o atendente cadastra no admin aparece no cardápio público em segundos.

### Por que isso importa para a padaria

- **Acaba o "achismo"**: cada venda registra automaticamente. Você sabe exatamente quanto vendeu, de qual produto, a que hora.
- **Controle de estoque sem planilha**: vendeu um pão de queijo, o estoque baixa sozinho. Recebeu mercadoria, registra a entrada uma vez e pronto.
- **Caixa rastreável**: o sistema mostra quanto deveria ter na gaveta no fim do dia. Se faltar ou sobrar, aparece na hora — não no fim do mês.
- **Cardápio atualizado em tempo real**: alterou preço no admin? No cardápio público já está novo.

---

## 2. Como o sistema é organizado

O painel administrativo tem uma barra lateral (sidebar) à esquerda com todos os módulos. A ordem é:

| Módulo | Para que serve | Quem usa |
|---|---|---|
| Dashboard | Visão geral do dia e do mês | Dono / gerente |
| Caixa / PDV | Registrar vendas | Atendente / caixa |
| Comandas | Consultar vendas passadas | Atendente / dono |
| Produtos | Cadastrar o que se vende | Dono |
| Categorias | Organizar o cardápio | Dono |
| Estoque | Entradas, inventário e perdas | Dono / encarregado |
| Relatórios | Análises de vendas e desempenho | Dono |
| Usuários | Criar contas para a equipe | Dono (admin) |
| Configurações | Dados da empresa, garçons, gorjeta | Dono (admin) |

No topo da tela há um link "Ver site público" que abre o cardápio em uma nova aba — útil para conferir como o cliente está vendo as alterações.

---

## 3. Login e acesso

Ao abrir o aplicativo, a primeira tela é o login. Existem dois tipos de conta:

**Administrador (admin)**
Acessa tudo, inclusive Usuários e Configurações. Pode criar e desativar contas, mudar preço, alterar gorjeta, configurar dados da empresa.

**Usuário comum (operador)**
Tem acesso ao Caixa, Comandas, Produtos, Categorias, Estoque e Relatórios — mas não vê Usuários nem Configurações. Pensado para o atendente do dia a dia, que não deve mexer em configurações sensíveis.

A senha é definida no momento da criação do usuário. Se esquecer, o admin pode redefinir entrando em Usuários > Editar.

---

## 4. Dashboard — a tela inicial do administrador

É a primeira tela que abre após o login.

### O que mostra

**Quatro cartões de indicadores no topo**

1. **Vendas hoje** — total faturado hoje em reais + total acumulado do mês
2. **Comandas abertas** — quantas comandas ainda não foram finalizadas + total de comandas concluídas no mês
3. **Produtos ativos** — quantos produtos estão disponíveis para venda + ticket médio (valor médio por comanda)
4. **Estoque crítico** — quantos produtos estão abaixo do mínimo cadastrado, com aviso "Nenhum produto em alerta" se estiver tudo certo

**Três gráficos**

1. Linha mostrando vendas dos últimos 7 dias
2. Pizza mostrando as 8 categorias que mais faturaram
3. Barras mostrando vendas mês a mês do ano corrente

**Tabela**
Últimas 10 comandas com número, garçom, valor e status. Clique em uma linha leva ao detalhe da comanda.

### Por que importa

O dono entra de manhã, olha o dashboard e em 30 segundos sabe: vendeu mais ou menos que ontem, está com produto faltando, qual categoria está puxando o faturamento, e quais foram as últimas comandas. Sem precisar abrir relatório.

### Botões

A tela é de visualização — não tem botões de ação direta. A navegação é feita pela sidebar.

---

## 5. Caixa / PDV — o coração da operação

É a tela mais usada do sistema. Onde a venda acontece de verdade.

### 5.1 Tela inicial do caixa

Ao entrar em **Caixa**, o sistema mostra:

**Se já existe uma sessão de caixa aberta**
- Cartão grande de status com badge "Sessão aberta"
- ID da sessão (ex: #5), data e hora de abertura, valor de abertura, nome de quem abriu
- Botão **"Abrir PDV"** — leva para a tela de vendas

**Se não há sessão aberta**
- Mensagem "Nenhuma sessão de caixa aberta"
- Botão **"Abrir novo caixa"** — leva para a tela de abertura

Abaixo, uma **tabela com as últimas 20 sessões**, com colunas: número, data/hora, usuário, valor de abertura, status (Aberta/Fechada), total de vendas e valor de fechamento. Cada linha tem um botão **"Continuar"** (se aberta) ou **"Ver"** (se fechada).

### 5.2 Abrir nova sessão de caixa

Tela simples com:
- Campo **Valor de abertura (R$)** — quanto entrou de troco inicial na gaveta
- Campo **Observações** (opcional) — qualquer nota sobre a abertura

Botões:
- **Abrir Caixa** — confirma e leva direto ao PDV
- **Cancelar** — volta para a tela anterior

**Importante:** só pode existir uma sessão aberta por vez. Se já tem uma, o sistema redireciona para ela.

### 5.3 PDV — a tela de venda

Esta é a tela onde o caixa passa o dia inteiro.

**Cabeçalho da tela**
- Título "PDV — Caixa #{número}"
- Badge "Aberta"
- Hora de abertura e valor de abertura
- Botão **Fechar Caixa** (no canto superior)

**Abas de comandas**
Logo abaixo do cabeçalho, uma linha de abas mostrando todas as comandas que estão abertas naquela sessão. Cada aba mostra `#número — R$ total`. Clique em uma aba para mudar a comanda ativa. Botão **+ Nova Comanda** para abrir uma nova.

**Layout em duas colunas**

**Coluna da esquerda — Catálogo de produtos**

- Campo de busca por nome do produto
- Filtro de categorias em chips ("Todas" + cada categoria cadastrada)
- Grid com os produtos: imagem, nome, preço, badge de estoque atual, badge "Baixo" se estiver abaixo do mínimo, sobreposição "Sem estoque" se zerou

**Como adicionar um produto:**
- Se a unidade do produto é contável (un, fatia, pacote, porção, combo): um clique adiciona 1 unidade direto
- Se a unidade não é contável (kg, g, L, ml, metro): abre um diálogo perguntando a quantidade exata

**Coluna da direita — Comanda ativa**

Se nenhuma comanda está ativa, aparece um ícone e a mensagem "Nenhuma comanda ativa" com um botão "+ Nova Comanda".

Quando uma comanda está aberta, mostra:
- Número da comanda e hora de abertura
- Seletor **Garçom** — escolhe o garçom responsável pela mesa (puxa da lista cadastrada em Configurações)
- **Lista de itens** adicionados:
  - Cada produto: nome, quantidade × preço unitário, subtotal, botão X para remover
  - Itens livres (descritos abaixo) com badge "Livre"
- Botão **Item livre** — para vender algo que não está cadastrado (ex: "salgado de fim de bandeja R$ 3"), abre diálogo pedindo descrição, quantidade e preço
- **Resumo** no rodapé: subtotal, gorjeta (se houver), total em destaque
- Botão **Finalizar** — abre o diálogo de pagamento
- Botão **Cancelar comanda** — pede confirmação e descarta a comanda

### 5.4 Finalizar uma comanda (receber o pagamento)

Ao clicar em **Finalizar**, abre o diálogo de pagamento:

**Resumo no topo**
- Subtotal
- Campo de **gorjeta** — pode digitar em % ou em R$
- Seletor **Forma de pagamento** com seis opções:
  1. Dinheiro
  2. Débito
  3. Crédito
  4. PIX
  5. Voucher / Vale
  6. Outro
- Total em destaque grande

**Caso especial — PIX integrado**
Se o PIX integrado via Mercado Pago estiver ativo (configurável) e a forma escolhida for PIX, o sistema gera um **QR Code na hora** para o cliente escanear. O sistema fica aguardando a confirmação automática do pagamento. Quando confirma, fecha a comanda.

**Botões do diálogo**
- **Confirmar Venda** (ou **Gerar QR Code Pix** se for PIX) — finaliza
- **Cancelar** — volta sem finalizar

Após a confirmação, o sistema mostra o **comprovante da venda**, que pode ser impresso.

### 5.5 Fechar o caixa no fim do dia

Botão **Fechar Caixa** no canto superior abre o diálogo de fechamento. Esta é uma das partes mais valiosas do sistema, porque é onde "bate" o caixa com a realidade da gaveta.

**O que o diálogo mostra**

- Valor de abertura (o troco inicial)
- Total de comandas finalizadas na sessão
- Total de vendas em R$
- Gorjetas (se houve)
- **Detalhamento por forma de pagamento**:
  - Dinheiro
  - Cartão (débito + crédito)
  - PIX
  - Voucher
  - Outro

- **Valor esperado em gaveta** = valor de abertura + total de vendas em dinheiro (destacado, é a referência)
- Campo **Valor em gaveta (contado)** — o atendente digita quanto efetivamente contou
- **Diferença** calculada na hora:
  - Verde se sobrou
  - Vermelho se faltou
  - Neutro se bateu certinho
- Campo **Observações** — para registrar qualquer explicação

**Trava de segurança:** o sistema não deixa fechar o caixa se houver comanda ainda aberta. Mostra mensagem para finalizar ou cancelar antes.

Botão **Confirmar Fechamento** encerra a sessão. A partir desse momento ela vira "Fechada" e fica registrada para sempre nos relatórios.

### Por que isso importa

Esse fechamento de caixa rastreável é uma das maiores dores de qualquer padaria. Sem sistema, o dono pega o dinheiro da gaveta no fim do dia, conta, e tem que confiar que bate. Com o sistema, o número esperado é objetivo: se faltou R$ 50, faltou R$ 50, e isso fica registrado por sessão, por data, por usuário. Em uma semana de uso já dá para identificar quem está deixando o caixa "vazar" ou se há erro recorrente em troco.

---

## 6. Comandas — histórico de vendas

Acessa por **Comandas** na sidebar.

### O que mostra

**Três indicadores no topo**
1. Total de comandas no período filtrado
2. Total de vendas em R$ (só as finalizadas)
3. Ticket médio

**Filtros**
- Chips de status: Todas / Abertas / Finalizadas / Canceladas
- Seletor de garçom
- Seletor de forma de pagamento
- Intervalo de datas (de / até)
- Botão **Limpar filtros**

**Tabela de comandas** com colunas: número, data/hora, garçom, status, forma de pagamento, valor total. Cada linha tem um botão para ver o detalhe.

### Tela de detalhe da comanda

Mostra tudo da venda:
- Dados gerais (número, data, status, garçom)
- Itens vendidos com produto, quantidade, preço unitário e subtotal
- Itens livres separados
- Resumo (subtotal, gorjeta, total)
- Forma de pagamento usada
- Data e hora de finalização
- Botão para **imprimir comprovante** (se disponível)

### Por que importa

Cliente reclama que foi cobrado errado? Em 10 segundos você puxa a comanda, vê exatamente o que foi vendido, a quem, por quem e como pagou. Sem precisar lembrar nem recorrer a anotação manual.

---

## 7. Produtos — cadastro do que se vende

Acessa por **Produtos**.

### Tela de listagem

- Botão **Novo Produto** no topo
- Tabela com: imagem, nome, categoria, preço, estoque atual, estoque mínimo/máximo, status (ativo/inativo), botões de ação
- Cada linha tem botão **Editar** e botão **Deletar**

### Tela de novo / editar produto

Formulário com:
- **Nome** (obrigatório)
- **Categoria** (obrigatório — seleciona da lista cadastrada)
- **Descrição** (opcional, aparece no cardápio público)
- **Preço de venda** (R$)
- **Custo unitário** (R$, opcional — usado para calcular margem)
- **Estoque mínimo** — quando o estoque chegar nesse valor, o produto vira "crítico" e aparece em destaque no dashboard
- **Estoque máximo** (referência para inventário)
- **Unidade de medida**: un, fatia, kg, g, L, ml, metro, pacote, porção, combo
- **Peso em gramas** (opcional)
- **Disponível hoje** (checkbox) — para quando algo está temporariamente fora
- **Destaque** (checkbox) — aparece com badge especial no cardápio
- **Ativo** (checkbox) — desativa sem deletar
- **Imagem** — upload da foto do produto

Botões: **Criar Produto** / **Salvar** e **Cancelar**.

### Por que importa

A unidade de medida não é detalhe — ela define o comportamento no PDV. Produto em "un" vai com clique único. Produto em "kg" abre janela pedindo a quantidade. Isso evita erro do caixa que ia bater R$ 30 num pão de R$ 3 só porque clicou rápido.

---

## 8. Categorias — organização do cardápio

Acessa por **Categorias**.

### Tela

- Botão **Nova Categoria** no topo
- Lista de categorias com: nome, contagem de produtos, botões **Editar** e **Deletar**

### Diálogo de criar/editar

- **Nome** da categoria (ex: "Pães", "Doces", "Salgados", "Bebidas")
- **Slug** — gerado automaticamente, é o nome usado na URL do cardápio público
- **Descrição** (opcional)
- **Ícone** (opcional)
- **Ordem** — número que define em que posição aparece no cardápio (1 vem antes de 2)
- **Ativo** (checkbox)

### Por que importa

Categorias bem ordenadas no cardápio público fazem o cliente comprar mais. Pão de queijo na frente, sobremesas no fim. Inverter a ordem é só editar um número.

---

## 9. Estoque — controle do que entra e sai

Acessa por **Estoque**.

### 9.1 Visão geral

**Quatro indicadores no topo**
1. Produtos ativos
2. Produtos com estoque crítico (abaixo do mínimo)
3. Valor total em estoque (custo × quantidade)
4. Perdas pendentes (que ainda não foram visualizadas)

**Três botões de acesso rápido** no cabeçalho:
- **Entrada** — registrar mercadoria que chegou
- **Inventário** — fazer contagem física
- **Perdas** — registrar produto que estragou ou se perdeu

**Banner de alerta** — se há produtos abaixo do mínimo, aparece destacado.

**Tabela de estoque** com: produto, categoria, estoque atual, mínimo/máximo, preço, valor total. Linhas com estoque crítico ficam destacadas em cor de alerta. Filtro por categoria disponível.

**Histórico de movimentações** — últimas 10 entradas/saídas/ajustes, com data, produto, tipo, quantidade, usuário.

### 9.2 Entrada de estoque

Formulário simples:
- Seleciona **Produto**
- Digita **Quantidade**
- Escolhe **Tipo de entrada**: compra, devolução, ajuste, outro
- **Observação** (opcional, ex: "NF 1234, fornecedor X")
- Mostra preço unitário e valor total da entrada

Botões: **Registrar entrada** e **Cancelar**.

### 9.3 Inventário físico

Tela para fazer a contagem da loja:
- Lista todos os produtos com: nome, categoria, estoque atual segundo o sistema, campo para digitar a **quantidade contada**, e a diferença calculada
- Ao enviar, o sistema ajusta o estoque com base no contado e gera uma movimentação tipo "ajuste"

Botão: **Enviar Inventário**.

### 9.4 Registro de perdas

Tela própria para perdas (porque perda em padaria é grande e merece controle separado):

**Dois indicadores no topo**
- Total de perdas no período
- Valor total perdido em R$

**Filtros de data**

**Tabela de perdas** com: data, produto, quantidade, motivo (quebra, vencimento, roubo, ajuste, outro), valor total, botões para **marcar como visualizado** ou **deletar**.

Formulário inline para adicionar nova perda: seleciona produto, digita quantidade, escolhe motivo, observação.

### Por que importa

Perda separada é o que diferencia controle de verdade de planilha. O dono consegue saber: "perdi R$ 800 esse mês em pão que sobrou. Está sobrando demais? Tenho que diminuir a fornada da tarde?" Decisão com número, não com sensação.

---

## 10. Relatórios — o que vende e onde está o lucro

Acessa por **Relatórios**. A tela inicial é um hub com 4 cartões:

1. Vendas
2. Produtos vendidos
3. Análise de estoque
4. Desempenho dos garçons

### 10.1 Relatório de Vendas

**Filtros**: intervalo de data, granularidade (dia, semana ou mês).

**Quatro indicadores**:
- Total de comandas
- Total de vendas (R$)
- Gorjetas (R$)
- Ticket médio

**Gráficos**:
- Linha de evolução das vendas no período
- Distribuição por forma de pagamento (dinheiro / débito / crédito / pix / voucher / outro)

### 10.2 Produtos vendidos

**Filtros**: intervalo de data, categoria.

**Três indicadores**: itens vendidos (qty total), faturamento, produtos distintos.

**Tabela de ranking** com: posição, produto, quantidade vendida, valor unitário, faturamento total. Ordenado pelo que mais fatura.

### 10.3 Análise de estoque

Mostra **estoque teórico vs estoque real** por produto.

Caixa explicativa no topo explica a fórmula:
- Estoque teórico = estoque inicial + entradas − saídas + ajustes
- Perda = estoque teórico − estoque real

**Quatro indicadores**: produtos analisados, produtos com perda, valor total perdido, diferença teórico vs real.

**Tabela detalhada** com: produto, estoque inicial, entradas, saídas (vendas), ajustes, estoque teórico, estoque real, perda destacada em vermelho se positiva.

### 10.4 Desempenho dos garçons

**Filtros**: intervalo de data.

**Quatro indicadores**: garçons ativos, ticket médio geral (referência), total de comissões, melhor garçom + % acima da média.

**Tabela** com: garçom, total de comandas, total de vendas, ticket médio individual, classificação (Excelente / Bom / Regular) e comissão calculada. Cores indicam se está acima, na média ou abaixo.

### Por que importa

Dono que olha esses relatórios uma vez por semana sabe coisas que sem sistema só descobriria por acaso. Exemplos reais:
- "O bolo X parecia vender bem mas só fez R$ 100 esse mês — não compensa fazer todo dia."
- "Garçom Y tem ticket médio 30% maior que a média — ele está sugerindo bem, vale treinar os outros."
- "Sexta das 17h às 19h é o melhor horário — vou aumentar a fornada da tarde nesse dia."

---

## 11. Usuários — quem pode acessar o quê

Acessa por **Usuários** (apenas admin enxerga).

### Tela de listagem

- Botão **Novo Usuário**
- Tabela com: nome, email, perfil (admin/operador), status (ativo/inativo), botões **Editar** e **Deletar**

### Tela de criar/editar

- **Nome**
- **Email** (único)
- **Perfil**: admin ou operador
- **Ativo** (checkbox)
- Senha inicial é gerada automaticamente e mostrada na criação. Em edição, há link para **redefinir senha**.

### Por que importa

Cada atendente tem login próprio. As ações no sistema (qual comanda finalizou, qual valor digitou no fechamento, qual perda registrou) ficam atreladas ao usuário. Se sumir dinheiro, dá para investigar.

---

## 12. Configurações — ajustes gerais

Acessa por **Configurações** (apenas admin). Três abas:

### 12.1 Aba Geral — dados da empresa

Campos:
- Nome da empresa
- Endereço
- Telefone
- WhatsApp (usado nos pedidos do cardápio público, se ativo)
- Instagram
- Horário de funcionamento

Botão **Salvar configurações**.

### 12.2 Aba Garçons

Gerencia a lista de garçons que aparecem no PDV.

- Lista de garçons cadastrados, cada um em um cartão com: nome, código (ex: G01), badge ativo/inativo
- Botão **+ Adicionar garçom** abre diálogo pedindo nome e código
- Cada garçom tem três botões: **Editar**, **Ativar/Desativar** (power), **Deletar**

### 12.3 Aba Gorjeta

Define a regra de gorjeta usada no PDV:

- Radio: **Percentual (%)** / **Valor fixo (R$)** / **Nenhuma gorjeta**
- Campo de valor (se não for "nenhuma")
- Botão **Salvar gorjeta**

A configuração escolhida aparece como padrão no diálogo de finalizar comanda, mas o atendente pode ajustar caso a caso.

---

## 13. Cardápio público — o que o cliente final vê

URL: subdomínio próprio da padaria (ex: `suapadaria.ezzedev.com.br` ou domínio personalizado).

### O que aparece para o cliente

- Cabeçalho com nome e descrição da padaria
- Filtro de categorias em abas (Todas / Pães / Doces / Salgados / Bebidas...)
- Grid de produtos com: foto, nome, descrição, preço
- Badge "Esgotado" se o produto está sem estoque (e fica desabilitado)
- Badge "Destaque" se foi marcado como destaque no cadastro
- Botão **Pedir** que abre WhatsApp com mensagem pré-formatada (se a opção estiver ativa nas configurações)

### Detecção de mesa via QR Code (opcional)

Se a feature de QR de mesa está ativada, e o cliente acessou pelo QR code da mesa (ex: `/cardapio?mesa=5`), aparece no topo um destaque "Você está na Mesa 5", e essa informação vai junto quando o cliente faz pedido via WhatsApp.

### Por que importa

Cliente que olha o cardápio antes de chegar no balcão já vem decidido. Reduz fila e reduz o trabalho do atendente que não precisa explicar tudo. E o cardápio está sempre atualizado — sem cartaz desbotado na parede com preço de 2 anos atrás.

---

## 14. QR Codes de mesa (opcional)

Acessa por **QR Mesas** (só aparece se a feature estiver habilitada).

### Tela

Formulário simples:
- Número de mesas a gerar (padrão 10, máx 100)
- Começar em (padrão 1)
- Botão **Gerar QR Codes**

Após gerar, mostra um grid com os QR codes, cada um vinculado a uma mesa, com botões **Imprimir** e **Download PDF** para colar na mesa física da loja.

### Por que importa

Cliente sentou na mesa, escaneou o QR, viu o cardápio direto no celular dele, pediu via WhatsApp já com o número da mesa anotado automaticamente. O atendente recebe o pedido sabendo exatamente onde levar. Reduz erro e libera o atendente para a frente.

---

## 15. Fluxos completos do dia a dia

### Abrir a loja e começar a vender

1. Atendente liga o computador, abre o atalho **Painel Padaria**
2. Faz login
3. Vai em **Caixa**
4. Clica em **Abrir novo caixa**
5. Digita o valor de troco que está na gaveta (ex: R$ 100)
6. Clica em **Abrir Caixa** — entra no PDV automaticamente

### Atender um cliente

1. Clica em **+ Nova Comanda**
2. Seleciona o garçom (opcional)
3. Clica nos produtos que o cliente está levando
4. Conferiu? Clica em **Finalizar**
5. Pergunta a forma de pagamento, seleciona no diálogo
6. Se for PIX integrado, mostra o QR para o cliente escanear; senão, confirma direto
7. Imprime ou mostra o comprovante

### Receber mercadoria do fornecedor

1. Vai em **Estoque** > **Entrada**
2. Para cada item recebido: seleciona produto, digita quantidade, tipo "compra", observação com número da nota
3. Clica em **Registrar entrada**

### Fazer inventário (recomendado mensalmente)

1. Conta fisicamente cada produto da loja
2. Vai em **Estoque** > **Inventário**
3. Para cada produto, digita a quantidade contada
4. Clica em **Enviar Inventário** — o sistema ajusta o estoque automaticamente e o que sobrou vira "ajuste" no histórico

### Registrar uma perda

1. Pão queimou ou venceu, vai em **Estoque** > **Perdas**
2. Seleciona produto, quantidade, motivo (quebra / vencimento / roubo / ajuste / outro)
3. Confirma

### Fechar o dia

1. Última venda feita, clica em **Fechar Caixa** no canto superior do PDV
2. Confere o resumo: quanto vendeu em cada forma de pagamento
3. Conta a gaveta fisicamente
4. Digita o valor contado no campo **Valor em gaveta**
5. Olha a diferença: bateu? Sobrou? Faltou? Escreve observação se for o caso
6. Clica em **Confirmar Fechamento** — a sessão fecha e o relatório do dia já está disponível

### Olhar o desempenho da semana (dono)

1. Entra em **Relatórios** > **Vendas**
2. Define o intervalo (últimos 7 dias) e a granularidade (dia)
3. Vê o gráfico, o ticket médio, a distribuição por forma de pagamento
4. Volta e entra em **Produtos vendidos** para ver o que mais saiu
5. Volta e entra em **Análise de estoque** para ver onde está perdendo

---

## 16. Suporte e contato

**Ezequiel Rodrigues** — desenvolvedor e responsável pelo sistema

- WhatsApp: 64 99207-0004
- Email: ezequielrod2020@gmail.com

O sistema é instalado pelo Ezequiel pessoalmente na loja, com treinamento da equipe no local. Atualizações são distribuídas conforme novas versões.

---

*Última atualização deste manual: maio de 2026*
