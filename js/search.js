/* js/search.js */

let cachedIndex = null;

function getSearchIndex() {
    if (cachedIndex !== null) return cachedIndex;

    // Selecionamos todos os links da sidebar e do container de menu
    const links = document.querySelectorAll('.menu-container a, .sidebar a');
    let index = [];
    
    links.forEach(link => {
        let clone = link.cloneNode(true);
        
        // Remove os ícones (span) do clone para pegar apenas o texto
        let icons = clone.querySelectorAll('.material-symbols-outlined');
        icons.forEach(icon => icon.remove());
        
        // Limpeza de texto: remove espaços extras
        let title = clone.innerText.replace(/\s+/g, ' ').trim();
        
        // REMOVEMOS A TRAVA (&& !link.classList.contains('logout-btn'))
        // Agora, se tiver href e título, ele entra na busca!
        if(link.href && title && title.length > 0) {
            index.push({ title: title, url: link.href });
        }
    });
    
    cachedIndex = index;
    return index;
}

function filterSearch(isMobile = false) {
    const inputElement = isMobile ? document.getElementById('search-input-mobile') : document.getElementById('search-input');
    const resultsDiv = isMobile ? document.getElementById('search-results-mobile') : document.getElementById('search-results');
    
    const query = inputElement.value.toLowerCase().trim();
    const index = getSearchIndex();
    
    resultsDiv.innerHTML = '';
    
    if(query.length < 1) { 
        resultsDiv.style.display = 'none'; 
        return; 
    }

    // Busca inteligente: verifica se o título contém o termo digitado
    const filtered = index.filter(item => item.title.toLowerCase().includes(query));
    
    if(filtered.length > 0) {
        resultsDiv.style.display = 'block';
        filtered.forEach(item => {
            resultsDiv.innerHTML += `
                <a href="${item.url}" class="search-item">
                    <span class="material-symbols-outlined" style="font-size: 16px; margin-right: 8px;">chevron_right</span>
                    ${item.title}
                </a>
            `;
        });
    } else {
        resultsDiv.style.display = 'none';
    }
}