/* global.js - Autenticação, Permissões, Navegação e Inicialização */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Configurações Iniciais
    aplicarPermissoes();
    marcarMenuAtivo();
    
    // 2. Carrega Dados do Dashboard e Usuário
    carregarDadosUsuario();
    
    // 3. Funções Específicas se elementos existirem
    if (document.getElementById('current-date')) updateDashboardInfo();
    if (document.getElementById('local-temp')) carregarTemperatura();
});

/**
 * Busca dados do perfil e trata saudação
 */
async function carregarDadosUsuario() {
    const { data: { user } } = await ssql.auth.getUser();
    
    if (user) {
        const { data, error } = await ssql
            .from('perfis') 
            .select('nome_completo')
            .eq('user_id', user.id)
            .single();

        if (error) {
            console.error("Erro ao buscar perfil:", error);
            return;
        }

        if (data && data.nome_completo) {
            const hora = new Date().getHours();
            let saudacao = (hora >= 5 && hora < 12) ? "Bom dia" : 
                           (hora >= 12 && hora < 18) ? "Boa tarde" : "Boa noite";

            const welcomeMsg = document.getElementById('welcome-msg');
            if (welcomeMsg) welcomeMsg.innerText = `${saudacao}, ${data.nome_completo}!`;

            const profileName = document.getElementById('user-name-display');
            if (profileName) profileName.innerText = data.nome_completo;
        }
    }
}

/**
 * Reconhece o Role e filtra visibilidade
 */
function aplicarPermissoes() {
    const role = localStorage.getItem('chegou_user_role');
    const elementosMaster = document.querySelectorAll('.master-only');
    
    if (role !== 'master') {
        elementosMaster.forEach(el => el.style.display = 'none');
    }
}

/**
 * Marca apenas o link correspondente à página atual
 */
function marcarMenuAtivo() {
    const path = window.location.pathname.split("/").pop();
    const allLinks = document.querySelectorAll('.sidebar a');
    
    allLinks.forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('active-menu');
        } else {
            link.classList.remove('active-menu');
        }
    });
}

/**
 * Apenas alterna a exibição do submenu ao clicar
 */
function toggleSubmenu(elemento) {
    const submenu = elemento.parentElement.querySelector('.submenu');
    if (submenu) {
        submenu.classList.toggle('active');
    }
}

/**
 * Data do Dashboard: "15 de Abril de 2026"
 */
function updateDashboardInfo() {
    const dataElement = document.getElementById('current-date');
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const dataFormatada = new Date().toLocaleDateString('pt-BR', options);
    
    // Capitaliza a primeira letra do mês
    dataElement.innerText = dataFormatada.replace(
        /(^|\s)\S/, (match) => match.toUpperCase()
    );
}

/**
 * Busca temperatura e ícone de clima via OpenWeather
 */
async function carregarTemperatura() {
    const tempValueElement = document.getElementById('temp-value');
    const weatherIconElement = document.getElementById('weather-icon'); // Adicione este ID no seu HTML
    
    if (!tempValueElement) return;

    try {
        const city = "São Paulo";
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${CONFIG.WEATHER_KEY}&units=metric&lang=pt_br`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.main) {
            const temp = Math.round(data.main.temp);
            tempValueElement.innerText = `${temp}°C`;

            // Mapeamento simples de ícones do OpenWeather para Material Symbols
            if (weatherIconElement && data.weather[0]) {
                const iconCode = data.weather[0].icon;
                const iconMap = {
                    '01d': 'sunny', '01n': 'clear_night',
                    '02d': 'partly_cloudy_day', '02n': 'partly_cloudy_night',
                    '03d': 'cloud', '04d': 'cloud',
                    '09d': 'rainy', '10d': 'rainy', '11d': 'thunderstorm',
                    '13d': 'ac_unit', '50d': 'foggy'
                };
                weatherIconElement.innerText = iconMap[iconCode] || 'cloud';
            }
        }
    } catch (error) {
        tempValueElement.innerText = "--°C";
    }
}

/**
 * Logout Global
 */
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}