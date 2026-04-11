/* ============================================================
   NOTIFICAÇÕES EM TEMPO REAL — Sistema de Atos Societários
   Arquivo: notifications.js
   ============================================================ */

const NOTIF_COLLECTION = 'notificacoes';

let unsubscribeNotificacoes = null;
let _notificacoesCache = [];
let _notifSomEnabled = true;

// ─── INICIALIZAÇÃO ───────────────────────────────────────────

function inicializarNotificacoes() {
    if (!db) return;
    if (unsubscribeNotificacoes) unsubscribeNotificacoes();

    unsubscribeNotificacoes = db.collection(NOTIF_COLLECTION)
        .where('destinatario', '==', 'contabilidade')
        .limit(50)
        .onSnapshot(snap => {
            const anterior = _notificacoesCache.map(n => n.id);
            // Ordenar client-side para evitar exigência de índice composto
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            docs.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
            _notificacoesCache = docs;

            atualizarBadgeNotificacoes();
            renderizarPainelNotificacoes();

            // Detectar notificações novas (adicionadas via outro dispositivo/aba)
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const notif = { id: change.doc.id, ...change.doc.data() };
                    const jaConhecia = anterior.includes(notif.id);
                    const agoraMs = Date.now();
                    const criadoMs = notif.criadoEm ? new Date(notif.criadoEm).getTime() : 0;
                    const recente = (agoraMs - criadoMs) < 15000;
                    if (!notif.lida && recente && !jaConhecia) {
                        mostrarToastNotificacao(notif);
                    }
                }
            });
        }, err => {
            console.error('Erro no listener de notificações:', err);
        });
}

function pararNotificacoes() {
    if (unsubscribeNotificacoes) {
        unsubscribeNotificacoes();
        unsubscribeNotificacoes = null;
    }
    _notificacoesCache = [];
}

// ─── CRIAR NOTIFICAÇÕES ──────────────────────────────────────

async function criarNotificacao(dados) {
    if (!db) return;
    try {
        await db.collection(NOTIF_COLLECTION).add({
            ...dados,
            lida: false,
            criadoEm: new Date().toISOString()
        });
    } catch (e) {
        console.error('Erro ao criar notificação:', e);
    }
}

async function criarNotificacaoFormPreenchido(processo) {
    const tipoLabel = (typeof TIPOS_LABEL !== 'undefined' && TIPOS_LABEL[processo.tipo]) || processo.tipo;
    return criarNotificacao({
        tipo: 'formulario_preenchido',
        titulo: '📝 Formulário Preenchido',
        corpo: `${processo.clienteNome || 'Cliente'} preencheu os dados do processo de ${tipoLabel}.`,
        processoId: processo.id,
        processoTipo: processo.tipo,
        clienteNome: processo.clienteNome || '',
        destinatario: 'contabilidade'
    });
}

async function criarNotificacaoEtapaAtualizada(processo, etapaId, novoStatus) {
    const etapasConf = (typeof ETAPAS_POR_TIPO !== 'undefined' && ETAPAS_POR_TIPO[processo.tipo]) || [];
    const etapaConf = etapasConf.find(e => e.id === etapaId);
    const etapaLabel = etapaConf?.label || etapaId;
    const statusLabel = novoStatus === 'concluido' ? 'concluída' : 'iniciada';
    const tipoLabel = (typeof TIPOS_LABEL !== 'undefined' && TIPOS_LABEL[processo.tipo]) || processo.tipo;

    return criarNotificacao({
        tipo: 'etapa_atualizada',
        titulo: novoStatus === 'concluido' ? `✅ Etapa Concluída` : `▶ Etapa Iniciada`,
        corpo: `Etapa "${etapaLabel}" foi ${statusLabel} — ${processo.clienteNome || 'cliente'} (${tipoLabel}).`,
        processoId: processo.id,
        processoTipo: processo.tipo,
        clienteNome: processo.clienteNome || '',
        etapaId,
        etapaLabel,
        novoStatus,
        destinatario: 'contabilidade'
    });
}

