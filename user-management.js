// ===== GERENCIAMENTO DE USUÁRIOS — CLOUD FUNCTIONS =====
// Frontend chama Firebase Functions para operações com Admin SDK

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

const auth = getAuth();
const db = getFirestore();
const functions = getFunctions("us-central1"); // Região das functions

// ===== MODAL =====
export function abrirModalGerenciarUsuarios() {
    if (!verificarPermissao('admin')) return;
    const modal = document.getElementById('modal-gerenciar-usuarios');
    if (modal) {
        modal.style.display = 'flex';
        carregarListaUsuarios();
    }
}

export function fecharModalGerenciarUsuarios() {
    const modal = document.getElementById('modal-gerenciar-usuarios');
    if (modal) modal.style.display = 'none';
}

// ===== CARREGAR LISTA DE USUÁRIOS (Firestore /users) =====
export async function carregarListaUsuarios() {
    const listaEl = document.getElementById('lista-usuarios');
    if (!listaEl) return;
    listaEl.innerHTML = '<div class="loading">⏳ Carregando...</div>';

    try {
        const snapshot = await getDocs(collection(db, 'users'));
        const usuarios = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));

        if (usuarios.length === 0) {
            listaEl.innerHTML = '<div class="empty-state">📭 Nenhum usuário cadastrado.</div>';
            return;
        }

        let html = `
            <table class="users-table">
                <thead>
                    <tr>
                        <th>E-mail</th>
                        <th>Role</th>
                        <th>Criado</th>
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
                    <td>${escapeHtml(user.email || '—')}</td>
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
        listaEl.innerHTML = `<div class="error">❌ Erro: ${escapeHtml(error.message)}</div>`;
    }
}

// ===== CLOUD FUNCTION: CRIAR USUÁRIO =====
export async function criarNovoUsuario() {
    if (!verificarPermissao('admin')) return;

    const email = document.getElementById('novo-user-email')?.value.trim();
    const senha = document.getElementById('novo-user-senha')?.value;
    const role = document.getElementById('novo-user-role')?.value;

    if (!email || !senha || !role) {
        alert('⚠️ Preencha email, senha e role.');
        return;
    }

    try {
        const createUser = httpsCallable(functions, 'manageUser');
        await createUser({ action: 'create', email, senha, role });
        alert(`✅ Usuário ${email} criado com sucesso!`);
        document.getElementById('novo-user-email').value = '';
        document.getElementById('novo-user-senha').value = '';
        carregarListaUsuarios();
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        alert('❌ Erro ao criar usuário: ' + error.message);
    }
}

// ===== CLOUD FUNCTION: ALTERAR ROLE =====
export async function alterarRole(uid, novaRole) {
    if (!confirm(`🎯 Alterar role para "${novaRole}"?`)) return;

    try {
        const updateRole = httpsCallable(functions, 'manageUser');
        await updateRole({ action: 'updateRole', uid, role: novaRole });
        alert('✅ Role atualizada!');
        carregarListaUsuarios();
    } catch (error) {
        alert('❌ ' + error.message);
    }
}

// ===== CLOUD FUNCTION: REMOVER USUÁRIO =====
export async function removerUsuario(uid, email) {
    if (!confirm(`🗑️ Remover usuário "${email}"? Esta ação não pode ser desfeita.`)) return;

    try {
        const deleteUser = httpsCallable(functions, 'manageUser');
        await deleteUser({ action: 'delete', uid });
        alert('✅ Usuário removido!');
        carregarListaUsuarios();
    } catch (error) {
        alert('❌ Erro ao remover: ' + error.message);
    }
}

// ===== UTILITÁRIOS =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

// ===== INICIALIZAÇÃO: botão no topbar =====
document.addEventListener('DOMContentLoaded', () => {
    const topbarUser = document.querySelector('.topbar-user');
    if (topbarUser && !document.getElementById('btn-gerenciar-users')) {
        const btn = document.createElement('button');
        btn.id = 'btn-gerenciar-users';
        btn.className = 'btn-topbar-gold admin-only';
        btn.style.cssText = 'margin-left:10px; display:none;';
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
