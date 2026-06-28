// ==========================================
// FMSNO.ru - Обратная связь (заявки в админку)
// ==========================================
// Заявки из форм contacts.html (#contact-form) и partners.html (#partner-form)
// сохраняются в localStorage и отображаются в админ-панели во вкладке "Заявки".
// Опционально дублируются в Telegram-бот (если подключён telegram.js и есть токен).

document.addEventListener('DOMContentLoaded', () => {
    // --- Форма контактов ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = collectFormData(contactForm, ['name', 'email', 'phone', 'message']);
            if (!data.name || !data.message) {
                showNotification('Заполните имя и сообщение', 'error');
                return;
            }
            const req = createFeedbackRequest('contact', data);
            saveFeedbackRequest(req);
            sendFeedbackToTelegram(req);
            showNotification('Спасибо! Ваше сообщение отправлено. Мы ответим в ближайшее время.', 'success');
            contactForm.reset();
        });
    }

    // --- Форма партнёров ---
    const partnerForm = document.getElementById('partner-form');
    if (partnerForm) {
        partnerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = collectFormData(partnerForm, [
                'company-name', 'contact-name', 'position',
                'email', 'phone', 'partnership-type', 'message'
            ]);
            if (!data['company-name'] || !data['contact-name']) {
                showNotification('Заполните название компании и контактное лицо', 'error');
                return;
            }
            const req = createFeedbackRequest('partner', data);
            saveFeedbackRequest(req);
            sendFeedbackToTelegram(req);
            showNotification(`Спасибо, ${data['contact-name']}! Ваша заявка принята. Мы свяжемся с вами.`, 'success');
            partnerForm.reset();
        });
    }

    // --- Кнопка просмотра заявок в админ-панели ---
    initFeedbackTabInAdmin();
});

// --- Сбор данных формы по field-name (атрибут name или id) ---
function collectFormData(form, fields) {
    const data = {};
    fields.forEach(name => {
        const el = form.querySelector(`[name="${name}"], #${name}`);
        if (el) data[name] = el.value.trim();
    });
    return data;
}

// --- Создание объекта заявки ---
function createFeedbackRequest(type, data) {
    return {
        id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,             // 'contact' | 'partner'
        data,             // произвольные поля формы
        status: 'new',    // 'new' | 'read' | 'archived'
        createdAt: new Date().toISOString()
    };
}

// --- Сохранение ---
function saveFeedbackRequest(req) {
    const list = JSON.parse(localStorage.getItem('feedbackRequests') || '[]');
    list.unshift(req);
    localStorage.setItem('feedbackRequests', JSON.stringify(list));
    updateFeedbackBadge();
}

// --- Получить все заявки ---
function getFeedbackRequests() {
    return JSON.parse(localStorage.getItem('feedbackRequests') || '[]');
}