async function criarNotificacaoPrazoAlerta(processo, etapaId, tipoAlerta) {
    const etapasConf = (typeof ETAPAS_POR_TIPO !== 'undefined' && ETAPAS_POR_TIPO[processo.tipo]) || [];
    const etapaConf = etapasConf.find(e => e.id === etapaId);
    const etapaLabel = etapaConf?.label || etapaId;
    const nome = processo.clienteNome || processo.dados?.razaoSocial || 'cliente';

    const msgs = {
        warning: `⚠️ Prazo da etapa "${etapaLabel}" vence nas próximas 24h — ${nome}.`,
        danger:  `🔴 Prazo da etapa "${etapaLabel}" VENCEU — ${nome}.`,
        critical:`🚨 Prazo da etapa "${etapaLabel}" vencido há mais de 48h — ${nome}!`
    };

    const titulos = {
        warning:  '⚠️ Prazo Vencendo',
        danger:   '🔴 Prazo Vencido',
        critical: '🚨 Prazo Crítico'
    };

    return criarNotificacao({
        tipo: 'prazo_alerta',
        titulo: titulos[tipoAlerta] || '⚠️ Alerta de Prazo',
        corpo: msgs[tipoAlerta] || msgs.warning,
        processoId: processo.id,
        processoTipo: processo.tipo,
        clienteNome: nome,
        etapaId,
        etapaLabel,
        tipoAlerta,
        destinatario: 'contabilidade'
    });
}

// ─── MARCAR COMO LIDA ────────────────────────────────────────

async function marcarNotificacaoLida(id) {
    if (!db) return;
    try {
        await db.collection(NOTIF_COLLECTION).doc(id).update({ lida: true });
    } catch (e) {
        console.error('Erro ao marcar notificação como lida:', e);
    }
}

async function marcarTodasLidas() {
    if (!db) return;
    const naoLidas = _notificacoesCache.filter(n => !n.lida);
    if (naoLidas.length === 0) return;
    const batch = db.batch();
    naoLidas.forEach(n => {
        batch.update(db.collection(NOTIF_COLLECTION).doc(n.id), { lida: true });
    });
    try {
        await batch.commit();
    } catch (e) {
        console.error('Erro ao marcar todas como lidas:', e);
    }
}

// ─── APAGAR NOTIFICAÇÕES (somente admin) ─────────────────────

async function apagarNotificacao(id) {
    if (!db) return;
    if (typeof window.isAdmin !== 'function' || !window.isAdmin()) {
        if (typeof showToast === 'function') showToast('Sem permissão para apagar notificações');
        return;
    }
    try {
        await db.collection(NOTIF_COLLECTION).doc(id).delete();
    } catch (e) {
        console.error('Erro ao apagar notificação:', e);
        if (typeof showToast === 'function') showToast('Erro ao apagar notificação');
    }
}

async function apagarTodasNotificacoes() {
    if (!db) return;
    if (typeof window.isAdmin !== 'function' || !window.isAdmin()) {
        if (typeof showToast === 'function') showToast('Sem permissão para apagar notificações');
        return;
    }
    if (_notificacoesCache.length === 0) return;
    if (!confirm(`Apagar ${_notificacoesCache.length} notificação(ões)? Esta ação não pode ser desfeita.`)) return;
    const batch = db.batch();
    _notificacoesCache.forEach(n => {
        batch.delete(db.collection(NOTIF_COLLECTION).doc(n.id));
    });
    try {
        await batch.commit();
        if (typeof showToast === 'function') showToast('Notificações apagadas');
    } catch (e) {
        console.error('Erro ao apagar todas as notificações:', e);
        if (typeof showToast === 'function') showToast('Erro ao apagar notificações');
    }
}

// ─── UI: BADGE DO SINO ───────────────────────────────────────

function atualizarBadgeNotificacoes() {
    const naoLidas = _notificacoesCache.filter(n => !n.lida).length;
    const badge = document.getElementById('notif-badge');
    const btn   = document.getElementById('btn-notificacoes');
    if (!badge || !btn) return;

    if (naoLidas > 0) {
        badge.textContent = naoLidas > 9 ? '9+' : String(naoLidas);
        badge.style.display = 'flex';
        btn.classList.add('has-notif');
    } else {
        badge.style.display = 'none';
        btn.classList.remove('has-notif');
    }
}

// ─── UI: PAINEL DESLIZANTE ───────────────────────────────────

function togglePainelNotificacoes() {
    const painel  = document.getElementById('painel-notificacoes');
    const overlay = document.getElementById('notif-overlay');
    if (!painel) return;
    const aberto = painel.classList.contains('open');
    if (aberto) {
        painel.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
    } else {
        painel.classList.add('open');
        if (overlay) overlay.classList.add('open');
        renderizarPainelNotificacoes();
    }
}

