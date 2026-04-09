// ===== GERENCIAMENTO DE USUÁRIOS — Firestore direto (sem Cloud Functions) =====
// Usa global `firebase` — SEM import/export

const umAuth = firebase.auth();
const umDb = firebase.firestore();

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

// ===== CARREGAR LISTA (Firestore direto) =====
async function carregarListaUsuarios() {
    const listaEl = document.getElementById('lista-usuarios');
    if (!listaEl) return;
    listaEl.innerHTML = '<div style="color:var(--text-light);font-size:0.9rem;">⏳ Carregando...</div>';

    try {
        const snapshot = await umDb.collection('users').orderBy('email').get();
        const usuarios = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));

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
            const dataCriacao = user.createdAt?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A';
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

// ===== CRIAR USUÁRIO (app secundário — não desloga o admin) =====
async function criarNovoUsuario() {
    if (!window.verificarPermissao('admin')) return;

    const email = document.getElementById('novo-user-email')?.value.trim();
    const senha = document.getElementById('novo-user-senha')?.value;
    const role = document.getElementById('novo-user-role')?.value;

    if (!email || !senha || !role) {
        alert('⚠️ Preencha e-mail, senha e perfil.');
        return;
    }
    if (senha.length < 6) {
        alert('⚠️ A senha deve ter pelo menos 6 caracteres.');
        return;
    }

    const btnCriar = document.querySelector('#modal-gerenciar-usuarios button.btn-primary');
    if (btnCriar) { btnCriar.disabled = true; btnCriar.textContent = '⏳ Criando...'; }

    try {
        // App secundário para criar o usuário sem deslogar o admin
        const secondaryApp = firebase.apps.find(a => a.name === 'Secondary') ||
                             firebase.initializeApp(firebase.app().options, 'Secondary');

        const credential = await secondaryApp.auth().createUserWithEmailAndPassword(email, senha);
        const novoUid = credential.user.uid;

        // Desloga imediatamente do app secundário
        await secondaryApp.auth().signOut();

        // Salva role no Firestore como admin (app principal)
        await umDb.collection('users').doc(novoUid).set({
            email,
            role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('novo-user-email').value = '';
        document.getElementById('novo-user-senha').value = '';
        alert(`✅ Usuário ${email} criado com sucesso!`);
        carregarListaUsuarios();

    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        const msgs = {
            'auth/email-already-in-use': 'E-mail já está em uso.',
            'auth/invalid-email':        'E-mail inválido.',
            'auth/weak-password':        'Senha muito fraca (mínimo 6 caracteres).'
        };
        alert('❌ Erro ao criar usuário: ' + (msgs[error.code] || error.message));
    } finally {
        if (btnCriar) { btnCriar.disabled = false; btnCriar.textContent = '➕ Criar Usuário'; }
    }
}

// ===== ALTERAR ROLE (Firestore direto) =====
async function alterarRole(uid, novaRole) {
    if (!confirm(`🎯 Alterar perfil para "${novaRole}"?`)) return;

    try {
        await umDb.collection('users').doc(uid).update({
            role: novaRole,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('✅ Perfil atualizado!');
        carregarListaUsuarios();
    } catch (error) {
        alert('❌ Erro ao alterar perfil: ' + error.message);
    }
}

// ===== REMOVER USUÁRIO (Firestore direto) =====
async function removerUsuario(uid, email) {
    if (!confirm(`🗑️ Remover usuário "${email}"?\nO acesso ao sistema será bloqueado.`)) return;

    try {
        await umDb.collection('users').doc(uid).delete();
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
