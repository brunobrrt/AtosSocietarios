// ===== GERENCIAMENTO DE USUÁRIOS (ADMIN) =====
// Funcionalidades: listar, criar, alterar role, remover usuários
// ATENÇÃO: Custom claims exigem Admin SDK (backend). Usaremos Cloud Functions ou script.

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

// ===== MODAL DE GERENCIAMENTO DE USUÁRIOS =====
export function abrirModalGerenciarUsuarios() {
    if (!verificarPermissao('admin')) return;
    const modal = document.getElementById('modal-gerenciar-usuarios');
    if (!modal) return;
    modal.style.display = 'flex';
    carregarListaUsuarios();
}

export function fecharModalGerenciarUsuarios() {
    const modal = document.getElementById('modal-gerenciar-usuarios');
    if (modal) modal.style.display = 'none';
}

// ===== CARREGAR LISTA DE USUÁRIOS (Firestore /users) =====
export async function carregarListaUsuarios() {
    const listaEl = document.getElementById('lista-usuarios');
    if (!listaEl) return;
    listaEl.innerHTML = '<div class="loading">Carregando...</div>';

    try {
        const snapshot = await getDocs(collection(db, 'users'));
        const usuarios = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));

        if (usuarios.length === 0) {
            listaEl.innerHTML = '<div class="empty-state">Nenhum usuário cadastrado.</div>';
            return;
        }

        let html = `
            <table class="users-table">
                <thead>
                    <tr>
                        <th>E-mail</th>
                        <th>Role</th>
                        <th>Criado em</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const user of usuarios) {
            const dataCriacao = user.createdAt?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A';
            const isSelf = user.uid === auth.currentUser?.uid;
            html += `
                <tr data-uid="${user.uid}">
                    <td>${escapeHtml(user.email || 'Sem email')}</td>
                    <td>
                        <span class="role-badge role-${user.role}">${user.role}</span>
                    </td>
                    <td>${dataCriacao}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="removerUsuario('${user.uid}', '${escapeHtml(user.email || '')}')" ${isSelf ? 'disabled' : ''}>
                            🗑️ Remover
                        </button>
                    </td>
                </tr>
            `;
        }

        html += '</tbody></table>';
        listaEl.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        listaEl.innerHTML = `<div class="error">Erro: ${escapeHtml(error.message)}</div>`;
    }
}

// ===== CRIAR NOVO USUÁRIO (via Cloud Function ou Admin) =====
// Como custom claims exigem Admin SDK, essa função abre uma explicação
export async function criarNovoUsuario() {
    if (!verificarPermissao('admin')) return;

    alert(
        "⚠️ Para criar usuários com role, você precisa executar o script `setup-admin.js` no servidor.\n\n" +
        "No terminal, na pasta do projeto, execute:\n" +
        "  node setup-admin.js\n\n" +
        "Ele vai pedir email e role (admin/viewer) e configurar tudo corretamente."
    );
}

// ===== ALTERAR ROLE (também via script) =====
export async function alterarRole(uid, novaRole) {
    alert(
        `⚠️ Para alterar a role do usuário (UID: ${uid}) para ${novaRole}, execute no servidor:\n\n` +
        `  node setup-admin.js\n\n` +
        `E informe o email do usuário e a nova role desejada.`
    );
}

// ===== REMOVER USUÁRIO =====
export async function removerUsuario(uid, email) {
    if (!confirm(`Remover usuário ${email}? Esta ação não pode ser desfeita.`)) return;

    try {
        // NO PRODUTO: idealmente usar Cloud Function com Admin SDK para remover do Auth + Firestore
        // Aqui removemos apenas o documento Firestore (user profile)
        await deleteDoc(doc(db, 'users', uid));
        alert('✅ Documento do usuário removido do Firestore.\nNota: Para remover completamente (Auth + Firestore), use Admin SDK.');
        carregarListaUsuarios();
    } catch (error) {
        alert('Erro ao remover: ' + error.message);
    }
}

// ===== UTILITÁRIOS =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

// ===== INICIALIZAÇÃO: adicionar botão no topbar =====
document.addEventListener('DOMContentLoaded', () => {
    const topbarUser = document.querySelector('.topbar-user');
    if (topbarUser && !document.getElementById('btn-gerenciar-users')) {
        const btn = document.createElement('button');
        btn.id = 'btn-gerenciar-users';
        btn.className = 'btn-topbar-gold admin-only';
        btn.style.cssText = 'margin-left:10px;';
        btn.innerHTML = '👥 Gerenciar Usuários';
        btn.onclick = abrirModalGerenciarUsuarios;
        topbarUser.appendChild(btn);
    }
});

// Exportar para window
window.abrirModalGerenciarUsuarios = abrirModalGerenciarUsuarios;
window.fecharModalGerenciarUsuarios = fecharModalGerenciarUsuarios;
window.carregarListaUsuarios = carregarListaUsuarios;
window.criarNovoUsuario = criarNovoUsuario;
window.alterarRole = alterarRole;
window.removerUsuario = removerUsuario;

// Exportar para window (HTML inline)
window.abrirModalGerenciarUsuarios = abrirModalGerenciarUsuarios;
window.fecharModalGerenciarUsuarios = fecharModalGerenciarUsuarios;
window.carregarListaUsuarios = carregarListaUsuarios;
window.criarNovoUsuario = criarNovoUsuario;
window.alterarRole = alterarRole;
window.removerUsuario = removerUsuario;
