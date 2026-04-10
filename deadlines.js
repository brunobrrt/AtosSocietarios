/* ============================================================
   CONTROLE DE PRAZOS — Sistema de Atos Societários
   Arquivo: deadlines.js
   ============================================================ */

// ─── TABELA DE PRAZOS ESTIMADOS (dias corridos por etapa) ────

const PRAZOS_ETAPAS = {
    abertura: {
        solicitacao:  1,
        'rede-sim':   2,
        dbe:          1,
        clicksign:    3,
        jucesp:       5,
        exigencia:    3,
        inscricoes:   5,
        concluido:    1
    },
    alteracao: {
        solicitacao:  1,
        formulario:   1,
        clicksign:    2,
        jucesp:       3,
        exigencia:    2,
        concluido:    1
    },
    encerramento: {
        solicitacao:  1,
        distrato:     3,
        documentos:   2,
        prefeitura:   7,
        concluido:    1
    }
};

// ─── CÁLCULO DE PRAZO ────────────────────────────────────────

function obterPrazoEtapa(tipo, etapaId) {
    return (PRAZOS_ETAPAS[tipo] || {})[etapaId] || null;
}

function calcularDataLimite(dataInicio, prazoEmDias) {
    const dt = new Date(dataInicio);
    dt.setDate(dt.getDate() + prazoEmDias);
    return dt.toISOString();
}

/**
 * Calcula os campos de prazo para inserir em etapas[etapaId]
 * quando uma etapa é iniciada (novoStatus === 'em-andamento').
 * Retorna objeto vazio se não aplicável.
 */
function calcularDadosPrazo(tipo, etapaId, novoStatus) {
    if (novoStatus !== 'em-andamento') return {};
    const prazoEmDias = obterPrazoEtapa(tipo, etapaId);
    if (!prazoEmDias) return {};
    const dataInicio = new Date().toISOString();
    const dataLimite = calcularDataLimite(dataInicio, prazoEmDias);
    return { dataInicio, dataLimite, prazoEstimado: prazoEmDias };
}

/**
 * Classifica o status do prazo:
 *  'ok'       → dentro do prazo (> 24 h restantes)
 *  'warning'  → vence em até 24 h
 *  'danger'   → vencido (< 0 h)
 *  'critical' → vencido há mais de 48 h
 */
function obterStatusPrazo(dataLimite) {
    if (!dataLimite) return null;
    const diffH = (new Date(dataLimite) - new Date()) / 3600000;
    if (diffH > 24)  return 'ok';
    if (diffH > 0)   return 'warning';
    if (diffH > -48) return 'danger';
    return 'critical';
}

function formatarPrazo(dataLimite) {
    if (!dataLimite) return '';
    const diffMs = new Date(dataLimite) - new Date();
    const diffH  = diffMs / 3600000;
    const diffD  = diffMs / 86400000;

    if (diffMs > 0) {
        if (diffD >= 1) return `Vence em ${Math.floor(diffD)}d ${Math.floor(diffH % 24)}h`;
        if (diffH >= 1) return `Vence em ${Math.floor(diffH)}h`;
        return 'Vence em < 1h';
    }
    const atrasoH = Math.abs(diffH);
    const atrasoD = Math.abs(diffD);
    if (atrasoD >= 1) return `Vencido há ${Math.floor(atrasoD)}d`;
    return `Vencido há ${Math.floor(atrasoH)}h`;
}

// ─── BADGE INLINE (usado na pipeline e nos cards) ─────────────

function renderizarBadgePrazo(etapa) {
    if (!etapa || etapa.status !== 'em-andamento' || !etapa.dataLimite) return '';
    const s = obterStatusPrazo(etapa.dataLimite);
    if (!s || s === 'ok') return '';
    const txt = formatarPrazo(etapa.dataLimite);
    const data = new Date(etapa.dataLimite).toLocaleString('pt-BR');
    return `<span class="prazo-badge prazo-${s}" title="Prazo: ${data}">${txt}</span>`;
}

// ─── ALERTAS NO DASHBOARD ────────────────────────────────────

function renderizarAlertasPrazos(processosList) {
    const container = document.getElementById('dashboard-alertas');
    if (!container) return;

    const alertas = _coletarAlertasPrazos(processosList);

    const urgentes = alertas.filter(a => a.statusPrazo === 'critical' || a.statusPrazo === 'danger').length;
    const avisos   = alertas.filter(a => a.statusPrazo === 'warning').length;
    _atualizarCardAlertasDashboard(urgentes, avisos);

    if (alertas.length === 0) {
        container.innerHTML = `<div class="alertas-ok">✅ Todos os prazos estão em dia</div>`;
        return;
    }

    container.innerHTML = alertas.map(a => {
        return `
        <div class="alerta-item alerta-${a.statusPrazo}" onclick="abrirDetalheProcesso('${a.processoId}')">
            <div class="alerta-icone">${a.statusPrazo === 'critical' ? '🚨' : a.statusPrazo === 'danger' ? '🔴' : '⚠️'}</div>
            <div class="alerta-body">
                <div class="alerta-titulo">${a.clienteNome} — ${a.etapaLabel}</div>
                <div class="alerta-detalhe">${(typeof TIPOS_LABEL !== 'undefined' && TIPOS_LABEL[a.tipo]) || a.tipo} · ${formatarPrazo(a.dataLimite)}</div>
            </div>
        </div>`;
    }).join('');
}

