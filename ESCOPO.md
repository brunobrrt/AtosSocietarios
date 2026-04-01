# 📋 Escopo — Sistema de Gestão de Atos Societários

## Visão Geral

Sistema web para escritório de contabilidade gerenciar **Abertura**, **Alteração** e **Encerramento** de empresas. Clientes preenchem formulários online; a contabilidade acompanha e gerencia todo o processo.

**Stack:** HTML + CSS + JS vanilla + Firebase Firestore (mesmo template visual do sistema anterior)

**Hospedagem:** GitHub Pages → `https://brunobrrt.github.io/Contabilidade/atos-societarios/`

---

## 👥 Atores do Sistema

| Ator | Acesso | O que faz |
|------|--------|-----------|
| **Cliente** | Formulário online (link único) | Preenche dados, envia documentos, acompanha status |
| **Contabilidade** | Painel direto pela URL | Gerencia processos, altera status, acompanha etapas |

---

## 🏗️ Funcionalidades por Módulo

### 🔐 1. Acesso (sem login)

- **Contabilidade:** acessa o painel direto pela URL principal
- **Cliente:** acessa via **links únicos** gerados pelo sistema
  - `/?form={codigo}` → preenche os dados do processo (edição — uso único)
  - `/?status={codigo}` → acompanha o status (visualização — permanente)
- Cada processo gera **2 códigos aleatórios** diferentes
- O cliente **não precisa de login** — só acessar o link
- A contabilidade copia/envia os links via WhatsApp para o cliente
- **Link de edição é uso único:** após salvar, o link é invalidado. Se precisar alterar, o cliente deve entrar em contato com o escritório.

---

### 📊 2. PAINEL DA CONTABILIDADE

#### 2.1 Dashboard
- Cards de resumo: total de Aberturas, Alterações, Encerramentos, Pendentes
- Processos recentes (últimos 5)
- **Filtro por busca de texto** — campo de texto que filtra em tempo real por nome do cliente, razão social ou razão social 2. Funciona no dashboard e nas listas de cada aba.

#### 2.2 Abas
- 📊 Dashboard
- 🏢 Aberturas
- ✏️ Alterações
- ❌ Encerramentos

#### 2.3 Criar Novo Processo
1. Selecionar tipo (Abertura / Alteração / Encerramento)
2. Se Alteração → selecionar subtipo (7 opções)
3. Digitar nome do cliente/empresa (referência interna)
4. Sistema gera 2 links únicos automaticamente
5. Modal com os links prontos para copiar/enviar

#### 2.4 Modal de Detalhe do Processo
- Pipeline visual de etapas
- **Botões de ação por etapa:**
  - ▶ **Iniciar** → avança etapa para "em andamento" + **abre link oficial** do órgão (Rede Sim, DBE, ClickSign, JUCESP)
  - ✓ **Concluir** → marca etapa como concluída
- **Links do cliente:** botões "Copiar" para cada link
- **📋 Copiar mensagem WhatsApp:** copia mensagem formatada com os dois links para o clipboard (funcionário cola no chat que já tá aberto)
- **🔄 Gerar Novo Link de Edição:** invalida o anterior e gera novo código

#### 2.5 Visualização de Dados do Cliente (Modal)
- Mostra **todos os campos** preenchidos pelo cliente:
  - Razão Social (opção 1 e 2), Endereço, Capital Social
  - Atividade Principal/Secundária, Telefone, E-mail CNPJ
  - Porte (ME/EPP), Regime Tributário
- **Sócios com expand/collapse:**
  - Cada sócio é um card clicável (▶/▼)
  - Botão "Expandir todos" / "Recolher todos"
  - Detalhes: CPF, nacionalidade, profissão, estado civil, regime de casamento, endereço, valor da participação
  - Badges: Admin, Responsável RF
- **Filtro de busca de sócios** no modal — campo de texto que filtra por nome em tempo real

---

