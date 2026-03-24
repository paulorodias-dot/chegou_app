// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = 'https://piivacmvyfmbocfcmtnq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8ImnHUhbpnmRSoPo1iBFAw_fBzWtojJ';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variável global para controlar se estamos editando alguém
let editandoId = null;

// --- 🛡️ BLOQUEIOS ANTI-CURIOSO ---
document.addEventListener('contextmenu', e => e.preventDefault());
document.onkeydown = function(e) {
    if (e.keyCode == 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74 || e.keyCode == 67)) || 
        (e.ctrlKey && e.keyCode == 85)) {
        return false;
    }
};

// --- ⌨️ SUPORTE AO ENTER / IR (Mobile) ---
function verificarEnter(event) {
    if (event.key === "Enter") {
        handleLogin();
    }
}

// Inicialização de eventos ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const campoEmail = document.getElementById('email');
    const campoSenha = document.getElementById('senha');
    
    if (campoEmail) campoEmail.addEventListener('keypress', verificarEnter);
    if (campoSenha) campoSenha.addEventListener('keypress', verificarEnter);

    gerenciarMenuPrivilegiado();

    if (window.location.pathname.includes('admin.html')) {
        carregarMoradores();
    }
});

// --- 📝 REGISTRO DE LOGS ---
async function registrarLog(id, tipo, acao, detalhes) {
    try {
        await _supabase.from('logs_atividade').insert([{ 
            usuario_id: id, tipo_usuario: tipo, acao: acao, detalhes: detalhes 
        }]);
    } catch (err) { console.error("Erro Log:", err); }
}

// --- 🔑 LÓGICA DE LOGIN ---
async function handleLogin() {
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const erroDiv = document.getElementById('msg-erro');

    if (!emailInput || !senhaInput) return;

    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    if (!email || !senha) {
        if(erroDiv) {
            erroDiv.innerText = "Preencha todos os campos.";
            erroDiv.style.display = "block";
        }
        return;
    }

    try {
        const { data: root, error } = await _supabase
            .from('usuarios_root')
            .select('*')
            .eq('email', email)
            .eq('senha', senha)
            .maybeSingle();

        if (error) {
            console.error("Erro Supabase:", error);
            if(erroDiv) erroDiv.innerText = "Erro técnico ao consultar o banco.";
            return;
        }

        if (root) {
            localStorage.setItem('usuario_tipo', 'ROOT');
            localStorage.setItem('usuario_id', root.id);
            await registrarLog(root.id, 'ROOT', 'LOGIN_SUCESSO', 'Acesso ao Painel Mestre');
            window.location.href = 'root.html';
        } else {
            if(erroDiv) {
                erroDiv.innerText = "E-mail ou Senha incorretos.";
                erroDiv.style.display = "block";
            }
        }
    } catch (err) {
        console.error("Erro inesperado:", err);
    }
}

// --- 🧭 GESTÃO DO MENU PRIVILEGIADO ---
function gerenciarMenuPrivilegiado() {
    const tipo = localStorage.getItem('usuario_tipo');
    const menu = document.getElementById('menu-navegacao-dinamico');
    const btnRoot = document.getElementById('btn-root');

    if (!menu) return;

    if (tipo === 'ROOT' || tipo === 'ADMIN') {
        menu.style.display = 'flex';
        if (btnRoot) {
            btnRoot.style.display = (tipo === 'ROOT') ? 'inline-block' : 'none';
        }
    } else {
        menu.style.display = 'none';
    }
}

// --- 🚪 LOGOUT ---
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// --- 👥 FUNÇÕES DE GESTÃO DE MORADORES (ADMIN) ---

