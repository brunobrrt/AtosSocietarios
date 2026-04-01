# 📋 Sistema de Atos Societários

Sistema web para gestão de **Abertura**, **Alteração** e **Encerramento** de empresas.

## Como Usar

### Contabilidade
1. Abra `index.html` no navegador (painel direto)
2. Clique em "Novo Processo" pra criar uma solicitação
3. O sistema gera 2 links únicos — copie e envie pro cliente

### Cliente
1. Acessa o **link do formulário** (`?form=CODIGO`) → preenche os dados
2. Acessa o **link de acompanhamento** (`?status=CODIGO`) → vê o status
3. Sem login necessário!

## Funcionalidades

- 🏢 **Abertura de Empresa** — formulário completo com 12 campos, upload de docs, cálculo automático de participação
- ✏️ **Alteração do Contrato Social** — 7 tipos de alteração
- ❌ **Encerramento** — distrato social
- 📊 **Dashboard** — visão geral dos processos
- 🔐 **Controle de acesso** — contabilidade vs cliente
- 📎 **Upload de documentos** — IPTU, RG, CPF

## Stack

- HTML + CSS + JS vanilla
- Firebase Firestore (quando configurado)
- Armazenamento local (localStorage) como fallback

## Configurar Firebase

Edite `firebase-config.js` com suas credenciais do Firebase Console.

## Estrutura

```
atos-societarios/
├── index.html          ← Página principal
├── styles.css          ← Estilos
├── app.js              ← Lógica principal
├── firebase-config.js  ← Config Firebase
├── ESCOPO.md           ← Documento de escopo completo
└── README.md           ← Este arquivo
```

---

**v1.0** — 24/03/2026