### 📝 3. ATO 1 — ABERTURA DE EMPRESA

#### 3.1 Formulário do Cliente

| # | Campo | Tipo | Observação |
|---|-------|------|------------|
| 1 | Razão Social (opção 1) | Texto | Nome da empresa |
| 2 | Razão Social (opção 2) | Texto | Nome alternativo |
| 3 | Endereço da Sede | Textarea | Endereço completo |
| 4 | IPTU | Upload (imagem/PDF) | Comprovante de endereço |
| 5 | Documentos dos Sócios | Upload (imagem/PDF) | RG, CPF — múltiplos |
| 6 | Sócios | Dinâmico (lista) | Ver campos abaixo |
| 7 | Capital Social | Numérico (R$) | Cálculo automático de participação |
| 8 | Atividade Principal | Texto | CNAE ou descrição |
| 9 | Atividade Secundária | Texto | CNAE ou descrição |
| 10 | Telefone | Texto | Dados públicos (CNPJ) |
| 11 | E-mail | E-mail | Sugestão: e-mail específico |
| 12 | Porte | Select | ME / EPP |
| 13 | Regime Tributário | Select | Simples / Presumido / Real |

#### 3.2 Campos por Sócio (dinâmico)

| Campo | Tipo | Observação |
|-------|------|------------|
| Nome Completo | Texto | Obrigatório |
| % Participação | Numérico | Cálculo automático em R$ |
| **CPF** | Texto (mascarado) | Validação em tempo real (verde=válido, vermelho=inválido) |
| Nacionalidade | Texto | Padrão: Brasileira |
| Profissão | Texto | |
| Estado Civil | Select | Solteiro/Casado/Divorciado/Viúvo/União Estável |
| Regime de Casamento | Select | Comunhão Parcial/Universal/Separação/Participação |
| Endereço Completo | Texto | |
| Administrador | Checkbox | |
| Responsável na RF | Radio | Apenas 1 por processo |

#### 3.3 Informativo no Formulário do Cliente
> 📌 **Informações Importantes**
> - Este link de preenchimento funciona **apenas uma vez**. Após salvar, ele será invalidado.
> - Caso precise alterar alguma informação após o envio, entre em **contato direto com o escritório**.
> - Para acompanhar o andamento do seu processo, utilize o **link de visualização** que foi enviado junto com este link.

#### 3.4 Fluxo Interno (etapas com links oficiais)

```
📋 Solicitação Criada
  → Rede Sim          [link: redesim.gov.br]
  → DBE               [link: SimplesNacional - Receita Federal]
  → ClickSign         [link: app.clicksign.com]
  → JUCESP            [link: jucesponline.sp.gov.br]
  → Exigência         [se houver]
  → Inscrições        [estadual/municipal]
✅ Empresa Aberta
```

Quando o funcionário clica em "▶ Iniciar" em uma etapa com link oficial, o sistema abre o site correspondente em uma nova aba automaticamente.

---

### ✏️ 4. ATO 2 — ALTERAÇÃO DO CONTRATO SOCIAL

#### 4.1 Tipos de Alteração (7)

| # | Tipo |
|---|------|
| 1 | Alteração da Razão Social |
| 2 | Alteração do Endereço |
| 3 | Alteração do Quadro Societário |
| 4 | Alteração do Objeto Social |
| 5 | Alteração das Cláusulas Vigentes |
| 6 | Transformação de Tipo Jurídico |
| 7 | Alteração do Capital Social |

#### 4.2 Fluxo Interno

```
📋 Solicitação Criada (com tipo selecionado)
  → Formulário
  → ClickSign         [link: app.clicksign.com]
  → JUCESP            [link: jucesponline.sp.gov.br]
  → Exigência
✅ Alteração Registrada
```

---

### ❌ 5. ATO 3 — ENCERRAMENTO (DISTRATO SOCIAL)