async function salvarMorador() {
    const nome = document.getElementById('nomeMorador').value;
    const bloco = document.getElementById('blocoMorador').value;
    const apto = document.getElementById('aptoMorador').value;
    const vinculo = document.getElementById('vinculoMorador').value;
    const ddi = document.getElementById('ddiMorador').value;
    const zap = document.getElementById('whatsappMorador').value;

    if (!bloco || !apto) {
        alert("⚠️ Informe ao menos o Bloco e o Apartamento.");
        return;
    }

    const whatsappCompleto = zap ? ddi + zap.replace(/\D/g, '') : null;

    const dadosMorador = { 
        nome_completo: nome || "Unidade Vazia", 
        unidade: apto,
        whatsapp: whatsappCompleto,
        tipo_vinculo: vinculo,
        torre_id: bloco
    };

    try {
        let resultado;
        
        if (editandoId) {
            resultado = await _supabase
                .from('moradores')
                .update(dadosMorador)
                .eq('id', editandoId);
        } else {
            resultado = await _supabase
                .from('moradores')
                .insert([dadosMorador]);
        }

        if (resultado.error) throw resultado.error;

        alert(editandoId ? "✅ Cadastro atualizado!" : "✅ Unidade/Morador salvo com sucesso!");
        
        limparFormularioMorador();
        carregarMoradores();

    } catch (err) {
        alert("Erro ao salvar: " + err.message);
    }
}

function limparFormularioMorador() {
    editandoId = null; 
    document.getElementById('nomeMorador').value = '';
    document.getElementById('blocoMorador').value = '';
    document.getElementById('aptoMorador').value = '';
    document.getElementById('whatsappMorador').value = '';
    document.getElementById('vinculoMorador').value = 'proprietario';
    
    const btn = document.querySelector('.btn-login-main');
    if (btn) btn.innerText = "Salvar Morador";
}