function fecharPainelNotificacoes() {
    const painel  = document.getElementById('painel-notificacoes');
    const overlay = document.getElementById('notif-overlay');
    if (painel)  painel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

function renderizarPainelNotificacoes() {
    const lista = document.getElementById('notif-lista');
    if (!lista) return;

    const ehAdmin = typeof window.isAdmin === 'function' && window.isAdmin();

    // Mostrar/ocultar botão "Apagar tudo" no header
    const btnApagarTodas = document.getElementById('btn-apagar-todas-notif');
    if (btnApagarTodas) {
        btnApagarTodas.style.display = ehAdmin && _notificacoesCache.length > 0 ? '' : 'none';
    }

    if (_notificacoesCache.length === 0) {
        lista.innerHTML = `<div class="notif-empty">🔔 Nenhuma notificação ainda</div>`;
        return;
    }

    lista.innerHTML = _notificacoesCache.map(n => {
        const ts      = n.criadoEm ? _formatarTimestampRelativo(n.criadoEm) : '';
        const lidaCls = n.lida ? ' lida' : '';
        const tipoCls = _notifTipoCss(n);
        const deleteBtnHtml = ehAdmin
            ? `<button class="notif-item-delete" onclick="event.stopPropagation();apagarNotificacao('${n.id}')" title="Apagar notificação">🗑</button>`
            : '';

        return `
        <div class="notif-item${lidaCls} notif-tipo-${tipoCls}"
             onclick="notifItemClick('${n.id}','${n.processoId || ''}')"
             id="notif-${n.id}">
            <div class="notif-dot"></div>
            <div class="notif-content">
                <div class="notif-titulo">${n.titulo}</div>
                <div class="notif-corpo">${n.corpo}</div>
                <div class="notif-ts">${ts}</div>
            </div>
            ${deleteBtnHtml}
        </div>`;
    }).join('');
}

function notifItemClick(notifId, processoId) {
    marcarNotificacaoLida(notifId);
    fecharPainelNotificacoes();
    if (processoId && typeof abrirDetalheProcesso === 'function') {
        abrirDetalheProcesso(processoId);
    }
}

// ─── UI: TOAST FLUTUANTE ─────────────────────────────────────

function mostrarToastNotificacao(notif) {
    if (_notifSomEnabled) _tocarSom();

    let container = document.getElementById('notif-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notif-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const tipoCss = _notifTipoCss(notif);
    toast.className = `notif-toast notif-tipo-${tipoCss}`;
    toast.innerHTML = `
        <div class="notif-toast-body">
            <div class="notif-toast-titulo">${notif.titulo}</div>
            <div class="notif-toast-corpo">${notif.corpo}</div>
        </div>
        <button class="notif-toast-close" onclick="this.closest('.notif-toast').remove()" title="Fechar">×</button>`;

    if (notif.processoId) {
        toast.style.cursor = 'pointer';
        toast.addEventListener('click', e => {
            if (!e.target.closest('.notif-toast-close')) {
                notif.id && marcarNotificacaoLida(notif.id);
                if (typeof abrirDetalheProcesso === 'function') abrirDetalheProcesso(notif.processoId);
                toast.remove();
            }
        });
    }

    container.appendChild(toast);
    // Auto-remover após 7 s
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 400);
        }
    }, 7000);
}

// ─── SOM ─────────────────────────────────────────────────────

function _tocarSom() {
    try {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
    } catch (_) { /* AudioContext pode não estar disponível ou bloqueado */ }
}

function toggleSomNotificacoes() {
    _notifSomEnabled = !_notifSomEnabled;
    const btn = document.getElementById('btn-som-notif');
    if (btn) btn.textContent = _notifSomEnabled ? '🔔' : '🔕';
    if (typeof showToast === 'function') {
        showToast(_notifSomEnabled ? '🔔 Som de notificações ativado' : '🔕 Som de notificações desativado');
    }
}

// ─── UTILS INTERNOS ──────────────────────────────────────────

function _notifTipoCss(n) {
    if (n.tipo === 'formulario_preenchido') return 'form';
    if (n.tipo === 'prazo_alerta') {
        if (n.tipoAlerta === 'critical') return 'critical';
        if (n.tipoAlerta === 'danger')   return 'danger';
        return 'warning';
    }
    return 'etapa';
}

function _formatarTimestampRelativo(isoStr) {
    const data  = new Date(isoStr);
    const agora = new Date();
    const diffMs  = agora - data;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH   = Math.floor(diffMs / 3600000);
    const diffD   = Math.floor(diffMs / 86400000);
    if (diffMin < 1)  return 'agora';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffH < 24)   return `há ${diffH}h`;
    if (diffD < 7)    return `há ${diffD} dia${diffD > 1 ? 's' : ''}`;
    return data.toLocaleDateString('pt-BR');
}