#### 5.1 Campos
- Distrato Social (upload ou geração)
- Documentos Pessoais dos Sócios (upload)
- Encerramento na Prefeitura

#### 5.2 Fluxo Interno

```
📋 Solicitação Criada
  → Distrato
  → Documentos
  → Prefeitura
✅ Encerrado
```

---

### 👤 6. PAINEL DO CLIENTE (via ?status=CÓDIGO)

- Título com razão social/nome do processo
- Pipeline visual de etapas (círculos conectados)
- Dados enviados pelo cliente
- Upload de documentos pendentes
- **Atualização em tempo real** (listener Firestore)

---

## 🔔 Notificações

| Evento | Para quem | Método |
|--------|-----------|--------|
| Cliente preenche formulário | Contabilidade | In-app (tempo real) |
| Status muda de etapa | Cliente | In-app (tempo real) |
| Processo concluído | Cliente | In-app |

---

## 💰 Valores

| Ato | Valor |
|-----|-------|
| Abertura | R$ 1.000,00 |
| Alteração | _(a definir)_ |
| Encerramento | _(a definir)_ |

---

## 🛠️ Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML + CSS + JS vanilla |
| Backend/DB | Firebase Firestore |
| Storage | Firebase Storage (uploads) |
| Hospedagem | GitHub Pages |
| Firebase Projeto | `contabilidade-b568c` |
| Firebase Coleção | `atos-societarios` |

---

## 📂 Estrutura de Pastas

```
atos-societarios/
├── index.html          ← Página principal (views: painel, formulário, status)
├── styles.css          ← Estilos
├── app.js              ← Lógica principal
├── firebase-config.js  ← Config Firebase
├── ESCOPO.md           ← Este documento
└── README.md           ← Documentação
```

---

## ✅ Funcionalidades Implementadas

- [x] Dashboard com cards de resumo
- [x] Abas (Aberturas, Alterações, Encerramentos)
- [x] **Filtro por busca de texto** (não dropdown)
- [x] Criação de processos com geração automática de links
- [x] Formulário completo do cliente (abertura)
- [x] **Validador de CPF** com máscara e validação em tempo real
- [x] Sócios dinâmicos com qualificação civil completa
- [x] Capital social com cálculo automático de participação
- [x] Upload de documentos
- [x] Pipeline visual de etapas
- [x] **Links oficiais** ao iniciar etapas (Rede Sim, DBE, ClickSign, JUCESP)
- [x] Controle de etapas pela contabilidade
- [x] Link de edição uso único
- [x] Botão "Gerar Novo Link de Edição"
- [x] Link de acompanhamento permanente
- [x] **📋 Copiar mensagem WhatsApp** (clipboard, não abre nova aba)
- [x] **Visualização completa dos dados do cliente** no modal de detalhe
- [x] **Expand/collapse sócios** com busca por nome
- [x] Listener em tempo real (painel e status do cliente)
- [x] Informativo de link único no formulário do cliente

---

## 🔄 O que falta

- [ ] Formulários específicos para cada tipo de alteração (7 tipos)
- [ ] Formulário de encerramento completo
- [ ] Notificações in-app
- [ ] Controle de prazos/alertas
- [ ] Integração ClickSign (API)
- [ ] Integração WhatsApp (notificações automáticas)
- [ ] Pagamento online
- [ ] Relatórios/exportação
- [ ] Restringir Firestore rules para produção

---

## ❓ Pendências de Definição

- [x] Como o cliente acessa? → **Links únicos (sem login)**
- [ ] Pagamento online (R$ 1.000) ou manual?
- [ ] ClickSign tem API disponível?
- [ ] Rede Sim tem API ou é manual?
- [ ] Valor para alteração e encerramento?
- [ ] Geração automática do contrato social?

---

**Versão:** 2.0 — 25/03/2026
**Últimas alterações:** filtro texto, links oficiais, CPF validator, expand/collapse sócios, visualização completa de dados, copiar WhatsApp via clipboard
