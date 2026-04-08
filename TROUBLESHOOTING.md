# 🐛 Troubleshooting — Erro no Navegador

## Sintomas
```
Uncaught SyntaxError: import declarations may only appear at top level of a module
TypeError: can't access property "appendChild", document.head is null
```

## Causas
1. **Extensões do navegador** (Adblock, Anti-Adblock Killer) injetam código e conflitam com scripts ES6
2. **Cache do navegador** — arquivos JS antigos (com `import`) ainda armazenados
3. **Múltiplas cargas do Firebase** — conflict entre compat e modular

## Soluções

### ✅ 1. Testar em Modo Anônimo (sem extensões)
- Abra navegador em **modo anônimo/privado**
- Desative extensões (ou use perfil limpo)
- Acesse o site

### ✅ 2. Limpar Cache e Hard Refresh
- **Chrome/Edge:** `Ctrl+Shift+Re` (ou `Ctrl+F5`)
- **Firefox:** `Ctrl+Shift+R`
- Limpe cache do site

### ✅ 3. Verificar Ordem dos Scripts (HTML)
Os scripts devem carregar **nesta ordem exata**:

```html
<!-- Firebase Compat SDKs (sem type="module") -->
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-functions-compat.js"></script>
<script src="firebase-config.js"></script>

<!-- App scripts (sem type="module") -->
<script src="auth.js" defer></script>
<script src="user-management.js" defer></script>
<script src="app.js" defer></script>
```

### ✅ 4. Verificar Console (F12)
Abra o console (F12) e procure:

- ✅ `Firebase inicializado` — deve aparecer
- ❌ `firebase is not defined` — SDK não carregou (problema de rede)
- ❌ `Erro ao obter role` — pode ser regras do Firestore não publicadas

### ✅ 5. Testar Localmente (antes de hospedar)
```bash
cd C:\AtosSocietarios
python3 -m http.server 8000
```
Acesse http://localhost:8000 — deve funcionar sem extensões.

### ✅ 6. Se ainda falhar — modo de emergência
Use **apenas Firebase Compat** (como no projeto Contabilidade que funciona):

1. Remova `firebase-functions-compat.js` (se não for usar Cloud Functions ainda)
2. Use apenas `app.js` simplificado (sem user-management)
3. Configure admin via script local (`setup-admin.js`)

---

## 🎯 Configuração Verificada

- [ ] firebase-config.js chama `firebase.initializeApp`
- [ ] Auth.js usa `firebase.auth()` global (não `import`)
- [ ] user-management.js usa `firebase.firestore()` global
- [ ] app.js não tem `import` statements
- [ ] Scripts no HTML **sem** `type="module"` (usam `defer`)
- [ ] SDKs compat carregados **antes** dos scripts da app
- [ ] Regras do Firestore publicadas
- [ ] Admin criado via `setup-admin.js` (executado localmente)

---

## 📞 Se nada funcionar

1. **Teste em outro navegador** (Chrome → Firefox)
2. **Desative todas extensões** (especialmente Adblockers)
3. **Verifique console** — erros específicos guiam a solução
4. **Veja inspetor de rede** — arquivos JS estão sendo carregados (status 200)?

---

Baseado no projeto `C:\Contabilidade` que funciona, essa estrutura (Compat API + scripts comuns) é sólida.
