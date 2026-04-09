


/* ============================================================
   SISTEMA DE ATOS SOCIETÁRIOS — App Principal
   Acesso via links: painel, formulário, status
   ============================================================ */

// ===== ESTADO GLOBAL =====
let processos = [];
let processoAtual = null; // processo sendo visualizado/editado
let sociosFormCount = 0;
let arquivosUpload = { iptu: [], docs: [] }; // { iptu: [{file, name, id}], docs: [{file, name, id}] }
let db = null; // Firestore instance
let storage = null; // Firebase Storage instance
let unsubscribePainel = null; // listener em tempo real

// ===== CONFIGURAÇÕES =====
const ETAPAS_POR_TIPO = {
    abertura: [
        { id: 'solicitacao', label: 'Solicitação' },
        { id: 'rede-sim', label: 'Rede Sim', link: 'https://vreredesim.sp.gov.br/home' },
        { id: 'dbe', label: 'DBE', link: 'https://www.gov.br/empresas-e-negocios/pt-br/redesim' },
        { id: 'clicksign', label: 'ClickSign', link: 'https://app.clicksign.com/' },
        { id: 'jucesp', label: 'JUCESP', link: 'https://www.jucesponline.sp.gov.br/' },
        { id: 'exigencia', label: 'Exigência' },
        { id: 'inscricoes', label: 'Inscrições' },
        { id: 'concluido', label: 'Concluído' }
    ],
    alteracao: [
        { id: 'solicitacao', label: 'Solicitação' },
        { id: 'formulario', label: 'Formulário' },
        { id: 'clicksign', label: 'ClickSign', link: 'https://app.clicksign.com/' },
        { id: 'jucesp', label: 'JUCESP', link: 'https://www.jucesponline.sp.gov.br/' },
        { id: 'exigencia', label: 'Exigência' },
        { id: 'concluido', label: 'Concluído' }
    ],
    encerramento: [
        { id: 'solicitacao', label: 'Solicitação' },
        { id: 'distrato', label: 'Distrato' },
        { id: 'documentos', label: 'Documentos' },
        { id: 'prefeitura', label: 'Prefeitura' },
        { id: 'concluido', label: 'Concluído' }
    ]
};

const TIPOS_LABEL = {
    abertura: 'Abertura',
    alteracao: 'Alteração',
    encerramento: 'Encerramento'
};

const SUBTIPOS_LABEL = {
    'razao-social': 'Razão Social',
    'endereco': 'Endereço',
    'quadro-societario': 'Quadro Societário',
    'objeto-social': 'Objeto Social',
    'clausulas': 'Cláusulas Vigentes',
    'transformacao': 'Transformação de Tipo',
    'capital': 'Capital Social'
};

const PORTES = { 'ME': 'ME — R$ 80.000,01 a R$ 360.000,00', 'EPP': 'EPP — R$ 360.000,01 a R$ 4.800.000,00' };
const REGIMES = { 'simples': 'Simples Nacional', 'presumido': 'Lucro Presumido', 'real': 'Lucro Real' };
const ESTADOS_CIVIS = { 'solteiro': 'Solteiro(a)', 'casado': 'Casado(a)', 'divorciado': 'Divorciado(a)', 'viuvo': 'Viúvo(a)', 'uniao-estavel': 'União Estável' };
const REGIMES_CASAMENTO = { 'comunhao-parcial': 'Comunhão Parcial', 'comunhao-universal': 'Comunhão Universal', 'separacao-total': 'Separação Total', 'participacao-final': 'Participação Final nos Aquestos' };

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', async () => {
    await inicializarFirebase();
    rotear();
});

async function inicializarFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK não carregou. Verifique a conexão.');
            showToast('Erro: não foi possível conectar ao servidor');
            return;
        }
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        storage = null; // Upload real desabilitado — demo usa localStorage
        console.log('Firebase conectado ✓');
    } catch (e) {
        console.error('Erro ao inicializar Firebase:', e);
        showToast('Erro ao conectar ao servidor');
    }
}

// ===== ROTEAMENTO =====
async function rotear() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('form')) {
        document.getElementById('loading-screen').style.display = 'none';
        const codigo = params.get('form');
        mostrarView('view-form');
        await carregarFormulario(codigo);
    } else if (params.has('status')) {
        document.getElementById('loading-screen').style.display = 'none';
        const codigo = params.get('status');
        mostrarView('view-status');
        await carregarStatus(codigo);
    } else {
        // Sem parâmetro ou ?painel → painel da contabilidade
        configurarAbas();
        await iniciarPainel(); // verifica auth antes de mostrar
    }
}

function mostrarView(viewId) {
    ['view-painel', 'view-form', 'view-status', 'view-invalido', 'view-expirado', 'view-login'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById(viewId);
    if (target) target.style.display = 'block';
}

// ===== ABAS =====
function configurarAbas() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + '-section').classList.add('active');
        });
    });
}

