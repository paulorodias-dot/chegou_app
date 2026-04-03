// js/admin.js

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Busca Perfil e Condomínio
    const { data: perfil } = await supabaseClient
        .from('perfis')
        .select('nome_completo, condominios(nome_fantasia)')
        .eq('user_id', user.id)
        .single();

    if (perfil) {
        document.getElementById('nome-usuario').textContent = perfil.nome_completo.split(' ')[0];
        if (perfil.condominios) {
            document.getElementById('nome-condominio').textContent = perfil.condominios.nome_fantasia;
        }
    }

    // Inicia os componentes da barra de status
    atualizarDataHora();
    setInterval(atualizarDataHora, 1000); // Atualiza o relógio a cada segundo
    buscarClima();
});

function atualizarDataHora() {
    const agora = new Date();
    
    // Formata a data: 02 De Abril De 2026
    const dataFormatada = agora.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).replace(/de/g, 'De');

    // Formata a hora: 07:09:54
    const horaFormatada = agora.toLocaleTimeString('pt-BR');

    document.getElementById('datetime').innerHTML = `${dataFormatada} Às ${horaFormatada}`;
}

async function buscarClima() {
    const weatherContainer = document.getElementById('weather-container');
    
    try {
        // Coordenadas de São Paulo
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=-23.55&longitude=-46.63&current_weather=true`);
        const data = await response.json();
        
        if (data.current_weather) {
            const temp = Math.round(data.current_weather.temperature);
            
            // Monta o HTML exatamente como na imagem: | Ícone 20°C São Paulo, SP
            weatherContainer.innerHTML = `
                <span style="margin: 0 15px; color: #cbd5e1;">|</span>
                <i class="fa-solid fa-cloud-sun" style="color: #64748b;"></i>
                <strong style="color: #2563eb; margin-left: 8px;">${temp}°C</strong>
                <span style="color: #94a3b8; margin-left: 5px; font-size: 0.9rem;">São Paulo, SP</span>
            `;
        }
    } catch (err) {
        console.error("Erro clima:", err);
    }
}