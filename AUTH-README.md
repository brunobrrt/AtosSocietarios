# 🔐 Configuração do Sistema de Login — Atos Societários

## Visão Geral

O sistema agora possui autenticação com dois perfis:

- **Admin** — acesso total: criar/editar/excluir processos, gerenciar usuários
- **Viewer** — apenas leitura: visualizar processos, extrair informações

---

## 📋 Estrutura de Arquivos

```
AtosSocietarios/
├── auth.js                 # Módulo de autenticação (Firebase Auth + Custom Claims)
├── user-management.js      # Gerenciamento de usuários (frontend admin)
├── setup-admin.js          # Script Node.js para configurar admin inicial
├── firestore.rules         # Regras de segurança atualizadas
├── index.html              # Modal login + botões condicionais
├── app.js                  # Proteção de operações (admin-only)
├── service-account.json    # [criar] Credenciais Firebase Admin SDK
└── AUTH-README.md          # Este arquivo
```

---

## 🚀 Instalação e Configuração

### Passo 1 — Instalar dependências Node.js

```bash
cd /mnt/c/AtosSocietarios
npm init -y
npm install firebase-admin
```

### Passo 2 — Obter credenciais do Firebase Admin SDK

1. Acesse: https://console.firebase.google.com/project/atossocietarios-cc48d
2. Vá em **Configurações do Projeto** → **Contas de serviço**
3. Clique em **"Gerar nova chave privada"** (JSON)
4. Salve o arquivo como `service-account.json` na raiz do projeto

### Passo 3 — Publicar Firestore Rules

No console Firebase:
1. Vá em **Firestore Database** → **Rules**
2. Cole o conteúdo de `firestore.rules`
3. Clique em **"Publicar"**

Ou via CLI:
```bash
firebase deploy --only firestore:rules
```

### Passo 4 — Criar o primeiro usuário Admin

```bash
node setup-admin.js
```

O script vai pedir:
- Email do usuário (ex: `admin@t7system.com.br`)
- Role (`admin` ou `viewer`)

Ele criará (ou encontrará) o usuário no Firebase Auth e definirá a role.

### Passo 5 — Testar

1. Abra o sistema no navegador
2. Clique em **"🔐 Login"**
3. Use o email/senha que você configurou
4. Se for admin, o botão **"➕ Novo Processo"** e **"👥 Gerenciar Usuários"** aparecerão

---

## 👥 Gerenciar Usuários (Admin)

Após logado como admin:

1. Clique em **"👥 Gerenciar Usuários"** no topbar
2. **Criar novo usuário:**
   - Preencha email, senha e role
   - Clique em "Criar Usuário"
   - ⚠️ Custom claims exigem Admin SDK — o sistema orienta a usar `setup-admin.js`
3. **Alterar role:** use o dropdown ao lado do usuário (se for admin, não pode alterar próprio role)
4. **Remover:** remove o documento do usuário (recomenda-se usar Admin SDK para remover também do Auth)

---

## 🔒 Segurança

| Camada | Descrição |
|--------|-----------|
| **Firebase Auth** | Senhas armazenadas com hash (bcrypt) |
| **Custom Claims** | Role salva no token JWT (performático) |
| **Firestore Rules** | Validação no servidor (backend) |
| **Frontend Checks** | Botões condicionais por role (admin-only, no-viewer) |
| **Links Públicos** | Continuam funcionando sem login (apenas leitura) |

---

## 🛠️ Manutenção

### Adicionar novo admin via script
```bash
node setup-admin.js
# Informar email e role: admin
```

### Resetar senha de usuário
Via Firebase Console → Authentication → Users → Reset password

### Alterar role de usuário existente
```bash
node setup-admin.js
# Informar email e nova role
```

### Revogar acesso
Remover documento da coleção `users` e/ou desativar usuário no Firebase Auth

---

## 📚 Referências

- Firebase Auth: https://firebase.google.com/docs/auth
- Custom Claims: https://firebase.google.com/docs/auth/admin/custom-claims
- Firestore Rules: https://firebase.google.com/docs/firestore/security/get-started
