# 🏢 Guia de Teste — Sistema de Login (Escritório)

**Objetivo:** Testar o sistema de login com roles (admin/viewer) online.

---

## 📋 Pré-requisitos

- GitHub Pages já hospedado (ou Firebase Hosting)
- Firebase Projeto: `atossocietarios-cc48d`
- Acesso ao console Firebase

---

## 🚀 Passo a passo para colocar online

### 1. Configurar Cloud Functions (backend)

**No seu computador (ou servidor):**

```bash
# Ir para a pasta do projeto
cd C:\AtosSocietarios

# Instalar Firebase CLI (se não tiver)
npm install -g firebase-tools

# Fazer login
firebase login
```

```bash
# Inicializar functions (se ainda não fez)
firebase init functions
# - Selecione o projeto: atossocietarios-cc48d
# - Linguagem: JavaScript
# - ESLint: Yes
# - Install dependencies: Yes
```

```bash
# Instalar dependências
cd functions
npm install
cd ..
```

```bash
# Fazer deploy das functions
firebase deploy --only functions
```

**Resultado:** Functions `manageUser` e `getCurrentUser` ficam online em `https://us-central1-atossocietarios-cc48d.cloudfunctions.net/`

---

### 2. Publicar Firestore Rules

No console Firebase (https://console.firebase.google.com):

1. Vá em **Firestore Database** → **Rules**
2. Cole o conteúdo do arquivo `firestore.rules` do projeto
3. Clique em **Publicar**

**Regras:** Leitura pública, escrita apenas para admins.

---

### 3. Criar primeiro usuário Admin

Como ainda não temos function para criar admin, use o script local:

```bash
cd C:\AtosSocietarios
npm init -y
npm install firebase-admin
```

Baixe `service-account.json`:
1. Firebase Console → ⚙️ Configurações do Projeto
2. **Contas de serviço**
3. **Gerar nova chave privada** (JSON)
4. Salve como `C:\AtosSocietarios\service-account.json`

Execute:
```bash
node setup-admin.js
```
- Email: `admin@t7system.com.br` (ou outro)
- Senha: (será gerada, você pode definir)
- Role: `admin`

✅ Admin criado no Firebase Auth com role correta.

---

### 4. Hospedar Frontend

**Se já está no GitHub Pages:**
```bash
git add -A
git commit -m "feat: sistema de login online"
git push origin main
```
Aguarde 1–2 minutos para o GitHub Pages atualizar.

**Se usar Firebase Hosting:**
```bash
firebase init hosting
# Selecione diretório: (raiz do projeto)
firebase deploy --only hosting
```

---

## ✅ Teste de Funcionalidade

1. Acesse o site online (ex: `https://brunobrrt.github.io/AtosSocietarios/`)
2. Clique em **🔐 Login**
3. Use o admin criado
4. **Verifique:**
   - ✅ Botão **👥 Gerenciar Usuários** aparece
   - ✅ Botão **➕ Novo Processo** aparece
   - ✅ Topbar mostra email & role
5. Clique **Gerenciar Usuários**
   - ✅ Lista de usuários (se houver)
   - ✅ Formulário para criar novo usuário
   - ✅ Crie um usuário `viewer` (email, senha, role)
6. Faça logout
7. Login com o `viewer`
8. **Verifique:**
   - ❌ **Botão Novo Processo NÃO aparece**
   - ❌ **Botão Gerenciar Usuários NÃO aparece**
   - ✅ Pode visualizar processos (dashboard, listas)
9. Teste links públicos (sem login) — devem funcionar (apenas leitura)

---

## 🎯 Para o escritório usar

### Criar usuários (admin)
1. Logar como admin
2. Topbar → **👥 Gerenciar Usuários**
3. Preencher email, senha, escolher role
4. Clique **Criar Usuário**
5. O usuário recebe uma conta ativa

### Visualizar processos (viewer)
1. Viewer faz login
2. Vê todos os processos (dashboard, abas)
3. Não pode criar/editar/remover

### Acesso sem login (clientes)
- Links de formulário e status continuam funcionando
- Visualização apenas (sem botões de ação)

---

## 🔐 Segurança

| Camada | Como funciona |
|--------|---------------|
| **Firebase Auth** | Senhas hash, autenticação segura |
| **Custom Claims** | Role salva no token JWT (setada pela Cloud Function) |
| **Firestore Rules** | `allow write: if request.auth.token.role == 'admin'` |
| **Cloud Functions** | Verificam role antes de criar/alterar usuários |
| **Frontend** | Classes CSS `admin-only` e `no-viewer` escondem botões |

---

## 🛠️ Manutenção

### Adicionar novo admin
- Logar como admin existente
- Gerenciar Usuários → Criar → role: admin

### Resetar senha
- Firebase Console → Authentication → Users → Reset password

### Remover usuário
- No modal Gerenciar → 🗑️ Remover
- Remove apenas o documento `/users/{uid}` (Auth permanece)
- Para remover totalmente, use Firebase Console ou Admin SDK

### Ver logs das functions
```bash
firebase functions:log
```

---

## 📚 Arquivos importantes

```
C:\AtosSocietarios\
├── functions/
│   ├── index.js        ← Cloud Functions (manageUser, getCurrentUser)
│   └── package.json    ← dependências
├── auth.js             ← autenticação frontend
├── user-management.js  ← gerenciamento (chama functions)
├── firestore.rules     ← regras de segurança
├── index.html          ← interface
├── app.js              ← lógica principal
└── DEPLOY-ONLINE.md   ← detalhes técnicos
```

---

## ❓ Dúvidas?

- Consulte `DEPLOY-ONLINE.md` para detalhes técnicos
- Consulte `AUTH-README.md` para arquitetura completa

Boa testagem! 🚀
