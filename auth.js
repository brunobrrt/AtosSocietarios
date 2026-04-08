// ===== AUTENTICAÇÃO E CONTROLE DE ACESSO =====
// Firebase Auth + Custom Claims (roles: admin, viewer)

import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

// ===== ESTADO =====
let usuarioAtual = null;
let usuarioRole = null; // 'admin' | 'viewer' | null

// ===== INICIALIZAÇÃO =====
export function inicializarAuth() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                usuarioAtual = user;
                usuarioRole = await obterRoleUsuario(user);
                console.log('Usuário autenticado:', user.email, '| Role:', usuarioRole);
                resolve({ user, role: usuarioRole });
            } else {
                usuarioAtual = null;
                usuarioRole = null;
                console.log('Nenhum usuário autenticado');
                resolve(null);
            }
        });
    });
}

// ===== LOGIN =====
export async function login(email, senha) {
    try {
        const credential = await signInWithEmailAndPassword(auth, email, senha);
        const user = credential.user;
        usuarioAtual = user;
        usuarioRole = await obterRoleUsuario(user);
        return { success: true, user, role: usuarioRole };
    } catch (error) {
        console.error('Erro no login:', error.message);
        return { success: false, error: error.message };
    }
}

// ===== LOGOUT =====
export function logout() {
    return signOut(auth).then(() => {
        usuarioAtual = null;
        usuarioRole = null;
        return { success: true };
    }).catch(error => {
        console.error('Erro no logout:', error.message);
        return { success: false, error: error.message };
    });
}

// ===== BUSCAR ROLE DO USUÁRIO =====
async function obterRoleUsuario(user) {
    try {
        // 1. Custom claims (setados via Admin SDK)
        const token = await user.getIdTokenResult();
        if (token.claims.role) {
            return token.claims.role;
        }

        // 2. Firestore /users
        const userDoc = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userDoc);
        if (snapshot.exists()) {
            return snapshot.data().role || 'viewer';
        }

        // 3. Criar perfil padrão viewer
        await setDoc(userDoc, {
            email: user.email,
            role: 'viewer',
            createdAt: new Date().toISOString()
        });
        return 'viewer';
    } catch (error) {
        console.error('Erro ao obter role:', error);
        return null;
    }
}

// ===== VERIFICAÇÕES =====
export function isAuthenticated() { return usuarioAtual !== null; }
export function isAdmin() { return usuarioRole === 'admin'; }
export function isViewer() { return usuarioRole === 'viewer'; }
export function getCurrentUser() { return usuarioAtual; }
export function getCurrentRole() { return usuarioRole; }

// ===== UI: APLICAR RESTRIÇÕES =====
export function aplicarRestricoesUI() {
    // Elementos apenas para admin
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin() ? '' : 'none';
    });
    // Elementos bloqueados para viewer (admin-only já cobre, mas no-viewer é explícito)
    document.querySelectorAll('.no-viewer').forEach(el => {
        el.style.display = isAdmin() ? '' : 'none';
    });
    atualizarBotaoAuth();
}

function atualizarBotaoAuth() {
    const loginBtn = document.getElementById('btn-login');
    const logoutBtn = document.getElementById('btn-logout');
    const userInfo = document.getElementById('user-info');

    if (isAuthenticated()) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = '';
        if (userInfo) {
            userInfo.style.display = '';
            userInfo.textContent = `${usuarioAtual.email} (${usuarioRole})`;
        }
    } else {
        if (loginBtn) loginBtn.style.display = '';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'none';
    }
}

// ===== VERIFICAR PERMISSÃO =====
export function verificarPermissao(roleNecessario = 'admin') {
    if (!isAuthenticated()) {
        alert('Você precisa estar autenticado para realizar esta ação.');
        return false;
    }
    if (roleNecessario === 'admin' && !isAdmin()) {
        alert('Acesso negado. Apenas administradores podem realizar esta ação.');
        return false;
    }
    return true;
}

// ===== FUNÇÕES DE UI: MODAL LOGIN/LOGOUT =====
export function abrirModalLogin() {
    const modal = document.getElementById('modal-login');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('login-error').textContent = '';
        document.getElementById('login-email').value = '';
        document.getElementById('login-senha').value = '';
    }
}

export function fecharModalLogin() {
    const modal = document.getElementById('modal-login');
    if (modal) modal.style.display = 'none';
}

export async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    if (!email || !senha) {
        errorEl.textContent = 'Preencha email e senha.';
        return;
    }

    const result = await login(email, senha);
    if (result.success) {
        fecharModalLogin();
        aplicarRestricoesUI();
        // Atualizar painel se estiver visível
        const painel = document.getElementById('view-painel');
        if (painel && painel.style.display !== 'none') {
            renderizarPainel();
        }
    } else {
        errorEl.textContent = result.error || 'Erro ao fazer login';
    }
}

export async function handleLogout() {
    await logout();
    aplicarRestricoesUI();
    const painel = document.getElementById('view-painel');
    if (painel && painel.style.display !== 'none') {
        renderizarPainel();
    }
}

// ===== EXPORTAR PARA WINDOW (HTML inline events) =====
window.abrirModalLogin = abrirModalLogin;
window.fecharModalLogin = fecharModalLogin;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.verificarPermissao = verificarPermissao;
window.aplicarRestricoesUI = aplicarRestricoesUI;
