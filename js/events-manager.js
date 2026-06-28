// ==========================================
// FMSNO.ru - Менеджер данных (Соревнования и Новости) - Обновлено под 2026 год
// ==========================================

// ВНИМАНИЕ: это статичный сайт. Любая "админ-защита" на клиенте —
// это UX, а не безопасность. Пароль виден в исходниках.
// Для реальной защиты нужен бэкенд (см. Этап 5 в плане работ).
const _aL = btoa('admin');
const _aP = btoa('fmsno2025');

document.addEventListener('DOMContentLoaded', () => {
    initAdminPanel();
    // Только инициализируем начальные данные, если их ещё нет в localStorage.
    // РАНЬШЕ тут был localStorage.removeItem('competitions'/'news') на каждой
    // загрузке — это стирало любые правки админа при первом же переходе.
    seedInitialData();

    if (document.getElementById('upcoming-events')) loadUpcomingEvents();
    if (document.getElementById('competitions-container')) initCompetitionsPage();
    if (document.getElementById('news-container')) initNewsPage();
});

// --- АДМИН-ПАНЕЛЬ ---
function initAdminPanel() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loginFooter = document.getElementById('admin-login-footer');
    const closePanel = document.getElementById('admin-close-btn');
    const panel = document.getElementById('admin-bottom-panel');

    if (loginBtn) loginBtn.addEventListener('click', adminLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', adminLogout);

    const closeAdminPanel = () => {
        if (panel) panel.classList.remove('visible');
        document.body.style.overflow = 'auto';
    };

    if (loginFooter) loginFooter.addEventListener('click', () => {
        if (panel) panel.classList.add('visible');
        document.body.style.overflow = 'hidden';
    });

    if (closePanel) closePanel.addEventListener('click', closeAdminPanel);
    if (panel) panel.addEventListener('click', (e) => { if (e.target === panel) closeAdminPanel(); });

    // Подключаем внешнюю кнопку "Добавить соревнование" на странице competitions.html
    const addCompetitionBtn = document.getElementById('add-competition-btn');
    if (addCompetitionBtn) {
        addCompetitionBtn.addEventListener('click', () => {
            const p = document.getElementById('admin-bottom-panel');
            if (p) p.classList.remove('visible');
            document.body.style.overflow = 'auto';
            showAddForm();
        });
    }

    checkAdminAuth();
}

function adminLogin() {
    const login = document.getElementById('admin-login').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    const errorEl = document.getElementById('login-error');

    if (atob(_aL) === login && atob(_aP) === password) {
        localStorage.setItem('isAdminAuth', 'true');
        localStorage.setItem('adminAuthTimestamp', new Date().getTime().toString());
        checkAdminAuth();
        showNotification('Вы успешно вошли в систему!', 'success');
        document.getElementById('admin-login').value = '';
        document.getElementById('admin-password').value = '';
        if (errorEl) errorEl.classList.add('hidden');

        // Перерисовываем списки, чтобы появились админские кнопки (Ред./Удалить)
        if (document.getElementById('competitions-container')) loadCompetitions();
        if (document.getElementById('news-container')) loadNews();
        if (document.getElementById('documents-container') && typeof loadDocuments === 'function') loadDocuments();
    } else {
        if (errorEl) { errorEl.textContent = 'Неверный логин или пароль'; errorEl.classList.remove('hidden'); }
    }
}

function adminLogout() {
    localStorage.removeItem('isAdminAuth');
    localStorage.removeItem('adminAuthTimestamp');
    checkAdminAuth();
    const panel = document.getElementById('admin-bottom-panel');
    if (panel) panel.classList.remove('visible');
    document.body.style.overflow = 'auto';
    showNotification('Вы вышли из системы', 'info');

    // Перерисовываем списки, чтобы скрылись админские кнопки
    if (document.getElementById('competitions-container')) loadCompetitions();
    if (document.getElementById('news-container')) loadNews();
    if (document.getElementById('documents-container') && typeof loadDocuments === 'function') loadDocuments();
}

