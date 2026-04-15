/* ============================================================
   js/auth.js - MOTOR DE AUTENTICAÇÃO COM ROLES E CONDOMÍNIOS
   ============================================================ */
const ssql = window.ssql;

const formLogin = document.getElementById('form-login');
const btnEntrar = document.getElementById('btn-entrar');
const btnText = document.getElementById('btn-text');
const btnLoader = document.getElementById('btn-loader');
const inputUsuario = document.getElementById('user-id');
const inputSenha = document.getElementById('login-password');

// --- FUNÇÃO DE LOGIN PRINCIPAL ---
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        btnEntrar.disabled = true;

        const loginInput = inputUsuario.value.trim();
        const password = inputSenha.value;
        
        let emailFinal = loginInput;
        if (!loginInput.includes('@')) {
            const cpfLimpo = loginInput.replace(/\D/g, '');
            emailFinal = `${cpfLimpo}@chegou.com.br`; 
        }

        try {
            const { data, error } = await ssql.auth.signInWithPassword({
                email: emailFinal,
                password: password,
            });

            if (error) throw error;
            
            showToast(`Autenticado com sucesso!`, "success");
            direcionarUsuario(data.user.id);

        } catch (error) {
            showToast("Acesso negado. Verifique suas credenciais.", "error");
            btnText.style.display = 'inline-block';
            btnLoader.style.display = 'none';
            btnEntrar.disabled = false;
        }
    });
}

// --- REDIRECIONAMENTO POR PERFIL E CONDOMÍNIO ---
async function direcionarUsuario(userId) {
    try {
        // Busca agora inclui o condominio_id para segregar os dados
        const { data: perfil, error: errorPerfil } = await ssql
            .from('perfis')
            .select('role, nome_completo, user_id, condominio_id') 
            .eq('user_id', userId)
            .single();

        if (errorPerfil || !perfil) {
            console.error("Erro na busca do perfil:", errorPerfil);
            showToast("Perfil não configurado no banco.", "error");
            return;
        }

        // SALVANDO TODAS AS VARIÁVEIS NECESSÁRIAS
        localStorage.setItem('chegou_user_role', perfil.role);
        localStorage.setItem('chegou_user_fullname', perfil.nome_completo);
        localStorage.setItem('chegou_user_condo', perfil.condominio_id);

        // Lógica de Destino
        const destinos = {
            'master': 'master.html',
            'sindico': 'admin.html',
            'porteiro': 'portaria.html',
            'morador': 'morador.html'
        };

        // Redireciona para o destino baseado no cargo
        window.location.href = destinos[perfil.role] || 'index.html';

    } catch (err) {
        console.error("Erro ao redirecionar:", err);
        showToast("Erro ao processar seu acesso.", "error");
        
        // Reseta o botão caso dê erro
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
        btnEntrar.disabled = false;
    }
}