// ===== GERAR CÓDIGOS ÚNICOS =====
function gerarCodigo(tamanho = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let codigo = '';
    for (let i = 0; i < tamanho; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
}

async function gerarLinks() {
    let codigoForm, codigoStatus;
    let tentativas = 0;
    do {
        codigoForm = gerarCodigo(10);
        tentativas++;
        if (tentativas > 20) throw new Error('Não foi possível gerar código único');
    } while (await existeCodigo(codigoForm));

    tentativas = 0;
    do {
        codigoStatus = gerarCodigo(10);
        tentativas++;
        if (tentativas > 20) throw new Error('Não foi possível gerar código único');
    } while (await existeCodigo(codigoStatus));

    return { form: codigoForm, status: codigoStatus };
}

function getUrlBase() {
    // file:// não tem origin, usa só o pathname
    if (window.location.protocol === 'file:') {
        return window.location.pathname.split('/').slice(-1)[0] || 'index.html';
    }
    return window.location.origin + window.location.pathname;
}

function montarLinkForm(codigo) {
    return getUrlBase() + '?form=' + codigo;
}

function montarLinkStatus(codigo) {
    return getUrlBase() + '?status=' + codigo;
}

// ===== PERSISTÊNCIA (FIRESTORE) =====
const COLLECTION = 'atos-societarios';

// Carregar processo único por ID (para formulário/status do cliente)
async function buscarProcessoPorId(id) {
    if (!db) return null;
    try {
        const doc = await db.collection(COLLECTION).doc(id).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
    } catch (e) {
        console.error('Erro ao buscar processo:', e);
    }
    return null;
}

// Buscar por código do formulário (consulta única)
async function buscarPorLinkForm(codigo) {
    if (!db) return null;
    try {
        const snap = await db.collection(COLLECTION).where('linkForm', '==', codigo).limit(1).get();
        if (!snap.empty) {
            const doc = snap.docs[0];
            return { id: doc.id, ...doc.data() };
        }
    } catch (e) {
        console.error('Erro ao buscar por linkForm:', e);
    }
    return null;
}

// Buscar por código de status (consulta única)
async function buscarPorLinkStatus(codigo) {
    if (!db) return null;
    try {
        const snap = await db.collection(COLLECTION).where('linkStatus', '==', codigo).limit(1).get();
        if (!snap.empty) {
            const doc = snap.docs[0];
            return { id: doc.id, ...doc.data() };
        }
    } catch (e) {
        console.error('Erro ao buscar por linkStatus:', e);
    }
    return null;
}

// Verificar se código já existe (para gerarLinks)
async function existeCodigo(codigo) {
    if (!db) return false;
    try {
        const snapForm = await db.collection(COLLECTION).where('linkForm', '==', codigo).limit(1).get();
        if (!snapForm.empty) return true;
        const snapStatus = await db.collection(COLLECTION).where('linkStatus', '==', codigo).limit(1).get();
        if (!snapStatus.empty) return true;
    } catch (e) {
        console.error('Erro ao verificar código:', e);
    }
    return false;
}

// Criar processo no Firestore
async function criarProcessoNoFirestore(processo) {
    if (!db) throw new Error('Firestore não conectado');
    const docRef = await db.collection(COLLECTION).add(processo);
    return docRef.id;
}

// Atualizar processo no Firestore
async function atualizarProcessoNoFirestore(id, dados) {
    if (!db) throw new Error('Firestore não conectado');
    await db.collection(COLLECTION).doc(id).update(dados);
}

// Listener em tempo real para o painel (lista todos os processos)
function escutarProcessos(callback) {
    if (!db) return null;
    return db.collection(COLLECTION)
        .orderBy('criadoEm', 'desc')
        .onSnapshot(snap => {
            const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            processos = lista;
            callback(lista);
        }, error => {
            console.error('Erro no listener:', error);
            showToast('Erro ao carregar processos');
        });
}

// Listener em tempo real para 1 processo (cliente)
function escutarProcesso(processoId, callback) {
    if (!db) return null;
    return db.collection(COLLECTION).doc(processoId)
        .onSnapshot(doc => {
            if (doc.exists) {
                callback({ id: doc.id, ...doc.data() });
            }
        }, error => {
            console.error('Erro no listener do processo:', error);
        });
}

// ===================================================================
//  PAINEL DA CONTABILIDADE
// ===================================================================

async function iniciarPainel() {
    const loadingEl = document.getElementById('loading-screen');
    const authResult = await inicializarAuth();
    if (loadingEl) loadingEl.style.display = 'none';

    if (!authResult) {
        mostrarView('view-login');
        return;
    }
    await carregarPainel();
}

async function carregarPainel() {
    mostrarView('view-painel');
    aplicarRestricoesUI();
    if (unsubscribePainel) unsubscribePainel();
    unsubscribePainel = escutarProcessos(lista => {
        processos = lista;
        renderizarPainel();
    });
}

function pararPainel() {
    if (unsubscribePainel) {
        unsubscribePainel();
        unsubscribePainel = null;
    }
    processos = [];
}

function renderizarPainel() {
    renderizarDashboard();
    renderizarLista('abertura', 'lista-aberturas');
    renderizarLista('alteracao', 'lista-alteracoes');
    renderizarLista('encerramento', 'lista-encerramentos');
}

function aplicarFiltro() {
    renderizarPainel();
}

// Modal: Novo Processo
function abrirModalNovoProcesso(tipo) {
    document.getElementById('modal-novo-processo').style.display = 'flex';
    document.getElementById('processo-tipo').value = tipo || '';
    document.getElementById('processo-cliente-nome').value = '';
    document.getElementById('processo-subtipo').selectedIndex = 0;
    atualizarFormularioProcesso();
}

function fecharModalNovoProcesso() {
    document.getElementById('modal-novo-processo').style.display = 'none';
}

function atualizarFormularioProcesso() {
    const tipo = document.getElementById('processo-tipo').value;
    document.getElementById('campo-tipo-alteracao').style.display = tipo === 'alteracao' ? 'block' : 'none';
}

// Criar processo (contabilidade)
async function criarProcesso() {
    if (!window.verificarPermissao('admin')) return; // Só admin pode criar
    const tipo = document.getElementById('processo-tipo').value;
    if (!tipo) { showToast('Selecione o tipo de ato societário'); return; }

    const clienteNome = document.getElementById('processo-cliente-nome').value.trim();
    if (!clienteNome) { showToast('Preencha o nome do cliente'); return; }

    const subtipo = document.getElementById('processo-subtipo')?.value || null;

    showToast('Gerando links...');

    let links;
    try {
        links = await gerarLinks();
    } catch (e) {
        showToast('Erro ao gerar links. Tente novamente.');
        return;
    }

    const etapasConfig = ETAPAS_POR_TIPO[tipo] || [];
    const etapas = {};
    etapasConfig.forEach(etapa => {
        etapas[etapa.id] = { status: 'pendente', data: null, observacao: '' };
    });
    if (etapasConfig.length > 0) {
        etapas[etapasConfig[0].id].status = 'em-andamento';
    }

    const processo = {
        tipo: tipo,
        subtipo: subtipo,
        clienteNome: clienteNome,
        linkForm: links.form,
        linkStatus: links.status,
        dados: {},
        socios: [],
        etapas: etapas,
        status: 'pendente',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        preenchidoEm: null
    };

    try {
        const novoId = await criarProcessoNoFirestore(processo);
        processo.id = novoId;
    } catch (e) {
        console.error('Erro ao salvar processo:', e);
        showToast('Erro ao salvar. Tente novamente.');
        return;
    }

    fecharModalNovoProcesso();

    // Mostrar modal com links gerados
    document.getElementById('link-gerado-form').value = montarLinkForm(links.form);
    document.getElementById('link-gerado-status').value = montarLinkStatus(links.status);
    document.getElementById('modal-links-gerados').style.display = 'flex';

    // Guardar pra enviar WhatsApp
    window._linksParaEnviar = {
        form: montarLinkForm(links.form),
        status: montarLinkStatus(links.status),
        cliente: clienteNome,
        tipo: TIPOS_LABEL[tipo]
    };

    showToast('Processo criado! Envie os links ao cliente. ✅');
}

function fecharModalLinksGerados() {
    document.getElementById('modal-links-gerados').style.display = 'none';
}

// Detalhe do processo (contabilidade)
function abrirDetalheProcesso(id) {
    const processo = processos.find(p => p.id === id);
    if (!processo) return;

    window._processoDetalhe = processo;

    document.getElementById('modal-detalhe-processo').style.display = 'flex';
    document.getElementById('detalhe-titulo').textContent = processo.clienteNome || processo.dados?.razaoSocial || 'Processo';
    document.getElementById('detalhe-subtitle').textContent =
        TIPOS_LABEL[processo.tipo] + (processo.subtipo ? ' — ' + SUBTIPOS_LABEL[processo.subtipo] : '');

    // Links
    document.getElementById('detalhe-link-form').value = montarLinkForm(processo.linkForm);
    document.getElementById('detalhe-link-status').value = montarLinkStatus(processo.linkStatus);

    // Aviso se link de edição já foi usado
    const formUsadoEl = document.getElementById('detalhe-form-usado');
    if (processo.formLinkUsado) {
        formUsadoEl.style.display = 'block';
    } else {
        formUsadoEl.style.display = 'none';
    }

    // Pipeline
    renderizarPipeline(processo, 'detalhe-pipeline', true);

    // Botões de etapa
    const botoes = document.getElementById('detalhe-etapas-botoes');
    const etapasConfig = ETAPAS_POR_TIPO[processo.tipo] || [];
    botoes.innerHTML = etapasConfig.map(etapa => {
        const estado = processo.etapas?.[etapa.id]?.status || 'pendente';
        const proximo = estado === 'pendente' ? 'em-andamento' : estado === 'em-andamento' ? 'concluido' : null;
        if (!proximo) return '';
        const label = proximo === 'em-andamento' ? `▶ Iniciar: ${etapa.label}` : `✓ Concluir: ${etapa.label}`;
        const cls = proximo === 'concluido' ? 'btn-success' : 'btn-primary';
        return `<button class="btn btn-small ${cls}" onclick="avancarEtapa('${processo.id}','${etapa.id}','${proximo}')">${label}</button>`;
    }).join('');

    // Info
    renderizarInfoProcesso(processo, 'detalhe-info');
}

function fecharModalDetalhe() {
    document.getElementById('modal-detalhe-processo').style.display = 'none';
}

async function avancarEtapa(processoId, etapaId, novoStatus) {
    const processo = processos.find(p => p.id === processoId);
    if (!processo) return;

    // Se está iniciando a etapa e tem link oficial, abrir
    if (novoStatus === 'em-andamento') {
        const etapasConfig = ETAPAS_POR_TIPO[processo.tipo] || [];
        const etapaConfig = etapasConfig.find(e => e.id === etapaId);
        if (etapaConfig?.link) {
            window.open(etapaConfig.link, '_blank');
        }
    }

    processo.etapas[etapaId].status = novoStatus;
    processo.etapas[etapaId].data = new Date().toISOString();
    processo.atualizadoEm = new Date().toISOString();

    // Verificar se concluiu
    const etapasConfig = ETAPAS_POR_TIPO[processo.tipo] || [];
    const todasConcluidas = etapasConfig.every(e => processo.etapas[e.id]?.status === 'concluido');
    processo.status = todasConcluidas ? 'concluido' : 'em-andamento';

    try {
        await atualizarProcessoNoFirestore(processoId, {
            etapas: processo.etapas,
            status: processo.status,
            atualizadoEm: processo.atualizadoEm
        });
    } catch (e) {
        console.error('Erro ao atualizar etapa:', e);
        showToast('Erro ao salvar. Tente novamente.');
        return;
    }

    abrirDetalheProcesso(processoId);
    showToast('Etapa atualizada!');
}

// ===================================================================
//  FORMULÁRIO DO CLIENTE (acesso via ?form=CODIGO)
// ===================================================================

async function carregarFormulario(codigo) {
    const processo = await buscarPorLinkForm(codigo);
    if (!processo) {
        mostrarView('view-invalido');
        return;
    }

    // Verificar se o link de edição já foi usado
    if (processo.formLinkUsado) {
        mostrarView('view-expirado');
        return;
    }

    processoAtual = processo;
    const tipo = processo.tipo;

    document.getElementById('form-tipo-badge').textContent = TIPOS_LABEL[tipo];
    document.getElementById('form-tipo-badge').className = 'role-badge ' + tipo;

    const titulos = {
        abertura: '📝 Formulário de Abertura de Empresa',
        alteracao: '📝 Formulário de Alteração do Contrato Social',
        encerramento: '📝 Formulário de Encerramento de Empresa'
    };
    document.getElementById('form-titulo').textContent = titulos[tipo] || 'Preencha os dados';

    const container = document.getElementById('form-cliente-container');
    container.innerHTML = montarFormularioHTML(processo);

    // Se já tem dados, preencher
    if (processo.preenchidoEm) {
        preencherFormulario(processo);
        document.getElementById('form-links-salvos').style.display = 'block';
        document.getElementById('link-form').value = montarLinkForm(processo.linkForm);
        document.getElementById('link-status').value = montarLinkStatus(processo.linkStatus);
    }

    // Sócio inicial
    sociosFormCount = 0;
    arquivosUpload = { iptu: [], docs: [] }; // reset arquivos pendentes

    if (tipo !== 'encerramento' && (!processo.socios || processo.socios.length === 0)) {
        adicionarSocioForm();
    } else if (processo.socios && processo.socios.length > 0) {
        processo.socios.forEach((s, i) => adicionarSocioForm(s));
    }

    // Escutar atualizações em tempo real
    escutarProcesso(processo.id, atualizado => {
        processoAtual = atualizado;
        // Se dados mudaram de outra aba/dispositivo, atualizar
        if (atualizado.preenchidoEm && !document.getElementById('fc-razao1')?.value) {
            preencherFormulario(atualizado);
        }
    });
}

function montarFormularioHTML(processo) {
    const tipo = processo.tipo;
    let html = '';

    // Botão salvar
    html += `<div style="display:flex;justify-content:flex-end;margin-bottom:20px;">
        <button class="btn btn-primary" onclick="salvarFormularioCliente()">💾 Salvar Dados</button>
    </div>`;

    // Dados da Empresa
    if (tipo !== 'encerramento') {
        html += `
        <div class="modal-section">
            <h3>🏢 Dados da Empresa</h3>
            <div class="form-row">
                <div class="form-field">
                    <label>Razão Social (opção 1) <span class="required">*</span></label>
                    <input type="text" id="fc-razao1" placeholder="Nome da empresa">
                </div>
                <div class="form-field">
                    <label>Razão Social (opção 2) <span class="optional">(alternativa)</span></label>
                    <input type="text" id="fc-razao2" placeholder="Nome alternativo">
                </div>
            </div>
            <div class="form-field" style="margin-top:12px;">
                <label>Endereço da Sede <span class="required">*</span></label>
                <textarea id="fc-endereco" placeholder="Endereço completo da sede"></textarea>
            </div>
            <div class="form-field" style="margin-top:12px;">
                <label>IPTU</label>
                <div class="upload-area" onclick="document.getElementById('fc-upload-iptu').click()">
                    <input type="file" id="fc-upload-iptu" accept="image/*,.pdf" onchange="handleUpload(this, 'fc-arquivos-iptu')">
                    <span class="upload-icon">📷</span>
                    <span class="upload-text">Clique para enviar o comprovante de IPTU</span>
                    <span class="upload-hint">Foto ou PDF (JPG, PNG, PDF)</span>
                </div>
                <div class="uploaded-files" id="fc-arquivos-iptu"></div>
            </div>
        </div>`;
    }

    // Documentos (sempre para encerramento)
    if (tipo === 'encerramento' || tipo === 'abertura') {
        html += `
        <div class="modal-section">
            <h3>📎 Documentos Pessoais dos Sócios</h3>
            <p style="font-size:0.82rem;color:var(--text-light);margin-bottom:12px;">RG, CPF, fotos e outros documentos</p>
            <div class="upload-area" onclick="document.getElementById('fc-upload-docs').click()">
                <input type="file" id="fc-upload-docs" accept="image/*,.pdf" multiple onchange="handleUpload(this, 'fc-arquivos-docs')">
                <span class="upload-icon">📷</span>
                <span class="upload-text">Clique para enviar fotos ou documentos</span>
                <span class="upload-hint">Foto ou PDF — pode selecionar vários</span>
            </div>
            <div class="uploaded-files" id="fc-arquivos-docs"></div>
        </div>`;
    }

    // Sócios
    if (tipo !== 'encerramento') {
        html += `
        <div class="modal-section">
            <h3>👥 Sócios</h3>
            <div id="fc-lista-socios"></div>
            <button class="btn btn-outline" onclick="adicionarSocioForm()" style="margin-top:8px;">+ Adicionar Sócio</button>
        </div>`;
    }

    // Capital Social
    if (tipo === 'abertura') {
        html += `
        <div class="modal-section">
            <h3>💰 Capital Social</h3>
            <div class="form-row">
                <div class="form-field">
                    <label>Capital Social Total (R$) <span class="required">*</span></label>
                    <input type="number" id="fc-capital" placeholder="0,00" step="0.01" min="0" oninput="recalcularParticipacoes()">
                </div>
            </div>
        </div>

        <div class="modal-section">
            <h3>🏭 Atividades da Empresa</h3>
            <div class="form-field">
                <label>Atividade Principal <span class="required">*</span></label>
                <input type="text" id="fc-atividade-principal" placeholder="CNAE ou descrição">
            </div>
            <div class="form-field" style="margin-top:12px;">
                <label>Atividade Secundária</label>
                <input type="text" id="fc-atividade-secundaria" placeholder="CNAE ou descrição">
            </div>
        </div>

        <div class="modal-section">
            <h3>📇 Dados para Cartão CNPJ</h3>
            <div class="aviso-publico">
                ⚠️ Essas informações ficam disponíveis para consulta pública. Recomendamos criar um e-mail específico.
            </div>
            <div class="form-row" style="margin-top:12px;">
                <div class="form-field">
                    <label>Telefone</label>
                    <input type="text" id="fc-telefone" placeholder="(00) 00000-0000">
                </div>
                <div class="form-field">
                    <label>E-mail</label>
                    <input type="email" id="fc-email-cnpj" placeholder="email@empresa.com.br">
                </div>
            </div>
        </div>

        <div class="modal-section">
            <h3>📊 Porte e Regime Tributário</h3>
            <div class="form-row">
                <div class="form-field">
                    <label>Porte da Empresa <span class="required">*</span></label>
                    <select id="fc-porte">
                        <option value="">Selecione...</option>
                        <option value="ME">ME — R$ 80.000,01 a R$ 360.000,00</option>
                        <option value="EPP">EPP — R$ 360.000,01 a R$ 4.800.000,00</option>
                    </select>
                </div>
                <div class="form-field">
                    <label>Regime Tributário <span class="required">*</span></label>
                    <select id="fc-regime">
                        <option value="">Selecione...</option>
                        <option value="simples">Simples Nacional</option>
                        <option value="presumido">Lucro Presumido</option>
                        <option value="real">Lucro Real</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="valor-calculado" style="font-size:1.1rem;text-align:center;padding:16px;margin-top:16px;">
            💰 Valor da Abertura: <strong>R$ 1.000,00</strong>
            <br><span style="font-size:0.78rem;font-weight:400;opacity:0.8;">Inclui: elaboração do contrato, registros e taxas</span>
        </div>`;
    }

    // Informativo importante
    html += `
    <div class="modal-section" style="margin-top:20px;">
        <h3>📌 Informações Importantes</h3>
        <div class="aviso-publico" style="background:#fff3cd;border-color:#856404;color:#856404;">
            • Este link de preenchimento funciona <strong>apenas uma vez</strong>. Após salvar, ele será invalidado.<br>
            • Caso precise alterar alguma informação após o envio, entre em <strong>contato direto com o escritório</strong>.<br>
            • Para acompanhar o andamento do seu processo, utilize o <strong>link de visualização</strong> que foi enviado junto com este link.
        </div>
    </div>`;

    // Botão salvar embaixo também
    html += `<div style="display:flex;justify-content:flex-end;margin-top:24px;padding-top:16px;border-top:1px solid var(--border);">
        <button class="btn btn-primary" onclick="salvarFormularioCliente()">💾 Salvar Dados</button>
    </div>`;

    return html;
}

// ===== SÓCIOS DINÂMICOS (FORMULÁRIO DO CLIENTE) =====
function adicionarSocioForm(dadosExistentes) {
    sociosFormCount++;
    const idx = sociosFormCount;
    const container = document.getElementById('fc-lista-socios');
    if (!container) return;

    const s = dadosExistentes || {};

    const html = `
        <div class="socio-entry" id="socio-entry-${idx}">
            <div class="socio-entry-header">
                <span class="socio-entry-title">Sócio ${idx}</span>
                <button class="btn-remove-socio" onclick="removerSocioForm(${idx})" title="Remover">×</button>
            </div>
            <div class="form-row">
                <div class="form-field">
                    <label>Nome Completo <span class="required">*</span></label>
                    <input type="text" id="socio-nome-${idx}" placeholder="Nome completo" value="${s.nome || ''}">
                </div>
                <div class="form-field" style="flex:0 0 180px;">
                    <label>% Participação</label>
                    <input type="number" id="socio-percentual-${idx}" placeholder="0" min="0" max="100" step="0.01" value="${s.percentual || ''}" oninput="recalcularParticipacoes()">
                </div>
            </div>
            <div class="form-row" style="margin-top:10px;">
                <div class="form-field" style="flex:0 0 200px;">
                    <label>CPF</label>
                    <input type="text" id="socio-cpf-${idx}" placeholder="000.000.000-00" maxlength="14" value="${s.cpf || ''}" oninput="aplicarMascaraCPF(this)">
                </div>
                <div class="form-field">
                    <label>Nacionalidade</label>
                    <input type="text" id="socio-nacionalidade-${idx}" value="${s.nacionalidade || 'Brasileira'}">
                </div>
                <div class="form-field">
                    <label>Profissão</label>
                    <input type="text" id="socio-profissao-${idx}" value="${s.profissao || ''}">
                </div>
            </div>
            <div class="form-row" style="margin-top:10px;">
                <div class="form-field">
                    <label>Estado Civil</label>
                    <select id="socio-estado-civil-${idx}">
                        <option value="">Selecione...</option>
                        ${Object.entries(ESTADOS_CIVIS).map(([v, l]) => `<option value="${v}" ${s.estadoCivil === v ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                </div>
                <div class="form-field">
                    <label>Regime de Casamento</label>
                    <select id="socio-regime-${idx}">
                        <option value="">N/A</option>
                        ${Object.entries(REGIMES_CASAMENTO).map(([v, l]) => `<option value="${v}" ${s.regimeCasamento === v ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                </div>
                <div class="form-field">
                    <label>Endereço Completo</label>
                    <input type="text" id="socio-endereco-${idx}" value="${s.endereco || ''}">
                </div>
            </div>
            <div class="form-field" id="socio-valor-calc-${idx}" style="margin-top:8px;"></div>
            <div class="socio-checkboxes">
                <label><input type="checkbox" id="socio-admin-${idx}" ${s.administrador ? 'checked' : ''}> Administrador</label>
                <label><input type="radio" name="responsavel-rf" id="socio-rf-${idx}" value="${idx}" ${s.responsavelRF ? 'checked' : ''}> Responsável na RF</label>
            </div>
        </div>`;

    container.insertAdjacentHTML('beforeend', html);
}

function removerSocioForm(idx) {
    const entry = document.getElementById('socio-entry-' + idx);
    if (entry) entry.remove();
    recalcularParticipacoes();
}

function recalcularParticipacoes() {
    const capital = parseFloat(document.getElementById('fc-capital')?.value) || 0;
    document.querySelectorAll('[id^="socio-percentual-"]').forEach(input => {
        const idx = input.id.split('-').pop();
        const pct = parseFloat(input.value) || 0;
        const valorEl = document.getElementById('socio-valor-calc-' + idx);
        if (valorEl && capital > 0 && pct > 0) {
            const valor = capital * pct / 100;
            valorEl.innerHTML = `<div class="valor-calculado">Valor da participação: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>`;
        } else if (valorEl) {
            valorEl.innerHTML = '';
        }
    });
}

// ===== UPLOAD =====
function handleUpload(input, containerId) {
    const container = document.getElementById(containerId);
    const files = Array.from(input.files);

    // Determinar tipo de arquivo pelo containerId
    const tipo = containerId.includes('iptu') ? 'iptu' : 'docs';

    files.forEach(file => {
        const fileId = Date.now() + Math.random().toString(36).substr(2, 5);

        // Guardar o File object para upload depois
        arquivosUpload[tipo].push({ file, name: file.name, id: fileId });

        // Preview
        const el = document.createElement('div');
        el.className = 'uploaded-file';
        el.id = 'file-' + fileId;

        // Se for imagem, mostrar miniatura
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            el.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${url}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--border);">
                    <span class="uploaded-file-name">🖼️ ${file.name}</span>
                </div>
                <button class="btn-remove-file" onclick="removerArquivo('${tipo}','${fileId}')">×</button>`;
        } else {
            el.innerHTML = `<span class="uploaded-file-name">📄 ${file.name}</span><button class="btn-remove-file" onclick="removerArquivo('${tipo}','${fileId}')">×</button>`;
        }
        container.appendChild(el);
    });
    input.value = '';
}

function removerArquivo(tipo, fileId) {
    arquivosUpload[tipo] = arquivosUpload[tipo].filter(a => a.id !== fileId);
    const el = document.getElementById('file-' + fileId);
    if (el) el.remove();
}

// Upload de arquivos para Firebase Storage e retorna as URLs
async function uploadArquivosParaStorage(processoId) {
    if (!storage) return { iptu: [], docs: [] };

    const resultado = { iptu: [], docs: [] };

    for (const tipo of ['iptu', 'docs']) {
        for (const item of arquivosUpload[tipo]) {
            try {
                const path = `atos-societarios/${processoId}/${tipo}/${item.id}_${item.name}`;
                const ref = storage.ref().child(path);
                await ref.put(item.file);
                const url = await ref.getDownloadURL();
                resultado[tipo].push({ name: item.name, url: url });
            } catch (e) {
                console.error(`Erro ao fazer upload de ${item.name}:`, e);
            }
        }
    }

    return resultado;
}

function handleUploadCliente(input) {
    handleUpload(input, 'status-arquivos-docs');
}

// ===== SALVAR FORMULÁRIO DO CLIENTE =====
async function salvarFormularioCliente() {
    if (!processoAtual) return;

    // Coletar dados
    const razao1 = document.getElementById('fc-razao1')?.value.trim();
    if (!razao1 && processoAtual.tipo !== 'encerramento') {
        showToast('Preencha a razão social');
        return;
    }

    showToast('Salvando dados...');

    // Upload de arquivos para Firebase Storage (se disponível)
    let arquivosUrls = { iptu: [], docs: [] };
    if (storage) {
        arquivosUrls = await uploadArquivosParaStorage(processoAtual.id);
    }

    // Coletar sócios
    const socios = [];
    document.querySelectorAll('[id^="socio-entry-"]').forEach(entry => {
        const idx = entry.id.split('-').pop();
        const nome = document.getElementById('socio-nome-' + idx)?.value.trim();
        if (nome) {
            socios.push({
                nome,
                percentual: parseFloat(document.getElementById('socio-percentual-' + idx)?.value) || 0,
                cpf: document.getElementById('socio-cpf-' + idx)?.value.trim() || '',
                nacionalidade: document.getElementById('socio-nacionalidade-' + idx)?.value || '',
                profissao: document.getElementById('socio-profissao-' + idx)?.value || '',
                estadoCivil: document.getElementById('socio-estado-civil-' + idx)?.value || '',
                regimeCasamento: document.getElementById('socio-regime-' + idx)?.value || '',
                endereco: document.getElementById('socio-endereco-' + idx)?.value || '',
                administrador: document.getElementById('socio-admin-' + idx)?.checked || false,
                responsavelRF: document.getElementById('socio-rf-' + idx)?.checked || false
            });
        }
    });

    const dados = {
        razaoSocial: razao1 || '',
        razaoSocial2: document.getElementById('fc-razao2')?.value.trim() || '',
        endereco: document.getElementById('fc-endereco')?.value.trim() || '',
        capitalSocial: parseFloat(document.getElementById('fc-capital')?.value) || 0,
        atividadePrincipal: document.getElementById('fc-atividade-principal')?.value.trim() || '',
        atividadeSecundaria: document.getElementById('fc-atividade-secundaria')?.value.trim() || '',
        telefone: document.getElementById('fc-telefone')?.value.trim() || '',
        emailCNPJ: document.getElementById('fc-email-cnpj')?.value.trim() || '',
        porte: document.getElementById('fc-porte')?.value || '',
        regimeTributario: document.getElementById('fc-regime')?.value || ''
    };

    const agora = new Date().toISOString();
    const atualizacoes = {
        dados: dados,
        socios: socios,
        preenchidoEm: processoAtual.preenchidoEm || agora,
        atualizadoEm: agora,
        formLinkUsado: true,
        formLinkUsadoEm: agora
    };

    // Adicionar URLs dos arquivos se houver uploads
    if (arquivosUrls.iptu.length > 0 || arquivosUrls.docs.length > 0) {
        // Merge com arquivos existentes
        const iptuExistente = processoAtual.arquivos?.iptu || [];
        const docsExistente = processoAtual.arquivos?.docs || [];
        atualizacoes.arquivos = {
            iptu: [...iptuExistente, ...arquivosUrls.iptu],
            docs: [...docsExistente, ...arquivosUrls.docs]
        };
    }

    // Avançar etapa de solicitação se ainda em andamento
    if (processoAtual.etapas?.solicitacao?.status === 'em-andamento') {
        const novasEtapas = { ...processoAtual.etapas };
        novasEtapas.solicitacao = { status: 'concluido', data: agora, observacao: '' };
        atualizacoes.etapas = novasEtapas;
    }

    try {
        await atualizarProcessoNoFirestore(processoAtual.id, atualizacoes);
        processoAtual = { ...processoAtual, ...atualizacoes };
    } catch (e) {
        console.error('Erro ao salvar:', e);
        showToast('Erro ao salvar. Tente novamente.');
        return;
    }

    // Demo: persistir nomes dos arquivos no localStorage para apresentação
    const demoArquivos = {
        iptu: arquivosUpload.iptu.map(a => a.name),
        docs: arquivosUpload.docs.map(a => a.name),
        savedAt: new Date().toISOString()
    };
    if (demoArquivos.iptu.length > 0 || demoArquivos.docs.length > 0) {
        localStorage.setItem('demo-arquivos-' + processoAtual.id, JSON.stringify(demoArquivos));
    }

    // Limpar arquivos pendentes
    arquivosUpload = { iptu: [], docs: [] };

    // Mostrar mensagem de sucesso e link de acompanhamento
    document.getElementById('form-links-salvos').style.display = 'block';
    document.getElementById('link-form').value = 'Este link foi utilizado e não pode mais ser acessado';
    document.getElementById('link-form').disabled = true;
    document.getElementById('link-status').value = montarLinkStatus(processoAtual.linkStatus);

    showToast('Dados salvos com sucesso! Este link de edição foi utilizado. 🎉');
}

function preencherFormulario(processo) {
    const d = processo.dados || {};
    setTimeout(() => {
        if (document.getElementById('fc-razao1')) document.getElementById('fc-razao1').value = d.razaoSocial || '';
        if (document.getElementById('fc-razao2')) document.getElementById('fc-razao2').value = d.razaoSocial2 || '';
        if (document.getElementById('fc-endereco')) document.getElementById('fc-endereco').value = d.endereco || '';
        if (document.getElementById('fc-capital')) document.getElementById('fc-capital').value = d.capitalSocial || '';
        if (document.getElementById('fc-atividade-principal')) document.getElementById('fc-atividade-principal').value = d.atividadePrincipal || '';
        if (document.getElementById('fc-atividade-secundaria')) document.getElementById('fc-atividade-secundaria').value = d.atividadeSecundaria || '';
        if (document.getElementById('fc-telefone')) document.getElementById('fc-telefone').value = d.telefone || '';
        if (document.getElementById('fc-email-cnpj')) document.getElementById('fc-email-cnpj').value = d.emailCNPJ || '';
        if (document.getElementById('fc-porte')) document.getElementById('fc-porte').value = d.porte || '';
        if (document.getElementById('fc-regime')) document.getElementById('fc-regime').value = d.regimeTributario || '';
    }, 100);
}

// ===================================================================
//  STATUS DO CLIENTE (acesso via ?status=CODIGO)
// ===================================================================

async function carregarStatus(codigo) {
    const processo = await buscarPorLinkStatus(codigo);
    if (!processo) {
        mostrarView('view-invalido');
        return;
    }

    const d = processo.dados || {};
    document.getElementById('status-titulo').textContent = `📋 ${d.razaoSocial || processo.clienteNome || 'Seu Processo'}`;
    document.getElementById('status-descricao').textContent = TIPOS_LABEL[processo.tipo] +
        (processo.subtipo ? ' — ' + SUBTIPOS_LABEL[processo.subtipo] : '');

    // Pipeline
    renderizarPipeline(processo, 'status-pipeline', false);

    // Info
    renderizarInfoProcesso(processo, 'status-info');

    // Upload de docs (se não concluído)
    if (processo.status !== 'concluido') {
        document.getElementById('status-secao-upload').style.display = 'block';
    }

    // Listener em tempo real pra atualizar automaticamente
    escutarProcesso(processo.id, atualizado => {
        renderizarPipeline(atualizado, 'status-pipeline', false);
        renderizarInfoProcesso(atualizado, 'status-info');
    });
}

// ===================================================================
//  COMPONENTES COMPARTILHADOS
// ===================================================================

function renderizarPipeline(processo, containerId, editavel) {
    const etapasConfig = ETAPAS_POR_TIPO[processo.tipo] || [];
    const container = document.getElementById(containerId);

    container.innerHTML = etapasConfig.map((etapa, i) => {
        const estado = processo.etapas?.[etapa.id]?.status || 'pendente';
        const isLast = i === etapasConfig.length - 1;
        return `
            <div class="etapa">
                <div class="etapa-circle ${estado}">${estado === 'concluido' ? '✓' : (i + 1)}</div>
                <span class="etapa-label">${etapa.label}</span>
            </div>
            ${!isLast ? `<div class="etapa-connector ${estado === 'concluido' ? 'concluido' : ''}"></div>` : ''}
        `;
    }).join('');
}

function renderizarInfoProcesso(processo, containerId) {
    const container = document.getElementById(containerId);
    const d = processo.dados || {};
    const tipo = processo.tipo;

    let html = '';

    // ── Resumo sempre visível ──
    const statusLabels = { 'pendente': 'Pendente', 'em-andamento': 'Em Andamento', 'concluido': 'Concluído' };
    const statusCls    = { 'pendente': '#856404', 'em-andamento': '#2d6196', 'concluido': '#1e6e45' };
    const statusBg     = { 'pendente': '#fff3cd', 'em-andamento': '#dbeafe', 'concluido': '#d4edda' };
    const sg = calcularStatusGeral(processo);
    html += `<div class="info-section" style="margin-bottom:16px;">
        <h4 style="font-size:0.78rem;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px;">📋 Dados do Processo</h4>
        <div class="info-row"><span class="info-label">Cliente</span><span class="info-value" style="font-weight:600;">${processo.clienteNome || '—'}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span style="background:${statusBg[sg]};color:${statusCls[sg]};padding:2px 10px;border-radius:12px;font-size:0.78rem;font-weight:700;">${statusLabels[sg] || sg}</span></span></div>
        <div class="info-row"><span class="info-label">Criado em</span><span class="info-value">${new Date(processo.criadoEm).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric'})}</span></div>
        ${processo.preenchidoEm ? `<div class="info-row"><span class="info-label">Preenchido em</span><span class="info-value">${new Date(processo.preenchidoEm).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})}</span></div>` : '<div class="info-row"><span class="info-label">Formulário</span><span class="info-value" style="color:var(--warning);">⏳ Aguardando preenchimento</span></div>'}
    </div>`;

    // ── Dados da Empresa (sempre visível para abertura e alteração) ──
    if (tipo !== 'encerramento') {
        html += `<div class="info-section" style="margin-top:16px;">
            <h4 style="font-size:0.78rem;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px;">🏢 Dados da Empresa</h4>
            <div class="info-row"><span class="info-label">Razão Social</span><span class="info-value">${d.razaoSocial || '<span style="color:var(--text-light);">—</span>'}</span></div>
            <div class="info-row"><span class="info-label">Razão Social (opção 2)</span><span class="info-value">${d.razaoSocial2 || '<span style="color:var(--text-light);">—</span>'}</span></div>
            <div class="info-row"><span class="info-label">Endereço</span><span class="info-value">${d.endereco || '<span style="color:var(--text-light);">—</span>'}</span></div>`;

        if (tipo === 'abertura') {
            html += `
            <div class="info-row"><span class="info-label">Capital Social</span><span class="info-value" style="font-weight:700;">${d.capitalSocial ? 'R$ ' + d.capitalSocial.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '<span style="color:var(--text-light);">—</span>'}</span></div>
            <div class="info-row"><span class="info-label">Atividade Principal</span><span class="info-value">${d.atividadePrincipal || '<span style="color:var(--text-light);">—</span>'}</span></div>
            <div class="info-row"><span class="info-label">Atividade Secundária</span><span class="info-value">${d.atividadeSecundaria || '<span style="color:var(--text-light);">—</span>'}</span></div>
            <div class="info-row"><span class="info-label">Telefone</span><span class="info-value">${d.telefone || '<span style="color:var(--text-light);">—</span>'}</span></div>
            <div class="info-row"><span class="info-label">E-mail CNPJ</span><span class="info-value">${d.emailCNPJ || '<span style="color:var(--text-light);">—</span>'}</span></div>
            <div class="info-row"><span class="info-label">Porte</span><span class="info-value">${d.porte ? (PORTES[d.porte] || d.porte) : '<span style="color:var(--text-light);">—</span>'}</span></div>
            <div class="info-row"><span class="info-label">Regime Tributário</span><span class="info-value">${d.regimeTributario ? (REGIMES[d.regimeTributario] || d.regimeTributario) : '<span style="color:var(--text-light);">—</span>'}</span></div>`;
        }

        html += `</div>`;
    }

    // ── Sócios (sempre visível para abertura e alteração) ──
    if (tipo !== 'encerramento') {
        const socios = processo.socios || [];
        const totalPct = socios.reduce((sum, s) => sum + (s.percentual || 0), 0);
        html += `<div class="info-section" style="margin-top:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <h4 style="font-size:0.78rem;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.4px;">👥 Sócios${socios.length ? ` (${socios.length}) — ${totalPct}% total` : ''}</h4>
                ${socios.length ? `<button class="btn btn-small btn-outline" onclick="toggleTodosSocios()" id="btn-toggle-socios" style="font-size:0.72rem;">▼ Expandir todos</button>` : ''}
            </div>
            ${socios.length ? `
            <input type="text" id="filtro-socios-modal" placeholder="🔍 Buscar sócio..." oninput="filtrarSociosModal()" style="width:100%;padding:6px 10px;border:1.5px solid var(--border);border-radius:var(--radius);font-size:0.82rem;margin-bottom:10px;">
            <div id="lista-socios-modal">
                ${socios.map((s, i) => montarSocioCard(s, i)).join('')}
            </div>` : `<div style="font-size:0.82rem;color:var(--text-light);padding:10px 0;">⏳ Nenhum sócio informado ainda.</div>`}
        </div>`;
    }

    // ── Arquivos / Documentos (sempre visível) ──
    const arquivos = processo.arquivos || {};
    const iptuFiles = arquivos.iptu || [];
    const docsFiles = arquivos.docs || [];

    // IPTU — apenas para abertura e alteração
    if (tipo !== 'encerramento') {
        html += `<div class="info-section" style="margin-top:16px;">
            <h4 style="font-size:0.78rem;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px;">🏠 Comprovante de IPTU</h4>`;
        if (iptuFiles.length > 0) {
            html += `<div style="display:flex;flex-wrap:wrap;gap:8px;">${iptuFiles.map(f => montarMiniaturaArquivo(f)).join('')}</div>`;
        } else {
            html += `<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;background:var(--bg-section);border:1.5px dashed var(--border);border-radius:var(--radius);">
                <span style="font-size:1.5rem;opacity:0.4;">📎</span>
                <span style="font-size:0.82rem;color:var(--text-light);">Nenhum arquivo enviado ainda.</span>
            </div>`;
        }
        html += `</div>`;
    }

    // Documentos Pessoais — abertura e encerramento
    if (tipo === 'abertura' || tipo === 'encerramento') {
        html += `<div class="info-section" style="margin-top:16px;">
            <h4 style="font-size:0.78rem;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px;">📄 Documentos Pessoais dos Sócios</h4>`;
        if (docsFiles.length > 0) {
            html += `<div style="display:flex;flex-wrap:wrap;gap:8px;">${docsFiles.map(f => montarMiniaturaArquivo(f)).join('')}</div>`;
        } else {
            html += `<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;background:var(--bg-section);border:1.5px dashed var(--border);border-radius:var(--radius);">
                <span style="font-size:1.5rem;opacity:0.4;">📎</span>
                <span style="font-size:0.82rem;color:var(--text-light);">Nenhum documento enviado ainda.</span>
            </div>`;
        }
        html += `</div>`;
    }

    container.innerHTML = html;
}

function montarSocioCard(s, i) {
    const badges = [];
    if (s.administrador) badges.push('<span style="background:var(--gold);color:#fff;padding:2px 8px;border-radius:10px;font-size:0.68rem;font-weight:700;">Admin</span>');
    if (s.responsavelRF) badges.push('<span style="background:var(--accent);color:#fff;padding:2px 8px;border-radius:10px;font-size:0.68rem;font-weight:700;">Resp. RF</span>');

    return `<div class="socio-card" id="socio-card-${i}" data-nome="${(s.nome || '').toLowerCase()}">
        <div class="socio-card-header" onclick="toggleSocioDetalhe(${i})" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:8px 0;">
            <div>
                <strong>${s.nome || 'Sem nome'}</strong>
                ${s.percentual ? `<span style="color:var(--text-light);margin-left:8px;">${s.percentual}%</span>` : ''}
                ${badges.length ? '<span style="margin-left:8px;">' + badges.join(' ') + '</span>' : ''}
            </div>
            <span class="socio-toggle" id="socio-toggle-${i}" style="font-size:0.8rem;color:var(--text-light);">▶</span>
        </div>
        <div class="socio-detalhe" id="socio-detalhe-${i}" style="display:none;padding:8px 0 12px 12px;border-top:1px solid var(--border);font-size:0.82rem;">
            ${s.cpf ? `<div class="info-row"><span class="info-label">CPF</span><span class="info-value">${s.cpf}</span></div>` : ''}
            ${s.nacionalidade ? `<div class="info-row"><span class="info-label">Nacionalidade</span><span class="info-value">${s.nacionalidade}</span></div>` : ''}
            ${s.profissao ? `<div class="info-row"><span class="info-label">Profissão</span><span class="info-value">${s.profissao}</span></div>` : ''}
            ${s.estadoCivil ? `<div class="info-row"><span class="info-label">Estado Civil</span><span class="info-value">${ESTADOS_CIVIS[s.estadoCivil] || s.estadoCivil}</span></div>` : ''}
            ${s.regimeCasamento ? `<div class="info-row"><span class="info-label">Regime de Casamento</span><span class="info-value">${REGIMES_CASAMENTO[s.regimeCasamento] || s.regimeCasamento}</span></div>` : ''}
            ${s.endereco ? `<div class="info-row"><span class="info-label">Endereço</span><span class="info-value">${s.endereco}</span></div>` : ''}
            ${s.percentual && s._capital ? `<div class="info-row"><span class="info-label">Valor da Participação</span><span class="info-value" style="font-weight:700;">R$ ${(s.percentual * s._capital / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>` : ''}
        </div>
    </div>`;
}

function toggleSocioDetalhe(i) {
    const detalhe = document.getElementById('socio-detalhe-' + i);
    const toggle = document.getElementById('socio-toggle-' + i);
    if (!detalhe) return;
    const visivel = detalhe.style.display !== 'none';
    detalhe.style.display = visivel ? 'none' : 'block';
    toggle.textContent = visivel ? '▶' : '▼';
}

let _sociosTodosExpandidos = false;
function toggleTodosSocios() {
    _sociosTodosExpandidos = !_sociosTodosExpandidos;
    document.querySelectorAll('.socio-detalhe').forEach(el => {
        el.style.display = _sociosTodosExpandidos ? 'block' : 'none';
    });
    document.querySelectorAll('.socio-toggle').forEach(el => {
        el.textContent = _sociosTodosExpandidos ? '▼' : '▶';
    });
    document.getElementById('btn-toggle-socios').textContent = _sociosTodosExpandidos ? '▲ Recolher todos' : '▼ Expandir todos';
}

function filtrarSociosModal() {
    const busca = (document.getElementById('filtro-socios-modal')?.value || '').toLowerCase().trim();
    document.querySelectorAll('#lista-socios-modal .socio-card').forEach(card => {
        const nome = card.dataset.nome || '';
        card.style.display = (!busca || nome.includes(busca)) ? '' : 'none';
    });
}

// ===== RENDERIZAÇÃO DO PAINEL =====
function renderizarDashboard() {
    const busca = (document.getElementById('filtro-cliente')?.value || '').toLowerCase().trim();
    let processosFiltrados = processos;

    // Filtro por texto digitado
    if (busca) {
        processosFiltrados = processos.filter(p => {
            const nome = (p.clienteNome || '').toLowerCase();
            const razao = (p.dados?.razaoSocial || '').toLowerCase();
            const razao2 = (p.dados?.razaoSocial2 || '').toLowerCase();
            return nome.includes(busca) || razao.includes(busca) || razao2.includes(busca);
        });
    }

    const aberturas = processosFiltrados.filter(p => p.tipo === 'abertura').length;
    const alteracoes = processosFiltrados.filter(p => p.tipo === 'alteracao').length;
    const encerramentos = processosFiltrados.filter(p => p.tipo === 'encerramento').length;
    const pendentes = processosFiltrados.filter(p => p.status === 'pendente').length;

    document.getElementById('dash-aberturas').textContent = aberturas;
    document.getElementById('dash-alteracoes').textContent = alteracoes;
    document.getElementById('dash-encerramentos').textContent = encerramentos;
    document.getElementById('dash-pendentes').textContent = pendentes;

    const recentes = document.getElementById('processos-recentes');
    if (processosFiltrados.length === 0) {
        recentes.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span><p>${busca ? 'Nenhum resultado para "' + busca + '"' : 'Nenhum processo cadastrado'}</p>${!busca ? '<p class="empty-hint">Clique em "Novo Processo" para começar</p>' : ''}</div>`;
        return;
    }

    const sorted = [...processosFiltrados].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    recentes.innerHTML = sorted.slice(0, 5).map(p => criarCardProcesso(p)).join('');
}

function renderizarLista(tipo, containerId) {
    const container = document.getElementById(containerId);
    const busca = (document.getElementById('filtro-cliente')?.value || '').toLowerCase().trim();
    let lista = processos.filter(p => p.tipo === tipo);

    // Filtro por texto digitado
    if (busca) {
        lista = lista.filter(p => {
            const nome = (p.clienteNome || '').toLowerCase();
            const razao = (p.dados?.razaoSocial || '').toLowerCase();
            const razao2 = (p.dados?.razaoSocial2 || '').toLowerCase();
            return nome.includes(busca) || razao.includes(busca) || razao2.includes(busca);
        });
    }

    if (lista.length === 0) {
        const icons = { abertura: '🏢', alteracao: '✏️', encerramento: '❌' };
        const labels = { abertura: 'abertura', alteracao: 'alteração', encerramento: 'encerramento' };
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">${icons[tipo]}</span><p>${busca ? 'Nenhum resultado para "' + busca + '"' : 'Nenhum ' + labels[tipo] + ' cadastrado'}</p></div>`;
        return;
    }

    container.innerHTML = lista.map(p => criarCardProcesso(p)).join('');
}

function criarCardProcesso(processo) {
    const statusLabel = { 'pendente': 'Pendente', 'em-andamento': 'Em Andamento', 'concluido': 'Concluído' };

    const etapasConfig = ETAPAS_POR_TIPO[processo.tipo] || [];
    let etapaAtual = 'Início';
    for (const etapa of etapasConfig) {
        const estado = processo.etapas?.[etapa.id]?.status;
        if (estado === 'em-andamento') { etapaAtual = etapa.label; break; }
        if (estado === 'concluido') etapaAtual = etapa.label;
    }

    const statusGeral = calcularStatusGeral(processo);
    const nome = processo.dados?.razaoSocial || processo.clienteNome || 'Sem nome';
    const preenchido = processo.preenchidoEm ? '' : ' <span style="color:var(--warning);font-size:0.72rem;">⏳ Aguardando preenchimento</span>';

    return `
        <div class="processo-card" onclick="abrirDetalheProcesso('${processo.id}')">
            <div class="processo-header">
                <span class="processo-tipo ${processo.tipo}">${TIPOS_LABEL[processo.tipo]}</span>
                <span class="processo-status ${statusGeral}">${statusLabel[statusGeral]}</span>
            </div>
            <div class="processo-empresa">${nome}${preenchido}</div>
            <div class="processo-meta">
                ${processo.subtipo ? SUBTIPOS_LABEL[processo.subtipo] + ' · ' : ''}
                Etapa: ${etapaAtual} · ${new Date(processo.criadoEm).toLocaleDateString('pt-BR')}
            </div>
        </div>`;
}

function calcularStatusGeral(processo) {
    const etapas = Object.values(processo.etapas || {});
    if (etapas.every(e => e.status === 'concluido')) return 'concluido';
    if (etapas.some(e => e.status === 'em-andamento')) return 'em-andamento';
    return 'pendente';
}

// ===== UTILITÁRIOS =====

function montarMiniaturaArquivo(arquivo) {
    const isImagem = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(arquivo.name || arquivo.url);
    const nome = arquivo.name || 'Arquivo';

    if (isImagem) {
        return `<a href="${arquivo.url}" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;">
            <div style="width:90px;height:90px;border-radius:8px;overflow:hidden;border:2px solid var(--border);cursor:pointer;position:relative;" title="${nome}">
                <img src="${arquivo.url}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:#fff;font-size:0.6rem;padding:2px 4px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nome}</div>
            </div>
        </a>`;
    }

    // PDF ou outro arquivo
    return `<a href="${arquivo.url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:8px 12px;background:var(--bg-section);border:1.5px solid var(--border);border-radius:8px;text-decoration:none;color:var(--text);font-size:0.78rem;cursor:pointer;" title="${nome}">
        <span style="font-size:1.2rem;">📄</span>
        <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nome}</span>
    </a>`;
}
async function copiarTexto(texto) {
    // Método 1: Clipboard API moderna
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(texto);
            showToast('Copiado! 📋');
            return;
        } catch (e) { /* continua pro fallback */ }
    }

    // Método 2: textarea focado + select
    try {
        const ta = document.createElement('textarea');
        ta.value = texto;
        ta.contentEditable = true;
        ta.readOnly = false;
        ta.style.cssText = 'position:fixed;top:10px;left:10px;z-index:99999;width:1px;height:1px;padding:0;border:none;outline:none;opacity:0;';
        document.body.appendChild(ta);
        ta.focus({ preventScroll: true });
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) {
            showToast('Copiado! 📋');
            return;
        }
    } catch (e) { /* continua pro fallback */ }

    // Método 3: mostra o texto e pede pra copiar manualmente
    showToast('Copie manualmente (Ctrl+C)');
    prompt('Copie o texto abaixo:', texto);
}

function copiarLink(inputId) {
    const input = document.getElementById(inputId);
    copiarTexto(input.value);
}

// ===== VALIDAÇÃO DE CPF =====
function validarCPF(cpf) {
    cpf = (cpf || '').replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    return resto === parseInt(cpf.charAt(10));
}

function formatarCPF(valor) {
    valor = (valor || '').replace(/\D/g, '').slice(0, 11);
    if (valor.length > 9) return valor.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    if (valor.length > 6) return valor.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    if (valor.length > 3) return valor.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    return valor;
}

function aplicarMascaraCPF(input) {
    input.value = formatarCPF(input.value);
    const cpf = input.value.replace(/\D/g, '');
    if (cpf.length === 11) {
        if (validarCPF(cpf)) {
            input.style.borderColor = '#28a745';
            input.title = 'CPF válido ✓';
        } else {
            input.style.borderColor = '#dc3545';
            input.title = 'CPF inválido ✗';
        }
    } else {
        input.style.borderColor = '';
        input.title = '';
    }
}

async function gerarNovoLinkForm() {
    const processo = window._processoDetalhe;
    if (!processo) return;

    if (!confirm('Gerar um novo link de edição? O link anterior (se ainda válido) será invalidado.')) return;

    showToast('Gerando novo link...');

    let novoCodigo;
    try {
        do { novoCodigo = gerarCodigo(10); } while (await existeCodigo(novoCodigo));
    } catch (e) {
        showToast('Erro ao gerar código. Tente novamente.');
        return;
    }

    try {
        await atualizarProcessoNoFirestore(processo.id, {
            linkForm: novoCodigo,
            formLinkUsado: false,
            formLinkUsadoEm: null,
            atualizadoEm: new Date().toISOString()
        });
    } catch (e) {
        console.error('Erro ao atualizar link:', e);
        showToast('Erro ao salvar. Tente novamente.');
        return;
    }

    // Atualizar modal
    document.getElementById('detalhe-link-form').value = montarLinkForm(novoCodigo);
    document.getElementById('detalhe-form-usado').style.display = 'none';

    // Atualizar referência local
    processo.linkForm = novoCodigo;
    processo.formLinkUsado = false;
    window._linksParaEnviarDetalhe = {
        form: montarLinkForm(novoCodigo),
        status: montarLinkStatus(processo.linkStatus),
        tipo: TIPOS_LABEL[processo.tipo]
    };

    showToast('Novo link de edição gerado! Copie e envie ao cliente. ✅');
}

function enviarLinksWhatsApp() {
    // Pega os links direto dos inputs (mesma lógica dos botões Copiar que funcionam)
    const linkForm = document.getElementById('detalhe-link-form')?.value
        || document.getElementById('link-gerado-form')?.value
        || '';
    const linkStatus = document.getElementById('detalhe-link-status')?.value
        || document.getElementById('link-gerado-status')?.value
        || '';
    const cliente = window._linksParaEnviar?.cliente
        || window._linksParaEnviarDetalhe?.cliente
        || '';
    const tipo = window._linksParaEnviar?.tipo
        || window._linksParaEnviarDetalhe?.tipo
        || 'ato societário';

    const msg = `Olá${cliente ? ' ' + cliente : ''}! Seu processo de ${tipo} foi criado.
` +
        `📝 *Preencher dados:* ${linkForm}\n` +
        `📊 *Acompanhar status:* ${linkStatus}`;

    copiarTexto(msg);
}

function aplicarFiltro() {
    renderizarPainel();
}

function showToast(msg) {
    const existing = document.querySelector('.success-message');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'success-message';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// ===== EXPOR FUNÇÕES GLOBAIS PARA MÓDULOS =====
window.renderizarPainel = renderizarPainel;


// Expor função globalmente para auth.js
window.renderizarPainel = renderizarPainel;