function checkAdminAuth() {
    const isAdmin = localStorage.getItem('isAdminAuth') === 'true';
    const timestamp = parseInt(localStorage.getItem('adminAuthTimestamp') || '0');
    const isValid = isAdmin && (Date.now() - timestamp) < 24 * 60 * 60 * 1000;

    document.querySelectorAll('.hidden-admin').forEach(el => el.classList.toggle('hidden', !isValid));

    const loginForm = document.getElementById('admin-login-form');
    const controlsPanel = document.getElementById('admin-controls-panel');

    if (loginForm && controlsPanel) {
        loginForm.classList.toggle('hidden', isValid);
        controlsPanel.classList.toggle('hidden', !isValid);
    }

    if (!isValid) { localStorage.removeItem('isAdminAuth'); localStorage.removeItem('adminAuthTimestamp'); }
    return isValid;
}

// --- ГЛАВНАЯ (Ближайшие 3 события) ---
function loadUpcomingEvents() {
    const container = document.getElementById('upcoming-events');
    if (!container) return;
    const competitions = getCompetitions();
    const today = new Date(new Date().toDateString());
    let upcoming = competitions.filter(c => new Date(c.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3);
    if (upcoming.length === 0) upcoming = competitions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

    container.innerHTML = '';
    upcoming.forEach(comp => {
        const d = new Date(comp.date);
        const card = document.createElement('a');
        card.href = 'competitions.html';
        card.className = 'event-card';
        card.innerHTML = `
            <div class="event-date"><span class="day">${d.getDate()}</span><span class="month">${d.toLocaleString('ru-RU', { month: 'long' }).slice(0, 3)}</span></div>
            <div class="event-content"><h3>${comp.title}</h3><p class="event-location"><i class="fas fa-map-marker-alt"></i> ${comp.location}</p><p class="event-time"><i class="far fa-clock"></i> ${comp.time}</p></div>
        `;
        container.appendChild(card);
    });
}

// --- СОРЕВНОВАНИЯ ---
function initCompetitionsPage() {
    loadCompetitions();
    const form = document.getElementById('competition-form');
    if (form) form.addEventListener('submit', saveCompetition);
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', hideForm);
    const refreshBtn = document.getElementById('refresh-competitions-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadCompetitions);
    const addBtn = document.getElementById('add-comp-btn');
    if (addBtn) addBtn.addEventListener('click', () => { const panel = document.getElementById('admin-bottom-panel'); if (panel) panel.classList.remove('visible'); document.body.style.overflow = 'auto'; showAddForm(); });
}

function loadCompetitions() {
    const container = document.getElementById('competitions-container');
    const emptyState = document.getElementById('empty-state');
    if (!container) return;
    const competitions = getCompetitions().sort((a, b) => new Date(a.date) - new Date(b.date));
    const isAdmin = checkAdminAuth();
    if (competitions.length === 0) { container.innerHTML = ''; if (emptyState) emptyState.classList.remove('hidden'); return; }
    if (emptyState) emptyState.classList.add('hidden');
    container.innerHTML = '';
    competitions.forEach(comp => {
        const d = new Date(comp.date);
        const card = document.createElement('div');
        card.className = 'competition-card'; card.dataset.id = comp.id;
        const actionsHTML = isAdmin ? `<button class="btn edit-btn" data-id="${comp.id}"><i class="fas fa-edit"></i> Ред.</button><button class="btn delete-btn" data-id="${comp.id}"><i class="fas fa-trash"></i> Удалить</button>` : '';
        card.innerHTML = `
            <div class="competition-header"><div class="competition-date"><span class="day">${d.getDate()}</span><span class="month-year">${d.toLocaleString('ru-RU', { month: 'long' })} ${d.getFullYear()}</span></div><div class="competition-label ${comp.discipline}">${getDisciplineName(comp.discipline)}</div></div>
            <h3 class="competition-title">${comp.title}</h3>
            <div class="competition-details"><p><i class="fas fa-map-marker-alt"></i> ${comp.location}</p><p><i class="far fa-clock"></i> ${comp.time}</p></div>
            <div class="competition-description">${comp.description || 'Описание скоро появится'}</div>
            <div class="competition-actions">${actionsHTML}<a href="https://vk.com/fmsno" target="_blank" class="btn more-btn"><i class="fab fa-vk"></i> Подробнее в VK</a></div>
        `;
        container.appendChild(card);
    });
    container.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => editCompetition(btn.dataset.id)));
    container.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => deleteCompetition(btn.dataset.id)));
}

