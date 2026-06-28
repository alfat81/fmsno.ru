// ==========================================
// FMSNO.ru - Менеджер документов (CRUD)
// ==========================================
// Полная реализация: добавление, редактирование, удаление документов.
// Файлы документов загружаются через FileReader как DataURL в localStorage.
// ВНИМАНИЕ: localStorage ограничен ~5 МБ. Большие файлы (>2 МБ) лучше
// загружать как внешние ссылки (Яндекс.Диск, Google Docs и т.п.).

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация начальных данных, если их ещё нет
    if (!localStorage.getItem('documents')) seedDocuments();
    loadDocuments();

    // Фильтры
    document.querySelectorAll('.documents-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.documents-filters .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterDocuments(this.dataset.filter);
        });
    });

    // Кнопка "Добавить документ"
    const addBtn = document.getElementById('add-document-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            if (!checkAdminAuth()) {
                showNotification('Нет прав доступа', 'error');
                return;
            }
            showAddDocumentForm();
        });
    }

    // Кнопка "Обновить"
    const refreshBtn = document.getElementById('refresh-documents-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadDocuments();
            showNotification('Список документов обновлён', 'info');
        });
    }

    // Кнопка "Скачать все (ZIP)" — пока заглушка
    const downloadAllBtn = document.getElementById('download-all-btn');
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', () => {
            showNotification('Скачивание всех документов в ZIP скоро будет доступно. Пока качайте по одному.', 'info');
        });
    }

    // Форма документа
    const form = document.getElementById('document-form');
    if (form) form.addEventListener('submit', saveDocument);

    const cancelBtn = document.getElementById('cancel-document-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', hideDocumentForm);

    // Превью файла при выборе
    const fileInput = document.getElementById('document-file');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
});

// --- НАЧАЛЬНЫЕ ДАННЫЕ ---
function seedDocuments() {
    const now = new Date().toISOString();
    const docs = [
        {
            id: 'doc_1',
            title: 'Календарь соревнований на 2026 год',
            type: 'order',
            date: '2026-01-15',
            fileUrl: '#',
            description: 'Официальный календарь соревнований по всем дисциплинам на 2026 год, утверждённый Президентом Федерации.',
            author: 'Хорев Е.В.',
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'doc_2',
            title: 'Положение о проведении Чемпионата области по мотокроссу',
            type: 'regulation',
            date: '2026-03-10',
            fileUrl: '#',
            description: 'Полное положение о проведении Чемпионата Нижегородской области по мотокроссу сезона 2026 года.',
            author: 'Токарев А.В.',
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'doc_3',
            title: 'Регламент соревнований по мотоджимхане',
            type: 'position',
            date: '2026-02-20',
            fileUrl: '#',
            description: 'Единый регламент проведения соревнований по мотоджимхане и фигурному управлению мотоциклом.',
            author: 'Фатьянов А.А.',
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'doc_4',
            title: 'Порядок аттестации судей',
            type: 'other',
            date: '2026-04-05',
            fileUrl: '#',
            description: 'Положение о порядке аттестации и повышения квалификации судейских бригад спортивных соревнований.',
            author: 'Хорева К.С.',
            createdAt: now,
            updatedAt: now
        }
    ];
    localStorage.setItem('documents', JSON.stringify(docs));
}

