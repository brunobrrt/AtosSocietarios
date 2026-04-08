// ===== AUTENTICAÇÃO E CONTROLE DE ACESSO (Compat API) =====
// Usa global `firebase` carregado via script tags (compat)
// SEM import/export — funciona como script comum

// ===== ESTADO =====
let usuarioAtual = null;
let usuarioRole = null;

// ===== INICIALIZAÇÃO =====
function inicializarAuth() {
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged(async (user) => {
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
async function login(email, senha) {
    try {
        const credential = await firebase.auth().signInWithEmailAndPassword(email, senha);
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
function logout() {
    return firebase.auth().signOut().then(() => {
        usuarioAtual = null;
        usuarioRole = null;
        return { success: true };
    }).catch(error => {
        console.error('Erro no logout:', error.message);
        return { success: false, error: error.message };
    });
}

// ===== BUSCAR ROLE =====
async function obterRoleUsuario(user) {
    try {
        // 1. Custom claims
        const token = await user.getIdTokenResult();
        if (token.claims.role) {
            return token.claims.role;
        }

        // 2. Firestore /users
        const userDoc = firebase.firestore().collection('users').doc(user.uid);
        const snapshot = await userDoc.get();
        if (snapshot.exists) {
            return snapshot.data().role || 'viewer';
        }

        // 3. Criar perfil viewer padrão
        await userDoc.set({
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
function isAuthenticated() { return usuarioAtual !== null; }
function isAdmin() { return usuarioRole === 'admin'; }
function isViewer() { return usuarioRole === 'viewer'; }
function getCurrentUser() { return usuarioAtual; }
function getCurrentRole() { return usuarioRole; }

// ===== UI: APLICAR RESTRIÇÕES =====
function aplicarRestricoesUI() {
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin() ? '' : 'none';
    });
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
function verificarPermissao(roleNecessario = 'admin') {
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

// ===== FUNÇÕES UI: MODAL LOGIN/LOGOUT =====
function abrirModalLogin() {
    const modal = document.getElementById('modal-login');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('login-error').textContent = '';
        document.getElementById('login-email').value = '';
        document.getElementById('login-senha').value = '';
    }
}

function fecharModalLogin() {
    const modal = document.getElementById('modal-login');
    if (modal) modal.style.display = 'none';
}

async function handleLogin(event) {
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
        // Mostrar painel após login bem-sucedido
        mostrarPainel();
        aplicarRestricoesUI();
        if (typeof renderizarPainel === 'function') {
            renderizarPainel();
        }
    } else {
        errorEl.textContent = result.error || 'Erro ao fazer login';
    }
}

async function handleLogout() {
    await logout();
    // Esconder painel e mostrar login
    esconderPainel();
    abrirModalLogin();
}

// ===== CONTROLE DE VISIBILIDADE DAS VIEWS =====
function mostrarPainel() {
    const viewPainel = document.getElementById('view-painel');
    const loading = document.getElementById('loading-screen');
    if (viewPainel) viewPainel.style.display = 'block';
    if (loading) loading.style.display = 'none';
}

function esconderPainel() {
    const viewPainel = document.getElementById('view-painel');
    const loading = document.getElementById('loading-screen');
    if (viewPainel) viewPainel.style.display = 'none';
    if (loading) loading.style.display = 'flex';
}

// ===== EXPORTAR PARA WINDOW (globais) =====
window.inicializarAuth = inicializarAuth;
window.verificarPermissao = verificarPermissao;
window.aplicarRestricoesUI = aplicarRestricoesUI;
window.abrirModalLogin = abrirModalLogin;
window.fecharModalLogin = fecharModalLogin;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.isAdmin = isAdmin;
window.isViewer = isViewer;
window.mostrarPainel = mostrarPainel;
window.esconderPainel = esconderPainel;