function showAddForm() { document.getElementById('form-title').textContent = 'Добавить новое соревнование'; document.getElementById('competition-form').reset(); document.getElementById('competition-id').value = ''; document.getElementById('competition-form-container').classList.remove('hidden'); window.scrollTo({ top: document.getElementById('competition-form-container').offsetTop - 100, behavior: 'smooth' }); }
function hideForm() { document.getElementById('competition-form-container').classList.add('hidden'); }
function editCompetition(id) { const comp = getCompetitions().find(c => c.id === id); if (!comp) return; document.getElementById('form-title').textContent = 'Редактировать соревнование'; document.getElementById('competition-id').value = comp.id; document.getElementById('competition-title').value = comp.title; document.getElementById('competition-date').value = comp.date; document.getElementById('competition-time').value = comp.time; document.getElementById('competition-location').value = comp.location; document.getElementById('competition-discipline').value = comp.discipline; document.getElementById('competition-description').value = comp.description || ''; document.getElementById('competition-form-container').classList.remove('hidden'); window.scrollTo({ top: document.getElementById('competition-form-container').offsetTop - 100, behavior: 'smooth' }); }

function saveCompetition(e) {
    e.preventDefault(); if (!checkAdminAuth()) return showNotification('Нет прав доступа', 'error');
    let competitions = getCompetitions(); const id = document.getElementById('competition-id').value;
    const newComp = { id: id || `comp_${Date.now()}`, title: document.getElementById('competition-title').value, date: document.getElementById('competition-date').value, time: document.getElementById('competition-time').value, location: document.getElementById('competition-location').value, discipline: document.getElementById('competition-discipline').value, description: document.getElementById('competition-description').value, updatedAt: new Date().toISOString() };
    if (id) { const index = competitions.findIndex(c => c.id === id); if (index !== -1) competitions[index] = newComp; } else { newComp.createdAt = newComp.updatedAt; competitions.push(newComp); }
    localStorage.setItem('competitions', JSON.stringify(competitions)); loadCompetitions(); hideForm(); showNotification(id ? 'Соревнование обновлено!' : 'Соревнование добавлено!', 'success');

    // Авто-постинг в Telegram (только для новых соревнований)
    if (!id && typeof window.telegramBot === 'object' && window.telegramBot.sendNewCompetition) {
        window.telegramBot.sendNewCompetition(newComp).catch(err => console.warn('Telegram:', err));
    }
}

function deleteCompetition(id) { if (!checkAdminAuth()) return showNotification('Нет прав доступа', 'error'); if (!confirm('Удалить это соревнование?')) return; localStorage.setItem('competitions', JSON.stringify(getCompetitions().filter(c => c.id !== id))); loadCompetitions(); showNotification('Соревнование удалено', 'success'); }

function getCompetitions() { return JSON.parse(localStorage.getItem('competitions')) || []; }
function getDisciplineName(disc) { const names = { motocross: 'Мотокросс', supermoto: 'Супермото', motodzhimkhana: 'Мотоджимхана', enduro: 'Эндуро', sxcup: 'SX Cup' }; return names[disc] || 'Другое'; }

// --- НОВОСТИ ---
function initNewsPage() {
    loadNews();
    const addBtn = document.getElementById('add-news-btn');
    const addBtnPanel = document.getElementById('add-news-btn-panel');
    const cancelBtn = document.getElementById('cancel-news-btn');
    const form = document.getElementById('news-form');
    if (addBtn) addBtn.addEventListener('click', showAddNewsForm);
    if (addBtnPanel) addBtnPanel.addEventListener('click', showAddNewsForm);
    if (cancelBtn) cancelBtn.addEventListener('click', hideNewsForm);
    if (form) form.addEventListener('submit', saveNews);
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterNews(this.dataset.filter);
        });
    });
}

