// js/auth.js

// 1. CONFIGURAÇÃO MESTRE
const SUPABASE_URL = 'https://hhwzavlhzffhmfinjncq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhod3phdmxoemZmaG1maW5qbmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODc2MzEsImV4cCI6MjA5MDE2MzYzMX0.d0MegN1COnZGgpzgO_MB_DZJJvTvDVfJ6n1quZkphoI';

// Mudança vital: Usamos um nome de variável que não conflita com a biblioteca global
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. LOGICA DE LOGIN (E-mail ou CPF)
const formLogin = document.getElementById('form-login');

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault(); // Impede o refresh da página
        
        const loginInput = document.getElementById('user-id').value.trim();
        const password = document.getElementById('login-password').value;
        
        console.log("Iniciando tentativa de login...");

        // Estratégia de CPF ou E-mail
        let email = loginInput;
        if (!loginInput.includes('@')) {
            const cpfLimpo = loginInput.replace(/\D/g, '');
            email = `${cpfLimpo}@chegou.com.br`; 
        }

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            console.log("Login Auth sucesso! Buscando perfil...");
            direcionarUsuario(data.user.id);

        } catch (error) {
            alert("Erro ao acessar: Verifique suas credenciais.");
            console.error("Erro de Autenticação:", error.message);
        }
    });
}

// 3. FUNÇÃO DE REDIRECIONAMENTO INTELIGENTE
async function direcionarUsuario(userId) {
    try {
        // Buscamos 'role' e 'condominio_id' conforme criamos no SQL
        const { data: perfil, error } = await supabaseClient
            .from('perfis')
            .select('role, condominio_id')
            .eq('user_id', userId) // Usamos user_id para vincular ao Auth
            .single();

        if (error || !perfil) {
            console.error("Erro ao buscar perfil:", error);
            alert("Erro ao identificar perfil. Contate o administrador.");
            return;
        }

        // Salva dados importantes no navegador
        localStorage.setItem('chegou_condo_id', perfil.condominio_id);
        localStorage.setItem('chegou_user_role', perfil.role);

        // Manda para o painel correto baseado no 'role' do banco
        // Note que mudei 'admin' para 'master' para bater com o seu SQL
        const destinos = {
            'master': 'master.html',
            'sindico': 'sindico.html',
            'porteiro': 'portaria.html',
            'morador': 'morador.html'
        };

        const destinoFinal = destinos[perfil.role] || 'index.html';
        console.log("Redirecionando para:", destinoFinal);
        window.location.href = destinoFinal;

    } catch (err) {
        console.error("Erro crítico no redirecionamento:", err);
    }
}

// 4. LOGICA DE RECUPERAÇÃO DE SENHA
async function recuperarSenha() {
    const email = prompt("Digite seu e-mail cadastrado:");
    if (!email) return;

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/redefinir-senha.html',
    });

    if (error) {
        alert("Erro ao solicitar recuperação: " + error.message);
    } else {
        alert("Link enviado! Verifique sua caixa de entrada.");
    }
}