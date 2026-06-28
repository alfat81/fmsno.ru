// ==========================================
// FMSNO.ru - Импорт новостей из ВКонтакте
// ==========================================
// Два режима:
// 1) Автозагрузка ленты постов из группы fmsno (нужен VK_SERVICE_TOKEN в env.js).
//    Токен виден в исходниках — это безопасно только для чтения публичной группы.
//    Для полноценной защиты нужен бэкенд-прокси (см. Этап 5).
// 2) Ручной импорт: админ вставляет ссылку на пост ВК + текст, новость сохраняется.
//
// VK Group ID: 229780192 (slug: fmsno)
// Документация: https://dev.vk.com/method/wall.get

const VK_GROUP_ID = '229780192';
const VK_GROUP_SCREEN_NAME = 'fmsno';

document.addEventListener('DOMContentLoaded', () => {
    // Добавляем кнопку "Импорт из ВК" в админ-панель, если мы на странице новостей
    const newsControls = document.querySelector('.news-controls');
    if (newsControls && document.getElementById('news-container')) {
        const importBtn = document.getElementById('import-vk-btn');
        if (!importBtn) {
            const btn = document.createElement('button');
            btn.id = 'import-vk-btn';
            btn.className = 'btn hidden-admin';
            btn.innerHTML = '<i class="fab fa-vk"></i> Импорт из ВК';
            newsControls.appendChild(btn);
            btn.addEventListener('click', openVKImportModal);
        }
    }
});

// --- Открыть модалку импорта ---
function openVKImportModal() {
    // Закрываем админ-панель
    const adminPanel = document.getElementById('admin-bottom-panel');
    if (adminPanel) adminPanel.classList.remove('visible');
    document.body.style.overflow = 'hidden';

    const existing = document.getElementById('vk-import-modal');
    if (existing) existing.remove();

    const hasToken = window.ENV && window.ENV.VK_SERVICE_TOKEN;
    const tokenNotice = hasToken
        ? '<div class="vk-import-notice success"><i class="fas fa-check-circle"></i> Найден VK_SERVICE_TOKEN — автозагрузка ленты доступна.</div>'
        : '<div class="vk-import-notice warning"><i class="fas fa-exclamation-triangle"></i> VK_SERVICE_TOKEN не задан в env.js — автозагрузка недоступна. Используйте ручной импорт по ссылке.</div>';

    const modal = document.createElement('div');
    modal.id = 'vk-import-modal';
    modal.className = 'news-full-overlay active';
    modal.innerHTML = `
        <div class="news-full-content" style="max-width: 760px;">
            <button class="close-full-news" aria-label="Закрыть">&times;</button>
            <div class="news-full-header">
                <h2><i class="fab fa-vk"></i> Импорт новостей из ВКонтакте</h2>
                <div class="news-full-meta">
                    <span>Группа: <a href="https://vk.com/${VK_GROUP_SCREEN_NAME}" target="_blank">vk.com/${VK_GROUP_SCREEN_NAME}</a></span>
                </div>
            </div>
            <div class="news-full-text">
                ${tokenNotice}

                <div class="vk-import-section">
                    <h3><i class="fas fa-download"></i> Автозагрузка ленты</h3>
                    <p class="vk-help">Загрузить последние 10 постов из группы и выбрать, какие импортировать.</p>
                    <button class="btn btn-primary" id="vk-load-feed-btn">
                        <i class="fas fa-sync-alt"></i> Загрузить ленту
                    </button>
                    <div id="vk-feed-container" style="margin-top: 16px;"></div>
                </div>

                <hr style="margin: 24px 0; border: none; border-top: 1px solid #e0e0e0;">

                <div class="vk-import-section">
                    <h3><i class="fas fa-link"></i> Ручной импорт по ссылке</h3>
                    <p class="vk-help">Вставьте ссылку на пост ВКонтакте и при желании отредактируйте текст.</p>
                    <div class="form-group">
                        <label for="vk-post-url">Ссылка на пост ВК</label>
                        <input type="url" id="vk-post-url" placeholder="https://vk.com/fmsno?w=wall-229780192_123">
                    </div>
                    <div class="form-group">
                        <label for="vk-post-title">Заголовок (можно свой)</label>
                        <input type="text" id="vk-post-title" placeholder="Например: Итоги соревнований по мотокроссу">
                    </div>
                    <div class="form-group">
                        <label for="vk-post-text">Текст новости</label>
                        <textarea id="vk-post-text" rows="5" placeholder="Скопируйте сюда текст поста из ВК или напишите свой"></textarea>
                    </div>
                    <button class="btn btn-primary" id="vk-import-manual-btn">
                        <i class="fas fa-plus"></i> Добавить в новости
                    </button>
                </div>
            </div>
            <div class="news-full-footer">
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

    // Кнопка автозагрузки
    modal.querySelector('#vk-load-feed-btn').addEventListener('click', loadVKFeed);
    // Кнопка ручного импорта
    modal.querySelector('#vk-import-manual-btn').addEventListener('click', manualVKImport);
}

// --- Автозагрузка ленты ---
async function loadVKFeed() {
    const container = document.getElementById('vk-feed-container');
    if (!container) return;

    if (!window.ENV || !window.ENV.VK_SERVICE_TOKEN) {
        container.innerHTML = `
            <div class="vk-import-notice error">
                <i class="fas fa-times-circle"></i> Нет VK_SERVICE_TOKEN в env.js.
                Чтобы включить автозагрузку, создайте standalone-приложение на
                <a href="https://dev.vk.com/" target="_blank">dev.vk.com</a> и добавьте
                сервисный токен в env.js: <code>VK_SERVICE_TOKEN: 'ваш_токен'</code>.
            </div>`;
        return;
    }

    container.innerHTML = '<div class="vk-loading"><i class="fas fa-spinner fa-spin"></i> Загрузка постов из ВК…</div>';

    try {
        const url = `https://api.vk.com/method/wall.get?owner_id=-${VK_GROUP_ID}&count=10&filter=owner&extended=1&access_token=${encodeURIComponent(window.ENV.VK_SERVICE_TOKEN)}&v=5.199`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            throw new Error(data.error.error_msg || 'VK API error');
        }

        renderVKFeed(container, data.response);
    } catch (err) {
        container.innerHTML = `
            <div class="vk-import-notice error">
                <i class="fas fa-times-circle"></i> Не удалось загрузить: ${escapeHtml(err.message)}.
                Попробуйте ручной импорт по ссылке ниже.
            </div>`;
    }
}

