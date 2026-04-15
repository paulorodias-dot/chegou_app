/* ============================================================
   js/notifications.js - MOTOR DE TOASTS PERSONALIZADOS
   ============================================================ */

function showToast(message, type = 'info') {
    // 1. Cria ou recupera o container principal
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // 2. Mapeamento de ícones (FontAwesome)
    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    // 3. Cria a estrutura do Toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${icons[type] || icons.info}"></i>
        <div class="toast-content">
            <span class="toast-text">${message}</span>
        </div>
    `;

    container.appendChild(toast);

    // 4. Trigger da animação de entrada
    setTimeout(() => toast.classList.add('show'), 100);

    // 5. Auto-destruição após 4 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300); // Espera o CSS terminar a transição
    }, 4000);
}