// --- ЗАГРУЗКА И РЕНДЕР ---
function loadDocuments() {
    const container = document.getElementById('documents-container');
    const emptyState = document.getElementById('empty-documents');
    if (!container) return;

    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    if (documents.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');
    renderDocuments(container, documents);
}

function filterDocuments(filterType) {
    const container = document.getElementById('documents-container');
    const emptyState = document.getElementById('empty-documents');
    if (!container) return;

    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    const filtered = filterType === 'all' ? documents : documents.filter(d => d.type === filterType);

    if (filtered.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');
    renderDocuments(container, filtered);
}

function renderDocuments(container, documents) {
    documents.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    container.innerHTML = '';
    const isAdmin = checkAdminAuth();

    documents.forEach(doc => {
        const card = document.createElement('div');
        card.className = `document-card ${doc.type || 'other'}`;
        const date = new Date(doc.date);
        const formattedDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

        // Иконка в зависимости от типа
        const iconByType = {
            regulation: 'fa-file-contract',
            order:     'fa-file-signature',
            position:  'fa-file-alt',
            other:     'fa-file'
        };
        const iconClass = iconByType[doc.type] || iconByType.other;

        // Действия для админа
        const adminActions = isAdmin ? `
            <button class="btn document-edit-btn" data-id="${doc.id}" title="Редактировать">
                <i class="fas fa-edit"></i> Ред.
            </button>
            <button class="btn document-delete-btn" data-id="${doc.id}" title="Удалить">
                <i class="fas fa-trash"></i> Удалить
            </button>
        ` : '';

        card.innerHTML = `
            <div class="document-icon"><i class="fas ${iconClass}"></i></div>
            <div class="document-content">
                <h3 class="document-title">${escapeHtml(doc.title)}</h3>
                <div class="document-meta">
                    <span><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                    ${doc.author ? `<span><i class="fas fa-user-edit"></i> ${escapeHtml(doc.author)}</span>` : ''}
                </div>
                <p class="document-description">${escapeHtml(doc.description || 'Описание отсутствует')}</p>
                <div class="document-actions">
                    <a href="${doc.fileUrl || '#'}" target="_blank" class="btn view-btn">
                        <i class="fas fa-eye"></i> Посмотреть
                    </a>
                    <a href="${doc.fileUrl || '#'}" download="${escapeHtml(doc.title)}.pdf" class="btn download-btn">
                        <i class="fas fa-download"></i> Скачать
                    </a>
                    ${adminActions}
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // Привязка обработчиков к админским кнопкам
    if (isAdmin) {
        container.querySelectorAll('.document-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => editDocument(btn.dataset.id));
        });
        container.querySelectorAll('.document-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteDocument(btn.dataset.id));
        });
    }
}

// --- ФОРМА: ДОБАВЛЕНИЕ ---
function showAddDocumentForm() {
    document.getElementById('document-form-title').textContent = 'Добавить документ';
    document.getElementById('document-form').reset();
    document.getElementById('document-id').value = '';
    document.getElementById('document-form-container').classList.remove('hidden');
    // Прокрутка к форме
    const form = document.getElementById('document-form-container');
    window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
    // Скрыть инфу о выбранном файле
    const fileInfo = document.getElementById('document-file-info');
    if (fileInfo) fileInfo.classList.add('hidden');
}

// --- ФОРМА: РЕДАКТИРОВАНИЕ ---
function editDocument(id) {
    if (!checkAdminAuth()) {
        showNotification('Нет прав доступа', 'error');
        return;
    }
    const docs = JSON.parse(localStorage.getItem('documents')) || [];
    const doc = docs.find(d => d.id === id);
    if (!doc) {
        showNotification('Документ не найден', 'error');
        return;
    }

    document.getElementById('document-form-title').textContent = 'Редактировать документ';
    document.getElementById('document-id').value = doc.id;
    document.getElementById('document-title').value = doc.title || '';
    document.getElementById('document-type').value = doc.type || '';
    document.getElementById('document-date').value = doc.date || '';
    document.getElementById('document-author').value = doc.author || '';
    document.getElementById('document-description').value = doc.description || '';
    document.getElementById('document-url').value = (doc.fileUrl && doc.fileUrl !== '#' && !doc.fileUrl.startsWith('data:')) ? doc.fileUrl : '';

    // Инфа о текущем файле
    const fileInfo = document.getElementById('document-file-info');
    if (fileInfo) {
        if (doc.fileUrl && doc.fileUrl.startsWith('data:')) {
            fileInfo.classList.remove('hidden');
            fileInfo.innerHTML = '<i class="fas fa-check-circle"></i> Файл уже загружен. Выберите новый, чтобы заменить.';
        } else {
            fileInfo.classList.add('hidden');
        }
    }

    document.getElementById('document-form-container').classList.remove('hidden');
    window.scrollTo({ top: document.getElementById('document-form-container').offsetTop - 100, behavior: 'smooth' });
}

// --- СКРЫТЬ ФОРМУ ---
function hideDocumentForm() {
    document.getElementById('document-form-container').classList.add('hidden');
}

// --- ВЫБОР ФАЙЛА ---
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Проверка размера (максимум 2 МБ, чтобы не переполнить localStorage)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        showNotification(`Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум 2 МБ. Используйте внешнюю ссылку.`, 'error');
        e.target.value = '';
        return;
    }

    const fileInfo = document.getElementById('document-file-info');
    if (fileInfo) {
        fileInfo.classList.remove('hidden');
        fileInfo.innerHTML = `
            <i class="fas fa-check-circle"></i>
            Выбран файл: <strong>${escapeHtml(file.name)}</strong>
            (${(file.size / 1024).toFixed(1)} КБ)
        `;
    }
}

// --- СОХРАНЕНИЕ ---
function saveDocument(e) {
    e.preventDefault();
    if (!checkAdminAuth()) {
        showNotification('Нет прав доступа', 'error');
        return;
    }

    const id = document.getElementById('document-id').value;
    const title = document.getElementById('document-title').value.trim();
    const type = document.getElementById('document-type').value;
    const date = document.getElementById('document-date').value;
    const author = document.getElementById('document-author').value.trim();
    const description = document.getElementById('document-description').value.trim();
    const externalUrl = document.getElementById('document-url').value.trim();
    const fileInput = document.getElementById('document-file');

    if (!title || !type || !date) {
        showNotification('Заполните обязательные поля: название, тип, дата', 'error');
        return;
    }

    const now = new Date().toISOString();
    const docs = JSON.parse(localStorage.getItem('documents')) || [];

    // Если есть новый файл — читаем его как DataURL
    if (fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            const fileDataUrl = ev.target.result;
            // Проверим, что localStorage не переполнен
            try {
                _saveDocumentData(docs, id, title, type, date, author, description, externalUrl, fileDataUrl, now);
            } catch (err) {
                showNotification('Не удалось сохранить: файл слишком большой для localStorage. Используйте внешнюю ссылку.', 'error');
                console.error(err);
            }
        };
        reader.onerror = () => {
            showNotification('Ошибка чтения файла', 'error');
        };
        reader.readAsDataURL(file);
    } else {
        // Без файла — используем externalUrl или существующий fileUrl
        try {
            _saveDocumentData(docs, id, title, type, date, author, description, externalUrl, null, now);
        } catch (err) {
            showNotification('Не удалось сохранить: ' + err.message, 'error');
            console.error(err);
        }
    }
}

// Внутренняя функция — финальное сохранение в localStorage
function _saveDocumentData(docs, id, title, type, date, author, description, externalUrl, fileDataUrl, now) {
    const existing = id ? docs.find(d => d.id === id) : null;

    // Определяем fileUrl:
    // - если загружен новый файл — используем его DataURL
    // - иначе если есть externalUrl — используем его
    // - иначе если редактируем существующий и у него был DataURL — сохраняем его
    // - иначе '#' (нет файла)
    let fileUrl;
    if (fileDataUrl) {
        fileUrl = fileDataUrl;
    } else if (externalUrl) {
        fileUrl = externalUrl;
    } else if (existing && existing.fileUrl && existing.fileUrl.startsWith('data:')) {
        fileUrl = existing.fileUrl;
    } else if (existing && existing.fileUrl && existing.fileUrl !== '#') {
        fileUrl = existing.fileUrl;
    } else {
        fileUrl = '#';
    }

    const newDoc = {
        id: id || `doc_${Date.now()}`,
        title,
        type,
        date,
        author,
        description,
        fileUrl,
        updatedAt: now
    };

    if (id) {
        // Редактирование
        const index = docs.findIndex(d => d.id === id);
        if (index !== -1) {
            newDoc.createdAt = docs[index].createdAt || now;
            docs[index] = newDoc;
        }
    } else {
        // Создание
        newDoc.createdAt = now;
        docs.push(newDoc);
    }

    localStorage.setItem('documents', JSON.stringify(docs));
    loadDocuments();
    hideDocumentForm();
    showNotification(id ? 'Документ обновлён!' : 'Документ добавлен!', 'success');
}

// --- УДАЛЕНИЕ ---
function deleteDocument(id) {
    if (!checkAdminAuth()) {
        showNotification('Нет прав доступа', 'error');
        return;
    }
    if (!confirm('Удалить этот документ безвозвратно?')) return;

    const docs = JSON.parse(localStorage.getItem('documents')) || [];
    const filtered = docs.filter(d => d.id !== id);
    localStorage.setItem('documents', JSON.stringify(filtered));
    loadDocuments();
    showNotification('Документ удалён', 'success');
}

// --- УТИЛИТА ---
function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}
