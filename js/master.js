function updateDateTime() {
    const now = new Date();
    const options = { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    };
    // Formata para: 01 de abril de 2026, 05:40:12
    document.getElementById('datetime').textContent = now.toLocaleDateString('pt-BR', options);
}

// Atualiza a cada segundo
setInterval(updateDateTime, 1000);
updateDateTime(); // Chama imediato ao carregar

// 1. Função do Relógio (Atualiza a cada segundo)
function updateInterface() {
    const now = new Date();
    const isMobile = window.innerWidth <= 768;

    // Configuração para PC (Completa)
    const optionsPC = { 
        day: '2-digit', month: 'long', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
    };

    // Configuração para CELULAR (Apenas Data)
    const optionsMobile = { 
        day: '2-digit', month: 'long', year: 'numeric'
    };

    const options = isMobile ? optionsMobile : optionsPC;
    
    let dataString = now.toLocaleDateString('pt-BR', options);
    
    // Deixa a primeira letra maiúscula
    const dataFormatada = dataString.charAt(0).toUpperCase() + dataString.slice(1);
    
    document.getElementById('datetime').textContent = dataFormatada;
}

// Mantenha apenas um intervalo para não sobrecarregar o navegador
setInterval(updateInterface, 1000);
updateInterface();

// 2. Função do Clima (Busca via API)
async function fetchWeather() {
    const weatherContainer = document.getElementById('weather-container');
    
    // Configurações OpenWeather para São Paulo (Latitude/Longitude fixas)
    const apiKey = 'ceec8d3ee1170bc10bc782b8c3fd6aa2';
    const lat = '-23.5505'; 
    const lon = '-46.6333';
    
    // URL formatada para Celsius (metric) e Português (pt_br)
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pt_br`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Verifica se a API retornou erro (ex: chave ainda não ativa)
        if (data.cod !== 200) {
            console.warn("Aguardando ativação da chave ou erro na API:", data.message);
            throw new Error(data.message);
        }

        // Mapeamento de ícones do OpenWeather para FontAwesome
        const mainWeather = data.weather[0].main.toLowerCase();
        let icone = 'fa-cloud-sun'; // Padrão
        
        if (mainWeather.includes('rain') || mainWeather.includes('drizzle')) {
            icone = 'fa-cloud-showers-heavy';
        } else if (mainWeather.includes('clear')) {
            icone = 'fa-sun';
        } else if (mainWeather.includes('cloud')) {
            icone = 'fa-cloud';
        }

        // Arredonda a temperatura para um número inteiro
        const tempReal = Math.round(data.main.temp);
        const tempFormatada = `${tempReal}°C`;

        // Salva no cache do navegador para emergências
        localStorage.setItem('ultima_temp', tempFormatada);

        weatherContainer.innerHTML = `
            <i class="fa-solid ${icone}"></i>
            <span class="clima-temp">${tempFormatada}</span>
            <span class="clima-cidade">${data.name}</span>
        `;

    } catch (error) {
        // Se a API falhar (ou a chave for muito nova), usa o que estiver guardado
        const ultimaTemp = localStorage.getItem('ultima_temp') || "--°C";
        weatherContainer.innerHTML = `
            <i class="fa-solid fa-cloud"></i>
            <span class="clima-temp">${ultimaTemp}</span>
        `;
    }
}

// Inicia a busca
fetchWeather();
// Atualiza o clima a cada 10 minutos (600.000 ms) para não gastar a conta
setInterval(fetchWeather, 600000);

// Iniciar funções
setInterval(updateInterface, 1000);
updateInterface();
fetchWeather(); // Busca o clima ao abrir a página