async function carregarMoradores() {
    const lista = document.getElementById('listaMoradores');
    if (!lista) return;

    try {
        const { data, error } = await _supabase
            .from('moradores')
            .select('*')
            .order('unidade', { ascending: true });

        if (error) throw error;

        lista.innerHTML = data.map(m => {
            const isVazio = m.tipo_vinculo === 'vazio';
            return `
                <tr style="${isVazio ? 'color: #999; font-style: italic;' : ''}">
                    <td style="padding: 12px; font-weight: bold; color: ${isVazio ? '#999' : 'var(--primary)'};">
                        Torre ${m.torre_id} - ${m.unidade}
                    </td>
                    <td style="padding: 12px;">
                        ${isVazio ? '--- Unidade Vazia ---' : m.nome_completo}
                        ${!isVazio ? '<span class="badge-status">Ativo</span>' : ''}
                    </td>
                    <td style="padding: 12px; text-transform: capitalize;">${m.tipo_vinculo}</td>
                    <td style="padding: 12px;">${m.whatsapp ? '+' + m.whatsapp : 'N/A'}</td>
                    <td style="padding: 12px; text-align: center; white-space: nowrap;">
                        <button class="btn-acao" onclick="prepararEdicao('${m.id}')" title="Editar">✏️</button>
                        <button class="btn-acao" onclick="excluirMorador('${m.id}')" style="margin-left: 5px;" title="Excluir">🗑️</button>
                        <button class="btn-acao" onclick="enviarZap('${m.whatsapp}', '${m.nome_completo}')" title="Enviar WhatsApp" style="margin-left: 5px;">
                            <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" width="18" height="18" style="vertical-align: middle;">
                        </button>
                    </td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum morador cadastrado.</td></tr>';

    } catch (err) {
        console.error("Erro ao carregar lista:", err.message);
    }
}

async function prepararEdicao(id) {
    try {
        const { data, error } = await _supabase
            .from('moradores')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('nomeMorador').value = data.nome_completo === "Unidade Vazia" ? "" : data.nome_completo;
        document.getElementById('blocoMorador').value = data.torre_id;
        document.getElementById('aptoMorador').value = data.unidade;
        document.getElementById('vinculoMorador').value = data.tipo_vinculo;
        
        if (data.whatsapp) {
            document.getElementById('whatsappMorador').value = data.whatsapp.substring(2);
        }

        editandoId = id;
        const btn = document.querySelector('.btn-login-main');
        if (btn) btn.innerText = "Atualizar Cadastro";
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
        alert("Erro ao buscar dados para edição: " + err.message);
    }
}

async function excluirMorador(id) {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;
    try {
        const { error } = await _supabase.from('moradores').delete().eq('id', id);
        if (error) throw error;
        carregarMoradores();
    } catch (err) {
        alert("Erro ao excluir: " + err.message);
    }
}

// --- 🏢 FUNÇÕES DO PAINEL ROOT ---
async function carregarDadosRoot() {
    const listaPendentes = document.getElementById('listaPendentes');
    const corpoTabela = document.getElementById('corpoTabelaAtivos');

    const { data: pendentes } = await _supabase
        .from('condominios')
        .select('*')
        .eq('status_ativo', false);

    if (pendentes && listaPendentes) {
        listaPendentes.innerHTML = pendentes.map(p => `
            <div class="item-pendente">
                <span><strong>${p.nome}</strong></span>
                <button onclick="ativarCondominio('${p.id}')" class="btn-aprovar">Ativar</button>
            </div>
        `).join('') || '<p>Nenhuma solicitação pendente.</p>';
    }

    const { data: ativos } = await _supabase
        .from('condominios')
        .select('*')
        .eq('status_ativo', true);

    if (ativos && corpoTabela) {
        corpoTabela.innerHTML = ativos.map(a => `
            <tr>
                <td>${a.nome}</td>
                <td><span class="badge">${a.plano}</span></td>
                <td>Ativo</td>
                <td><button onclick="console.log('Gerenciar ID: ${a.id}')">Gerenciar</button></td>
            </tr>
        `).join('') || '<tr><td colspan="4">Nenhum condomínio ativo.</td></tr>';
    }
}

// TESTE DE CONEXÃO
async function testarConexao() {
    const { data, error } = await _supabase.from('usuarios_root').select('count');
    if (error) {
        console.log("Erro de Conexão: " + error.message);
    } else {
        console.log("Conexão Supabase OK!");
    }
}
testarConexao();

// --- 🚀 NOVA FUNÇÃO: ENVIAR WHATSAPP ---
// Variáveis temporárias para o modal
let dadosEnvioTemp = {};

function enviarZap(numero, nome) {
    if (!numero || numero.length < 8) {
        alert("⚠️ Morador sem WhatsApp válido!");
        return;
    }

    // Armazena os dados temporariamente
    dadosEnvioTemp = { numero: numero.replace(/\D/g, ""), nome: nome };

    // Preenche o modal
    document.getElementById('modalNome').innerText = nome;
    document.getElementById('modalNomeMsg').innerText = nome;
    document.getElementById('modalZap').innerText = "+" + numero;

    // Exibe o modal
    const modal = document.getElementById('modalWhatsapp');
    modal.style.display = 'flex';
    document.getElementById('overlay').classList.add('active'); // Usa o seu overlay existente
}

function fecharModalZap() {
    document.getElementById('modalWhatsapp').style.display = 'none';
    document.getElementById('overlay').classList.remove('active');
}

function confirmarEnvioZap() {
    const linkAcesso = "https://paulorodias-dot.github.io/cupons_magalu/"; 
    const textoMensagem = `Olá ${dadosEnvioTemp.nome}, seu cadastro no Chegou! está pronto. Acesse seu painel pelo link: ${linkAcesso};
    
    ---------------------------------------
    _Esta é uma mensagem automática enviada pelo sistema Chegou!_ 🏢`;
    // USANDO O LINK DE WEB DIRETAMENTE:
    // Isso evita que o navegador pergunte "Deseja abrir o WhatsApp Desktop?"
    const url = `https://web.whatsapp.com/send?phone=${dadosEnvioTemp.numero}&text=${encodeURIComponent(textoMensagem)}`;
    
    window.open(url, '_blank');
    
    fecharModalZap();
}