function loadNews() {
    const container = document.getElementById('news-container');
    if (!container) return;
    let news = JSON.parse(localStorage.getItem('news')) || [];
    if (news.length === 0) { container.innerHTML = `<div class="empty-state"><div class="empty-content"><i class="fas fa-newspaper empty-icon"></i><h3>Нет новостей</h3><p>Новостей пока не добавлено. Проверьте позже.</p></div></div>`; return; }
    news.sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = '';
    const isAdmin = checkAdminAuth();
    news.forEach(item => {
        const newsItem = document.createElement('div');
        newsItem.className = `news-item ${item.type === 'vk' ? 'news-vk' : 'news-manual'}`;
        const formattedDate = new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        const previewText = item.content.length > 150 ? item.content.substring(0, 150) + '...' : item.content;
        let imageHTML = item.imageUrl ? `<div class="news-attachment"><img src="${item.imageUrl}" alt="Фото"></div>` : '';
        let adminActionsHTML = isAdmin ? `<div class="admin-news-actions"><button class="btn edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button><button class="btn delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button></div>` : '';
        newsItem.innerHTML = `
            <div class="news-header"><div class="news-date">${formattedDate}</div><div class="news-source">${item.type === 'vk' ? '<i class="fab fa-vk"></i> ВКонтакте' : '<i class="fas fa-user-edit"></i> Сайт'}</div></div>
            <h3 class="news-title">${item.title}</h3>
            <div class="news-content">${previewText}</div>
            ${imageHTML}
            <a href="#" class="news-link read-more" data-id="${item.id}"><i class="fas fa-arrow-right"></i> Читать полностью</a>
            ${adminActionsHTML}
        `;
        container.appendChild(newsItem);
    });
    container.querySelectorAll('.read-more').forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); showFullNews(link.dataset.id); }));
    container.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => editNews(btn.dataset.id)));
    container.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => deleteNews(btn.dataset.id)));
}

