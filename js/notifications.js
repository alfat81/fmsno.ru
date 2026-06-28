// ==========================================
// FMSNO.ru - Уведомления (общий модуль)
// ==========================================
// Функция showNotification используется в js/app.js и js/events-manager.js
// Раньше была определена только inline в documents.html, что вызывала
// ReferenceError на остальных страницах и молча убивала обработчики.
// Теперь этот файл подключается ПЕРВЫМ на всех страницах.

const NOTIF_ICONS = {
    success: 'fa-check-circle',
    error:   'fa-exclamation-circle',
    info:    'fa-info-circle'
};

function showNotification(message, type = 'info') {
    const iconClass = NOTIF_ICONS[type] || NOTIF_ICONS.info;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.setAttribute('role', 'status');
    notification.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <span>${message}</span>
        <button type="button" class="close-notification" aria-label="Закрыть">&times;</button>
    `;

    document.body.appendChild(notification);

    // Плавное появление
    requestAnimationFrame(() => notification.classList.add('show'));

    // Автоудаление через 5 секунд
    const autoRemove = setTimeout(() => removeNotification(notification), 5000);

    // Закрытие по клику на крестик
    notification.querySelector('.close-notification').addEventListener('click', () => {
        clearTimeout(autoRemove);
        removeNotification(notification);
    });

    function removeNotification(el) {
        el.classList.remove('show');
        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 300);
    }
}

// Делаем доступной глобально
window.showNotification = showNotification;
