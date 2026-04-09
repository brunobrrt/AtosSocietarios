// ===== GERENCIAMENTO DE USUÁRIOS — CLOUD FUNCTIONS (Compat API) =====
// Usa global `firebase` — SEM import/export

const umAuth = firebase.auth();
const umDb = firebase.firestore();
const umFunctions = firebase.app().functions('us-central1');

// ===== MODAL =====
function abrirModalGerenciarUsuarios() {
    if (!window.verificarPermissao('admin')) return;
    const modal = document.getElementById('modal-gerenciar-usuarios');
    if (modal) {
        modal.style.display = 'flex';
        carregarListaUsuarios();
    }
}

function fecharModalGerenciarUsuarios() {
    const modal = document.getElementById('modal-gerenciar-usuarios');
    if (modal) modal.style.display = 'none';
}

// ===== CARREGAR LISTA (via Cloud Function — Admin SDK, sem restrições de regras) =====
async function carregarListaUsuarios() {
    const listaEl = document.getElementById('lista-usuarios');
    if (!listaEl) return;
    listaEl.innerHTML = '<div style="color:var(--text-light);font-size:0.9rem;">⏳ Carregando...</div>';

    try {
        const manageUser = umFunctions.httpsCallable('manageUser');
        const result = await manageUser({ action: 'list' });
        const usuarios = result.data.usuarios || [];

        if (usuarios.length === 0) {
            listaEl.innerHTML = '<div style="color:var(--text-light);font-size:0.9rem;">📭 Nenhum usuário cadastrado.</div>';
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
            const dataCriacao = user.createdAt
                ? new Date(user.createdAt).toLocaleDateString('pt-BR')
                : 'N/A';
            const isSelf = user.uid === umAuth.currentUser?.uid;
            html += `
                <tr data-uid="${user.uid}">
                    <td>${escapeHtml(user.email || '—')}</td>
                    <td>
                        <span class="role-badge role-${user.role}">${user.role}</span>
                    </td>
                    <td>${dataCriacao}</td>
                    <td>
                        <button class="btn btn-small btn-danger" onclick="removerUsuario('${user.uid}', '${escapeHtml(user.email || '')}')" ${isSelf ? 'disabled title="Não é possível remover a si mesmo"' : ''}>
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
        listaEl.innerHTML = `<div style="color:var(--danger);font-size:0.9rem;">❌ Erro: ${escapeHtml(error.message)}</div>`;
    }
}

// ===== CLOUD FUNCTION: CRIAR USUÁRIO =====
async function criarNovoUsuario() {
    if (!window.verificarPermissao('admin')) return;

    const email = document.getElementById('novo-user-email')?.value.trim();
    const senha = document.getElementById('novo-user-senha')?.value;
    const role = document.getElementById('novo-user-role')?.value;

    if (!email || !senha || !role) {
        alert('⚠️ Preencha email, senha e role.');
        return;
    }

    try {
        const createUser = umFunctions.httpsCallable('manageUser');
        await createUser({ action: 'create', email, senha, role });
        alert(`✅ Usuário ${email} criado com sucesso!`);
        document.getElementById('novo-user-email').value = '';
        document.getElementById('novo-user-senha').value = '';
        carregarListaUsuarios();
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        // error.message contém o código; error.details contém a mensagem real
        const msg = error.details || error.message || 'Erro desconhecido';
        alert('❌ Erro ao criar usuário: ' + msg);
    }
}

// ===== CLOUD FUNCTION: ALTERAR ROLE =====
async function alterarRole(uid, novaRole) {
    if (!confirm(`🎯 Alterar role para "${novaRole}"?`)) return;

    try {
        const updateRole = umFunctions.httpsCallable('manageUser');
        await updateRole({ action: 'updateRole', uid, role: novaRole });
        alert('✅ Role atualizada!');
        carregarListaUsuarios();
    } catch (error) {
        alert('❌ ' + error.message);
    }
}

// ===== CLOUD FUNCTION: REMOVER USUÁRIO =====
async function removerUsuario(uid, email) {
    if (!confirm(`🗑️ Remover usuário "${email}"? Esta ação não pode ser desfeita.`)) return;

    try {
        const deleteUser = umFunctions.httpsCallable('manageUser');
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