function _coletarAlertasPrazos(processosList) {
    const alertas = [];
    (processosList || []).forEach(processo => {
        if (processo.status === 'concluido') return;
        const etapasConf = (typeof ETAPAS_POR_TIPO !== 'undefined' && ETAPAS_POR_TIPO[processo.tipo]) || [];
        etapasConf.forEach(etapaConf => {
            const etapa = processo.etapas?.[etapaConf.id];
            if (!etapa || etapa.status !== 'em-andamento' || !etapa.dataLimite) return;
            const statusPrazo = obterStatusPrazo(etapa.dataLimite);
            if (statusPrazo && statusPrazo !== 'ok') {
                alertas.push({
                    processoId:  processo.id,
                    clienteNome: processo.clienteNome || processo.dados?.razaoSocial || 'Sem nome',
                    tipo:        processo.tipo,
                    etapaId:     etapaConf.id,
                    etapaLabel:  etapaConf.label,
                    dataLimite:  etapa.dataLimite,
                    statusPrazo
                });
            }
        });
    });
    const ordem = { critical: 0, danger: 1, warning: 2 };
    alertas.sort((a, b) => (ordem[a.statusPrazo] ?? 9) - (ordem[b.statusPrazo] ?? 9));
    return alertas;
}

function _atualizarCardAlertasDashboard(urgentes, avisos) {
    const numEl   = document.getElementById('dash-alertas');
    const cardEl  = document.getElementById('card-alertas');
    const total   = urgentes + avisos;
    if (numEl)  numEl.textContent = total;
    if (cardEl) {
        cardEl.className = 'dash-card alertas';
        if (urgentes > 0) cardEl.classList.add('urgente');
        else if (avisos > 0) cardEl.classList.add('aviso');
    }
}

// ─── VERIFICAÇÃO PERIÓDICA ───────────────────────────────────

let _intervaloPrazos = null;

function iniciarVerificacaoPrazos() {
    if (_intervaloPrazos) clearInterval(_intervaloPrazos);
    _verificarPrazos();
    _intervaloPrazos = setInterval(_verificarPrazos, 30 * 60 * 1000); // 30 min
}

function pararVerificacaoPrazos() {
    if (_intervaloPrazos) {
        clearInterval(_intervaloPrazos);
        _intervaloPrazos = null;
    }
}

async function _verificarPrazos() {
    const lista = (typeof processos !== 'undefined') ? processos : [];
    if (lista.length === 0) return;

    for (const processo of lista) {
        if (processo.status === 'concluido') continue;
        const etapasConf = (typeof ETAPAS_POR_TIPO !== 'undefined' && ETAPAS_POR_TIPO[processo.tipo]) || [];
        for (const etapaConf of etapasConf) {
            const etapa = processo.etapas?.[etapaConf.id];
            if (!etapa || etapa.status !== 'em-andamento' || !etapa.dataLimite) continue;
            const statusPrazo = obterStatusPrazo(etapa.dataLimite);
            if (!statusPrazo || statusPrazo === 'ok') continue;

            // Evitar notificações duplicadas por sessão
            const chave = `alerta-${processo.id}-${etapaConf.id}-${statusPrazo}`;
            if (sessionStorage.getItem(chave)) continue;
            sessionStorage.setItem(chave, '1');

            if (typeof criarNotificacaoPrazoAlerta === 'function') {
                await criarNotificacaoPrazoAlerta(processo, etapaConf.id, statusPrazo);
            }
        }
    }

    renderizarAlertasPrazos(lista);
}

// ─── GATEWAY WHATSAPP ────────────────────────────────────────

const WHATSAPP_GATEWAY_URL = 'http://localhost:3002/send';

async function enviarWhatsApp(telefone, mensagem) {
    if (!telefone) return false;
    const tel = telefone.replace(/\D/g, '');
    const telFormatado = tel.startsWith('55') ? tel : '55' + tel;
    try {
        const resp = await fetch(WHATSAPP_GATEWAY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: telFormatado, message: mensagem }),
            signal: AbortSignal.timeout(5000)
        });
        return resp.ok;
    } catch (e) {
        console.warn('WhatsApp gateway indisponível:', e.message);
        return false;
    }
}

async function notificarClienteEtapaWhatsApp(processo, etapaId, novoStatus) {
    if (novoStatus !== 'concluido') return;
    const telefone = processo.dados?.telefone;
    if (!telefone) return;

    const etapasConf = (typeof ETAPAS_POR_TIPO !== 'undefined' && ETAPAS_POR_TIPO[processo.tipo]) || [];
    const idx         = etapasConf.findIndex(e => e.id === etapaId);
    const etapaLabel  = etapasConf[idx]?.label || etapaId;
    const proximaEtapa = etapasConf[idx + 1];
    const tipoLabel    = (typeof TIPOS_LABEL !== 'undefined' && TIPOS_LABEL[processo.tipo]) || processo.tipo;
    const linkStatus   = typeof montarLinkStatus === 'function'
        ? montarLinkStatus(processo.linkStatus)
        : processo.linkStatus || '';

    let msg = `Olá! Atualização do seu processo de *${tipoLabel}*.\n\n`;
    msg += `✅ *Etapa concluída:* ${etapaLabel}\n`;
    if (proximaEtapa && proximaEtapa.id !== 'concluido') {
        msg += `⏭️ *Próxima etapa:* ${proximaEtapa.label}\n`;
    } else if (!proximaEtapa || proximaEtapa.id === 'concluido') {
        msg += `🎉 *Processo finalizado!*\n`;
    }
    if (linkStatus) msg += `\n📊 Acompanhe: ${linkStatus}`;

    return enviarWhatsApp(telefone, msg);
}
