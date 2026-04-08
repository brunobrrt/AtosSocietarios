# 🚀 CONFIGURAÇÃO RÁPIDA — Sistema de Login Atos Societários

## 1. Instalar dependências Node
```bash
cd /mnt/c/AtosSocietarios
npm init -y
npm install firebase-admin
```

## 2. Obter credenciais Firebase Admin SDK
1. Firebase Console → Projeto `atossocietarios-cc48d`
2. Configurações do Projeto → Contas de serviço
3. "Gerar nova chave privada" (JSON)
4. Salvar como `service-account.json` na raiz

## 3. Publicar Firestore Rules
```bash
firebase deploy --only firestore:rules
```
OU pelo console: cole o conteúdo de `firestore.rules` e publique.

## 4. Criar primeiro usuário Admin
```bash
node setup-admin.js
```
- Informe email (ex: `admin@t7system.com.br`)
- Role: `admin`

## 5. Testar
1. Abra `index.html` no navegador
2. Clique em **🔐 Login**
3. Entre com o admin criado
4. Veja o botão **👥 Gerenciar Usuários** aparecer

---

## 📂 Arquivos Adicionados
- `auth.js` — autenticação + roles
- `user-management.js` — gerenciamento de usuários (frontend)
- `setup-admin.js` — script CLI para criar/alterar usuários
- `AUTH-README.md` — documentação completa
- `firestore.rules` — regras atualizadas com roles

---

## 🔒 Permissões
- **Admin:** criar/editar/excluir processos, gerenciar usuários
- **Viewer:** apenas leitura
- **Público:** leitura via links (sem login)

---

Dúvidas? Consulte `AUTH-README.md`