// --- Обновить badge с количеством новых заявок ---
function updateFeedbackBadge() {
    const badge = document.getElementById('feedback-badge');
    if (!badge) return;
    const newCount = getFeedbackRequests().filter(r => r.status === 'new').length;
    if (newCount > 0) {
        badge.textContent = newCount > 99 ? '99+' : String(newCount);
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

// --- Инициализация вкладки "Заявки" в админ-панели ---
function initFeedbackTabInAdmin() {
    const controlsPanel = document.getElementById('admin-controls-panel');
    if (!controlsPanel) {
        // На странице нет админ-панели — выходим
        return;
    }

    // Добавляем кнопку "Заявки" в админ-меню, если её ещё нет
    const adminActions = controlsPanel.querySelector('.admin-actions');
    if (adminActions && !document.getElementById('view-feedback-btn')) {
        const btn = document.createElement('button');
        btn.id = 'view-feedback-btn';
        btn.className = 'btn admin-action-btn';
        btn.style.position = 'relative';
        btn.innerHTML = `
            <i class="fas fa-inbox"></i> Заявки
            <span id="feedback-badge" class="feedback-badge" style="display:none;">0</span>
        `;
        // Вставляем ПЕРВЫМ — чтобы заявки были заметнее
        adminActions.insertBefore(btn, adminActions.firstChild);

        btn.addEventListener('click', openFeedbackModal);
    }

    updateFeedbackBadge();
}

// --- Модальное окно со списком заявок ---
function openFeedbackModal() {
    // Закрываем админ-панель
    const adminPanel = document.getElementById('admin-bottom-panel');
    if (adminPanel) adminPanel.classList.remove('visible');
    document.body.style.overflow = 'hidden';

    // Если модал уже есть — удаляем
    const existing = document.getElementById('feedback-modal');
    if (existing) existing.remove();

    const requests = getFeedbackRequests();

    const modal = document.createElement('div');
    modal.id = 'feedback-modal';
    modal.className = 'news-full-overlay active';
    modal.innerHTML = `
        <div class="news-full-content" style="max-width: 760px;">
            <button class="close-full-news" aria-label="Закрыть">&times;</button>
            <div class="news-full-header">
                <h2><i class="fas fa-inbox"></i> Заявки с сайта</h2>
                <div class="news-full-meta">
                    <span id="feedback-count">${requests.length} всего · ${requests.filter(r => r.status === 'new').length} новых</span>
                </div>
            </div>
            <div class="news-full-text" style="max-height: 60vh; overflow-y: auto;">
                ${renderFeedbackList(requests)}
            </div>
            <div class="news-full-footer" style="display:flex; gap:10px; justify-content:space-between;">
                <button class="btn btn-secondary" id="feedback-clear-btn">
                    <i class="fas fa-trash"></i> Очистить все
                </button>
                <button class="btn btn-secondary close-full-news-btn">
                    <i class="fas fa-times"></i> Закрыть
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const close = () => { modal.remove(); document.body.style.overflow = 'auto'; };
    modal.querySelector('.close-full-news').addEventListener('click', close);
    modal.querySelector('.close-full-news-btn').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    // Пометить все как прочитанные
    const updated = requests.map(r => r.status === 'new' ? { ...r, status: 'read' } : r);
    localStorage.setItem('feedbackRequests', JSON.stringify(updated));
    updateFeedbackBadge();

    // Привязать действия к каждой карточке
    modal.querySelectorAll('.feedback-item-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            handleFeedbackAction(id, action);
            openFeedbackModal(); // перерисовать
        });
    });

    // Кнопка "Очистить все"
    const clearBtn = modal.querySelector('#feedback-clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (!confirm('Удалить ВСЕ заявки безвозвратно?')) return;
            localStorage.removeItem('feedbackRequests');
            updateFeedbackBadge();
            close();
        });
    }
}

function renderFeedbackList(requests) {
    if (requests.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-content">
                    <i class="fas fa-inbox empty-icon"></i>
                    <h3>Заявок пока нет</h3>
                    <p>Когда посетители отправят форму обратной связи на страницах «Контакты» или «Партнёрам», заявки появятся здесь.</p>
                </div>
            </div>`;
    }
    return requests.map(r => renderFeedbackItem(r)).join('');
}

function renderFeedbackItem(r) {
    const date = new Date(r.createdAt).toLocaleString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const typeLabel = r.type === 'partner'
        ? '<i class="fas fa-handshake"></i> Партнёрство'
        : '<i class="fas fa-envelope"></i> Контакты';
    const typeClass = r.type === 'partner' ? 'feedback-type-partner' : 'feedback-type-contact';
    const newBadge = r.status === 'new' ? '<span class="feedback-new-badge">NEW</span>' : '';

    // Собираем содержимое в зависимости от типа
    let body = '';
    if (r.type === 'contact') {
        body = `
            <p><strong>Имя:</strong> ${escapeHtml(r.data.name || '-')}</p>
            ${r.data.email ? `<p><strong>Email:</strong> <a href="mailto:${escapeHtml(r.data.email)}">${escapeHtml(r.data.email)}</a></p>` : ''}
            ${r.data.phone ? `<p><strong>Телефон:</strong> <a href="tel:${escapeHtml(r.data.phone)}">${escapeHtml(r.data.phone)}</a></p>` : ''}
            <p><strong>Сообщение:</strong></p><p>${escapeHtml(r.data.message || '-')}</p>`;
    } else {
        body = `
            <p><strong>Компания:</strong> ${escapeHtml(r.data['company-name'] || '-')}</p>
            <p><strong>Контактное лицо:</strong> ${escapeHtml(r.data['contact-name'] || '-')}</p>
            ${r.data.position ? `<p><strong>Должность:</strong> ${escapeHtml(r.data.position)}</p>` : ''}
            ${r.data.email ? `<p><strong>Email:</strong> <a href="mailto:${escapeHtml(r.data.email)}">${escapeHtml(r.data.email)}</a></p>` : ''}
            ${r.data.phone ? `<p><strong>Телефон:</strong> <a href="tel:${escapeHtml(r.data.phone)}">${escapeHtml(r.data.phone)}</a></p>` : ''}
            ${r.data['partnership-type'] ? `<p><strong>Тип партнёрства:</strong> ${escapeHtml(r.data['partnership-type'])}</p>` : ''}
            ${r.data.message ? `<p><strong>Комментарий:</strong></p><p>${escapeHtml(r.data.message)}</p>` : ''}`;
    }

    return `
        <div class="feedback-item ${typeClass}">
            <div class="feedback-item-header">
                <span class="feedback-type">${typeLabel}</span>
                <span class="feedback-date"><i class="far fa-clock"></i> ${date}</span>
                ${newBadge}
            </div>
            <div class="feedback-body">${body}</div>
            <div class="feedback-item-actions">
                <button class="btn feedback-item-action" data-id="${r.id}" data-action="archive">
                    <i class="fas fa-archive"></i> В архив
                </button>
                <button class="btn feedback-item-action" data-id="${r.id}" data-action="delete">
                    <i class="fas fa-trash"></i> Удалить
                </button>
            </div>
        </div>
    `;
}

function handleFeedbackAction(id, action) {
    const list = getFeedbackRequests();
    if (action === 'delete') {
        if (!confirm('Удалить эту заявку?')) return;
        const filtered = list.filter(r => r.id !== id);
        localStorage.setItem('feedbackRequests', JSON.stringify(filtered));
        showNotification('Заявка удалена', 'success');
    } else if (action === 'archive') {
        const updated = list.map(r => r.id === id ? { ...r, status: 'archived' } : r);
        localStorage.setItem('feedbackRequests', JSON.stringify(updated));
        showNotification('Заявка перенесена в архив', 'success');
    }
    updateFeedbackBadge();
}

// --- Отправка в Telegram ---
function sendFeedbackToTelegram(req) {
    if (typeof window.telegramBot !== 'object') return; // telegram.js не подключён
    if (!window.ENV || !window.ENV.TELEGRAM_BOT_TOKEN) return;

    const date = new Date(req.createdAt).toLocaleString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let body = '';
    if (req.type === 'contact') {
        const d = req.data;
        body = `👤 <b>${escapeTelegram(d.name || 'Без имени')}</b>
${d.email ? `✉️ ${escapeTelegram(d.email)}\n` : ''}${d.phone ? `📞 ${escapeTelegram(d.phone)}\n` : ''}💬 ${escapeTelegram(d.message || '')}`;
    } else {
        const d = req.data;
        body = `🤝 <b>${escapeTelegram(d['company-name'] || 'Компания не указана')}</b>
👤 Контакт: ${escapeTelegram(d['contact-name'] || '-')}
${d.position ? `💼 Должность: ${escapeTelegram(d.position)}\n` : ''}${d.email ? `✉️ ${escapeTelegram(d.email)}\n` : ''}${d.phone ? `📞 ${escapeTelegram(d.phone)}\n` : ''}${d['partnership-type'] ? `📋 Тип: ${escapeTelegram(d['partnership-type'])}\n` : ''}${d.message ? `💬 ${escapeTelegram(d.message)}` : ''}`;
    }

    const message = `${req.type === 'partner' ? '🤝' : '📬'} <b>НОВАЯ ЗАЯВКА С САЙТА</b>
${req.type === 'partner' ? 'Партнёрство' : 'Обратная связь'}

${body}

🕐 ${date}

👉 <a href="https://fmsno.ru/">fmsno.ru</a>

#заявка #${req.type === 'partner' ? 'партнёрство' : 'обратная_связь'} #fmsno`;

    // Отправляем через тот же API, что и в telegram.js
    try {
        fetch(`https://api.telegram.org/bot${window.ENV.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: window.ENV.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        }).catch(err => console.warn('Telegram feedback send error:', err));
    } catch (e) {
        console.warn('Telegram feedback:', e);
    }
}

// --- Утилиты экранирования ---
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}
function escapeTelegram(s) {
    return String(s).replace(/[<>&]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]));
}
