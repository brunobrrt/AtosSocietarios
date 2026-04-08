# 🌐 Deploy Online — GitHub Pages + Firebase Cloud Functions

## Configurar backend (Cloud Functions) para gerenciamento de usuários

### Passo 1 — Prerequisites
- Node.js 18+ instalado
- Conta no Firebase (projeto `atossocietarios-cc48d`)
- GitHub Pages configurado (frontend já hospedado)

### Passo 2 — Instalar Firebase CLI
```bash
npm install -g firebase-tools
```

### Passo 3 — Login
```bash
firebase login
```
(Use a conta que tem acesso ao projeto `atossocietarios-cc48d`)

### Passo 4 — Inicializar Functions
```bash
cd C:\AtosSocietarios
firebase init functions
```

**Responda:**
- Select a project: `atossocietarios-cc48d`
- Language: **JavaScript**
- ESLint: **Yes**
- Install dependencies: **Yes**

Isso cria a pasta `functions/` (se já não existe).

### Passo 5 — Copiar arquivos functions
Já temos:
- `functions/index.js` — sua Cloud Function
- `functions/package.json` — dependências

Se a pasta não existir, crie:
```bash
mkdir -p functions
# Cole index.js e package.json lá
```

### Passo 6 — Instalar dependências
```bash
cd functions
npm install
```

### Passo 7 — Deploy
```bash
firebase deploy --only functions
```

**Resultado esperado:**
```
✔  functions[manageUser] successfully deployed
✔  functions[getCurrentUser] successfully deployed
```

---

## 📝 Publicar Firestore Rules

No console Firebase:
1. Acesse **Firestore Database** → **Rules**
2. Cole o conteúdo de `firestore.rules`
3. Clique em **Publicar**

Ou via CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 👤 Criar primeiro admin (local — uma vez)

Como a function `manageUser` só pode ser chamada por admin, precisamos de um admin inicial.

```bash
cd C:\AtosSocietarios
npm init -y
npm install firebase-admin
```

**Baixe `service-account.json`:**
1. Firebase Console → Projeto → ⚙️ Configurações
2. **Contas de serviço**
3. **Ger nova chave privada** (JSON)
4. Salve como `C:\AtosSocietarios\service-account.json`

**Execute:**
```bash
node setup-admin.js
```
- Email: ex `admin@t7system.com.br`
- Role: `admin`

✅ Admin criado! Agora ele pode logar no site.

---

## 🌍 Hospedar Frontend

Se já está no GitHub Pages, só fazer commit e push.

```bash
cd C:\AtosSocietarios
git add -A
git commit -m "feat: login system com roles"
git push origin main
```

GitHub Pages automaticamente atualiza (em alguns minutos).

**URL típica:** `https://brunobrrt.github.io/AtosSocietarios/`

---

## ✅ Teste completo

1. Acesse o site online
2. Clique **🔐 Login**
3. Entre com o admin criado
4. Veja os botões:
   - **👥 Gerenciar Usuários** (topbar)
   - **➕ Novo Processo** (topbar)
5. Em Gerenciar:
   - Crie um usuário viewer
   - Crie outro admin (opcional)
6. Faça logout
7. Login com o viewer
8. **Verifique:**
   - Botão **Novo Processo** NÃO aparece
   - Botão **Gerenciar Usuários** NÃO aparece
   - Pode visualizar processos normalmente

---

## 🔒 Segurança

| Camada | Proteção |
|--------|----------|
| **Firebase Auth** | Senhas hash, autenticação robusta |
| **Custom Claims** | Role salva no token JWT |
| **Firestore Rules** | Apenas admins escrevem (`allow write: if request.auth.token.role == 'admin'`) |
| **Cloud Functions** | Verificam `context.auth.token.role` antes de operar |
| **Frontend** | Classes `admin-only` / `no-viewer` escondem elementos |

---

## 🛠️ Manutenção

### Adicionar novos usuários (admin online)
1. Logar como admin
2. Click **👥 Gerenciar Usuários**
3. Preencher email, senha, role
4. Criar

### Alterar role de alguém
- No modal Gerenciar, use o dropdown ao lado do usuário

### Remover usuário
- Botão **🗑️ Remover** (não remove do Auth, apenas do Firestore/users)
- Para remover totalmente, use o Admin SDK (ou future function delete)

### Resetar senha
Firebase Console → Authentication → Users → Reset password

---

## 📂 Arquivos deployados

```
/ (GitHub Pages)
├── index.html
├── styles.css
├── app.js
├── auth.js
├── user-management.js
├── firebase-config.js
└── ... (outros assets)

Firebase:
- Firebase Auth (usuários)
- Firestore (dados)
- Cloud Functions (manageUser, getCurrentUser)
- Hosting (opcional)
```

---

## 🚨 Troubleshooting

**Erro: "function not found"**
- Funções não deployadas? Rode `firebase deploy --only functions`
- Região: se sua função está em outra região, especifique: `getFunctions('us-central1')`

**Erro: "permission-denied"**
- O usuário não é admin? Verifique custom claims no Firebase Console
- Chame `getCurrentUser` para debug

**Erro: "quota exceeded"**
- Plano gratuito do Firebase tem limites. Considere upgrade.

---

## 📞 Suporte

Consulte `AUTH-README.md` para mais detalhes técnicos.
