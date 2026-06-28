// ==========================================
// FMSNO.ru - Общий интерфейс (UI)
// ==========================================
// Общие UI-функции: sticky header, мобильное меню.
// Обработчики форм вынесены в js/feedback.js (с сохранением в админку).

document.addEventListener('DOMContentLoaded', () => {
    initStickyHeader();
    initMobileMenu();
});

function initStickyHeader() {
    const header = document.querySelector('header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

function initMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('main-menu');
    const overlay = document.getElementById('menu-overlay');
    if (!menuToggle || !menu) return;

    const toggleMenu = () => {
        const isActive = menu.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
        document.body.style.overflow = isActive ? 'hidden' : 'auto';
        menuToggle.innerHTML = isActive ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    };

    menuToggle.addEventListener('click', toggleMenu);
    if (overlay) {
        overlay.addEventListener('click', () => {
            if (menu.classList.contains('active')) toggleMenu();
        });
    }
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (menu.classList.contains('active')) toggleMenu();
        });
    });
}