function showFullNews(id) {
    const item = JSON.parse(localStorage.getItem('news')).find(n => n.id === id);
    if (!item) return;
    const formattedDate = new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    let imageHTML = item.imageUrl ? `<div class="news-full-image"><img src="${item.imageUrl}" alt="Фото"></div>` : '';

    const overlayHTML = `
    <div class="news-full-overlay active">
        <div class="news-full-content">
            <button class="close-full-news">&times;</button>
            <div class="news-full-header">
                <h2>${item.title}</h2>
                <div class="news-full-meta">
                    <span><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                    <span>${item.type === 'vk' ? '<i class="fab fa-vk"></i> ВКонтакте' : '<i class="fas fa-user-edit"></i> Сайт'}</span>
                </div>
            </div>
            ${imageHTML}
            <div class="news-full-text">${item.content}</div>
            <div class="news-full-footer">
                <button class="btn btn-secondary close-full-news-btn"><i class="fas fa-times"></i> Закрыть</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', overlayHTML);
    const closeOverlay = () => {
        const el = document.querySelector('.news-full-overlay');
        if (el) el.remove();
    };
    document.querySelector('.close-full-news').addEventListener('click', closeOverlay);
    document.querySelector('.close-full-news-btn').addEventListener('click', closeOverlay);
    document.querySelector('.news-full-overlay').addEventListener('click', (e) => { if (e.target.classList.contains('news-full-overlay')) closeOverlay(); });
}

function showAddNewsForm() {
    const panel = document.getElementById('admin-bottom-panel');
    if (panel) panel.classList.remove('visible');
    document.body.style.overflow = 'auto';
    document.getElementById('form-title').textContent = 'Добавить новую новость';
    document.getElementById('news-id').value = '';
    document.getElementById('news-form').reset();
    document.getElementById('news-form-container').classList.remove('hidden');
    window.scrollTo({ top: document.getElementById('news-form-container').offsetTop - 100, behavior: 'smooth' });
}

function hideNewsForm() { document.getElementById('news-form-container').classList.add('hidden'); }

function saveNews(e) {
    e.preventDefault();
    if (!checkAdminAuth()) return showNotification('Нет прав доступа', 'error');
    const fileInput = document.getElementById('news-image');
    if (fileInput.files[0]) {
        if (fileInput.files[0].size > 5 * 1024 * 1024) return showNotification('Файл слишком большой (макс 5 МБ)', 'error');
        const reader = new FileReader();
        reader.onload = (ev) => saveNewsData(ev.target.result);
        reader.readAsDataURL(fileInput);
    } else {
        saveNewsData(null);
    }
}

function saveNewsData(imageUrl) {
    let news = JSON.parse(localStorage.getItem('news')) || [];
    const id = document.getElementById('news-id').value;
    const now = new Date().toISOString();
    const newNews = { id: id || `news_${Date.now()}`, type: 'manual', title: document.getElementById('news-title').value, content: document.getElementById('news-content').value, date: now, imageUrl: imageUrl, createdAt: id ? null : now, updatedAt: now };
    if (id) { const index = news.findIndex(n => n.id === id); if (index !== -1) news[index] = newNews; }
    else { news.unshift(newNews); }
    localStorage.setItem('news', JSON.stringify(news));
    loadNews();
    hideNewsForm();
    showNotification(id ? 'Новость обновлена!' : 'Новость добавлена!', 'success');

    // Авто-постинг в Telegram (только для новых новостей)
    if (!id && typeof window.telegramBot === 'object' && window.telegramBot.sendNewNews) {
        window.telegramBot.sendNewNews(newNews).catch(err => console.warn('Telegram:', err));
    }
}

function editNews(id) {
    const item = JSON.parse(localStorage.getItem('news')).find(n => n.id === id);
    if (!item) return;
    document.getElementById('form-title').textContent = 'Редактировать новость';
    document.getElementById('news-id').value = item.id;
    document.getElementById('news-title').value = item.title;
    document.getElementById('news-content').value = item.content;
    document.getElementById('news-form-container').classList.remove('hidden');
    window.scrollTo({ top: document.getElementById('news-form-container').offsetTop - 100, behavior: 'smooth' });
}

function deleteNews(id) {
    if (!checkAdminAuth()) return showNotification('Нет прав доступа', 'error');
    if (!confirm('Удалить эту новость?')) return;
    localStorage.setItem('news', JSON.stringify(JSON.parse(localStorage.getItem('news')).filter(n => n.id !== id)));
    loadNews();
    showNotification('Новость удалена', 'success');
}

function filterNews(category) {
    document.querySelectorAll('.news-item').forEach(item => {
        if (category === 'all' || (category === 'vk' && item.classList.contains('news-vk')) || (category === 'manual' && item.classList.contains('news-manual'))) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// --- НАЧАЛЬНЫЕ ДАННЫЕ 2026 ГОДА ---
function seedInitialData() {
    if (!localStorage.getItem('competitions')) {
        localStorage.setItem('competitions', JSON.stringify([
            { id: 'comp_2026_01', title: 'Областное соревнование по мотоджимхане', date: '2026-01-12', time: '10:00', location: 'г. Нижний Новгород, Автодром "Кстово"', discipline: 'motodzhimkhana', description: 'Открытое соревнование по фигурному вождению мотоциклов на ровной площадке.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_02', title: 'Зимний чемпионат по мотокроссу', date: '2026-01-25', time: '11:00', location: 'г. Бор, трасса "Борская горка"', discipline: 'motocross', description: 'Открытый зимний этап чемпионата области по мотокроссу на легендарной трассе.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_03', title: 'Открытый кубок по мотокроссу', date: '2026-02-15', time: '10:00', location: 'г. Бор, трасса "Борская горка"', discipline: 'motocross', description: 'Открытый кубок по мотокроссу для всех желающих.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_04', title: 'Открытый кубок по мотокроссу', date: '2026-03-01', time: '10:00', location: 'г. Бор, трасса "Борская горка"', discipline: 'motocross', description: 'Второй открытый кубок начала сезона по мотокроссу.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_05', title: 'Открытый кубок по мотоджимхане', date: '2026-03-22', time: '11:00', location: 'г. Нижний Новгород, Автодром "Кстово"', discipline: 'motodzhimkhana', description: 'Весенний кубок по мотоджимхане на площадке в Кстово.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_06', title: 'Чемпионат по мотокроссу (1 этап)', date: '2026-04-05', time: '09:00', location: 'г. Бор, трасса "Борская горка"', discipline: 'motocross', description: 'Первый этап Чемпионата Нижегородской области по мотокроссу.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_07', title: 'Чемпионат по мотокроссу (2 этап)', date: '2026-04-19', time: '10:00', location: 'г. Бор, трасса "Борская горка"', discipline: 'motocross', description: 'Второй этап Чемпионата Нижегородской области.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_08', title: 'Чемпионат по мотокроссу (3 этап)', date: '2026-05-10', time: '10:00', location: 'г. Бор, трасса "Борская горка"', discipline: 'motocross', description: 'Третий этап Чемпионата Нижегородской области по мотокроссу.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_09', title: 'Чемпионат по мотокроссу (4 этап / Финал)', date: '2026-05-24', time: '10:00', location: 'г. Бор, трасса "Борская горка"', discipline: 'motocross', description: 'Заключительный, четвёртый этап и финал Чемпионата Нижегородской области по мотокроссу.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_10', title: 'Открытый кубок по эндуро', date: '2026-06-07', time: '09:00', location: 'г. Дзержинск', discipline: 'enduro', description: 'Летний открытый кубок по эндуро в Дзержинске.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_11', title: 'Чемпионат по мотоджимхане', date: '2026-06-21', time: '11:00', location: 'г. Нижний Новгород, Автодром "Кстово"', discipline: 'motodzhimkhana', description: 'Летний чемпионат Нижегородской области по мотоджимхане.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_12', title: 'KTM SX Cup 2026', date: '2026-07-05', time: '09:00', location: 'г. Дзержинск', discipline: 'sxcup', description: 'Ежегодные соревнования на мотоциклах KTM.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_13', title: 'Чемпионат по эндуро (Финал)', date: '2026-07-19', time: '09:00', location: 'г. Дзержинск', discipline: 'enduro', description: 'Заключительный этап и финал Чемпионата Нижегородской области по эндуро.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_14', title: 'Чемпионат по мотокроссу (1 этап)', date: '2026-08-16', time: '10:00', location: 'г. Бор, трасса "Борская горка"', discipline: 'motocross', description: 'Осенний этап Чемпионата Нижегородской области по мотокроссу.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_15', title: 'Чемпионат по мотокроссу (2 этап)', date: '2026-09-06', time: '10:00', location: 'г. Бор, трасса "Борская горка"', discipline: 'motocross', description: 'Второй осенний этап Чемпионата.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_16', title: 'Чемпионат по мотокроссу (3 этап / Финал)', date: '2026-09-20', time: '10:00', location: 'г. Бор, трасса "Борская горка"', discipline: 'motocross', description: 'Заключительный этап осеннего Чемпионата и подведение итогов.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_17', title: 'Осенний кубок по мотоджимхане', date: '2026-10-04', time: '11:00', location: 'г. Нижний Новгород, Автодром "Кстово"', discipline: 'motodzhimkhana', description: 'Осенний кубок по мотоджимхане завершает спортивный сезон на ровной площадке.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_18', title: 'Первенство области по мотокроссу', date: '2026-10-25', time: '10:00', location: 'г. Бор, трасса "Борская горка"', discipline: 'motocross', description: 'Закрытие сезона: Первенство Нижегородской области по мотокроссу для молодых спортсменов.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_19', title: 'Осенний кубок по эндуро', date: '2026-11-15', time: '09:00', location: 'г. Дзержинск', discipline: 'enduro', description: 'Закрытие сезона эндуро осенним кубком.', createdAt: new Date().toISOString() },
            { id: 'comp_2026_20', title: 'Итоги сезона и награждение лучших спортсменов', date: '2026-12-13', time: '15:00', location: 'г. Нижний Новгород', discipline: 'motocross', description: 'Официальное подведение итогов спортивного сезона 2026 года и награждение лучших спортсменов Федерации.', createdAt: new Date().toISOString() }
        ]));
    }
    if (!localStorage.getItem('news')) {
        localStorage.setItem('news', JSON.stringify([
            { id: 'news_1', type: 'manual', title: 'Опубликован календарь соревнований на 2026 год', content: 'Федерация мотоспорта Нижегородской области утвердила итоговый календарь соревнований на 2026 год. В нем учтены 20 мероприятий разных дисциплин. Регистрация на соревнования доступна в разделе "Соревнования".', date: '2026-01-10T10:30:00', imageUrl: null, createdAt: new Date().toISOString() },
            { id: 'news_2', type: 'manual', title: 'Старт продаж абонементов на 2026 год', content: 'Теперь доступна покупка абонементов на соревнования 2026 года. Подробности на странице "Соревнования".', date: '2026-01-05T14:20:00', imageUrl: null, createdAt: new Date().toISOString() }
        ]));
    }
}