function renderVKFeed(container, response) {
    const items = (response.items || []).filter(it => !it.is_pinned);
    if (items.length === 0) {
        container.innerHTML = '<div class="vk-import-notice warning">В группе нет постов.</div>';
        return;
    }

    const existingNews = JSON.parse(localStorage.getItem('news') || '[]');
    const existingVKIds = new Set(existingNews.filter(n => n.vkPostId).map(n => n.vkPostId));

    container.innerHTML = items.map(item => {
        const postId = item.id;
        const postUrl = `https://vk.com/${VK_GROUP_SCREEN_NAME}?w=wall-${VK_GROUP_ID}_${postId}`;
        const date = new Date(item.date * 1000).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        const text = (item.text || '').trim();
        const preview = text.length > 200 ? text.substring(0, 200) + '…' : (text || '(без текста)');
        const alreadyImported = existingVKIds.has(`wall-${VK_GROUP_ID}_${postId}`);
        const firstPhoto = (item.attachments || []).find(a => a.type === 'photo');
        const photoUrl = firstPhoto ? firstPhoto.photo.sizes.pop().url : null;

        return `
            <div class="vk-feed-item" data-post-id="${postId}" data-post-url="${escapeHtml(postUrl)}">
                <div class="vk-feed-header">
                    <span class="vk-feed-date"><i class="far fa-clock"></i> ${date}</span>
                    ${alreadyImported ? '<span class="vk-feed-imported">Уже импортирован</span>' : ''}
                </div>
                ${photoUrl ? `<div class="vk-feed-photo"><img src="${escapeHtml(photoUrl)}" alt="Фото из поста" loading="lazy"></div>` : ''}
                <div class="vk-feed-text">${escapeHtml(preview)}</div>
                <div class="vk-feed-actions">
                    <a href="${escapeHtml(postUrl)}" target="_blank" class="btn">
                        <i class="fab fa-vk"></i> Открыть в ВК
                    </a>
                    <button class="btn btn-primary vk-feed-import-btn" ${alreadyImported ? 'disabled' : ''}>
                        <i class="fas fa-plus"></i> ${alreadyImported ? 'Импортирован' : 'Импортировать'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.vk-feed-import-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.vk-feed-item');
            const postId = item.dataset.postId;
            const postUrl = item.dataset.postUrl;
            importVKPost(postId, postUrl);
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-check"></i> Импортирован';
            item.querySelector('.vk-feed-header').insertAdjacentHTML('beforeend',
                '<span class="vk-feed-imported">Уже импортирован</span>');
        });
    });
}

function importVKPost(postId, postUrl) {
    // Находим полный текст поста из уже загруженной ленты и сохраняем как новость
    const items = JSON.parse(sessionStorage.getItem('vkFeedCache') || '[]');
    const post = items.find(it => String(it.id) === String(postId));

    const text = post ? post.text : '';
    const firstPhoto = post ? (post.attachments || []).find(a => a.type === 'photo') : null;
    const photoUrl = firstPhoto ? firstPhoto.photo.sizes.pop().url : null;

    // Заголовок: первые 80 символов текста
    const title = text
        ? (text.length > 80 ? text.substring(0, 80) + '…' : text).split('\n')[0]
        : `Пост ВКонтакте от ${new Date().toLocaleDateString('ru-RU')}`;

    const news = JSON.parse(localStorage.getItem('news') || '[]');
    const newNews = {
        id: `news_vk_${postId}_${Date.now()}`,
        type: 'vk',
        title,
        content: text || 'Смотрите подробности в посте ВКонтакте',
        date: post ? new Date(post.date * 1000).toISOString() : new Date().toISOString(),
        imageUrl: photoUrl,
        vkPostId: `wall-${VK_GROUP_ID}_${postId}`,
        vkPostUrl: postUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    news.unshift(newNews);
    localStorage.setItem('news', JSON.stringify(news));

    // Отправляем в Telegram
    if (typeof window.telegramBot === 'object' && window.telegramBot.sendNewNews) {
        window.telegramBot.sendNewNews(newNews).catch(err => console.warn('Telegram:', err));
    }

    showNotification('Новость из ВК импортирована', 'success');
}

// --- Ручной импорт по ссылке ---
function manualVKImport() {
    const urlInput = document.getElementById('vk-post-url');
    const titleInput = document.getElementById('vk-post-title');
    const textInput = document.getElementById('vk-post-text');

    const postUrl = urlInput.value.trim();
    const title = titleInput.value.trim();
    const text = textInput.value.trim();

    if (!postUrl || !text) {
        showNotification('Заполните ссылку на пост и текст новости', 'error');
        return;
    }

    // Извлекаем ID поста из URL, если возможно
    let vkPostId = null;
    const match = postUrl.match(/wall(-?\d+)_(\d+)/);
    if (match) vkPostId = `wall${match[1]}_${match[2]}`;

    const news = JSON.parse(localStorage.getItem('news') || '[]');
    // Проверяем дубликат
    if (vkPostId && news.some(n => n.vkPostId === vkPostId)) {
        showNotification('Этот пост уже импортирован', 'error');
        return;
    }

    const newNews = {
        id: `news_manual_${Date.now()}`,
        type: 'vk',
        title: title || text.substring(0, 80),
        content: text,
        date: new Date().toISOString(),
        imageUrl: null,
        vkPostId,
        vkPostUrl: postUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    news.unshift(newNews);
    localStorage.setItem('news', JSON.stringify(news));

    showNotification('Новость добавлена вручную', 'success');

    // Очищаем форму и закрываем модал
    urlInput.value = '';
    titleInput.value = '';
    textInput.value = '';

    // Если мы на странице новостей — перерисуем
    if (typeof loadNews === 'function') loadNews();

    // Закрываем модал
    const modal = document.getElementById('vk-import-modal');
    if (modal) modal.remove();
    document.body.style.overflow = 'auto';
}

// Сохраняем ленту в sessionStorage при загрузке, чтобы использовать
// полный текст при импорте конкретного поста
const _origRenderVKFeed = renderVKFeed;
function renderVKFeedWithCache(container, response) {
    sessionStorage.setItem('vkFeedCache', JSON.stringify(response.items || []));
    _origRenderVKFeed(container, response);
}
renderVKFeed = renderVKFeedWithCache;

// --- Утилита экранирования (локальная копия, чтобы не зависеть от feedback.js) ---
function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}
