// ==========================================
// FMSNO.ru - Cookie Banner + Consent Management
// ==========================================
// Соответствие 152-ФЗ + Постановление Роскомнадзора от 27.07.2024
// Блокирует Яндекс.Метрику и Google Analytics до явного согласия пользователя.
// Цель: анализ посещаемости (необходимо согласие согласно 152-ФЗ ст. 6).

(function () {
    const STORAGE_KEY = 'fmsno_cookie_consent';
    const CONSENT_TTL_DAYS = 180; // ~6 месяцев

    /**
     * Проверяет, дал ли пользователь согласие ранее (и не истекло ли оно).
     * @returns {'accepted'|'rejected'|null}
     */
    function getConsent() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            // Проверяем срок
            const age = Date.now() - (data.timestamp || 0);
            if (age > CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000) {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
            return data.value === 'accepted' ? 'accepted' : 'rejected';
        } catch (e) {
            return null;
        }
    }

    /**
     * Сохраняет выбор пользователя и активирует/блокирует счётчики.
     */
    function setConsent(value) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                value: value,
                timestamp: Date.now()
            }));
        } catch (e) { /* ignore */ }

        if (value === 'accepted') {
            enableAnalytics();
        } else {
            disableAnalytics();
        }
    }

    /**
     * Активирует Яндекс.Метрику и Google Analytics, если они определены.
     * Вызывается только после согласия.
     */
    function enableAnalytics() {
        // Яндекс.Метрика
        if (typeof ym === 'function' && window.yaCounter105649209) {
            // Метрика уже инициализирована — опционально можно включить точные данные
            try {
                window.yaCounter105649209.hit(window.location.href);
            } catch (e) { /* ignore */ }
        }
        // Инициализируем Метрику, если отложенная инициализация
        if (typeof window.initYandexMetrika === 'function') {
            window.initYandexMetrika();
        }
        // Google Analytics
        if (typeof gtag === 'function') {
            // Включаем consent mode
            try {
                gtag('consent', 'update', {
                    'analytics_storage': 'granted'
                });
            } catch (e) { /* ignore */ }
        }
    }

    function disableAnalytics() {
        if (typeof gtag === 'function') {
            try {
                gtag('consent', 'update', {
                    'analytics_storage': 'denied'
                });
            } catch (e) { /* ignore */ }
        }
    }

    /**
     * Создаёт DOM-баннер.
     */
    function showBanner() {
        if (document.getElementById('cookie-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Уведомление об использовании файлов cookie');
        banner.innerHTML = `
            <div class="cookie-banner__content">
                <div class="cookie-banner__text">
                    <div class="cookie-banner__title">
                        <i class="fas fa-cookie-bite"></i> Мы используем cookies
                    </div>
                    <p>
                        Продолжая использовать сайт, вы соглашаетесь на обработку файлов cookie
                        и персональных данных в целях функционирования сайта и анализа посещаемости
                        в соответствии с <a href="privacy.html">Политикой конфиденциальности</a>
                        и <a href="https://rkn.gov.ru/" target="_blank" rel="noopener">требованиями Роскомнадзора</a>.
                        Вы можете отказаться от cookies в настройках браузера.
                    </p>
                </div>
                <div class="cookie-banner__actions">
                    <button type="button" class="cookie-banner__btn cookie-banner__btn--accept" id="cookie-accept">
                        <i class="fas fa-check"></i> Принять
                    </button>
                    <button type="button" class="cookie-banner__btn cookie-banner__btn--reject" id="cookie-reject">
                        Отклонить
                    </button>
                    <a href="privacy.html" class="cookie-banner__link">Подробнее</a>
                </div>
            </div>
        `;
        document.body.appendChild(banner);

        // Плавное появление
        requestAnimationFrame(() => banner.classList.add('cookie-banner--visible'));

        document.getElementById('cookie-accept').addEventListener('click', () => {
            setConsent('accepted');
            hideBanner(banner);
        });
        document.getElementById('cookie-reject').addEventListener('click', () => {
            setConsent('rejected');
            hideBanner(banner);
        });
    }

    function hideBanner(banner) {
        banner.classList.remove('cookie-banner--visible');
        setTimeout(() => {
            if (banner.parentNode) banner.parentNode.removeChild(banner);
        }, 400);
    }

    // === Инициализация ===
    document.addEventListener('DOMContentLoaded', () => {
        const consent = getConsent();
        if (consent === 'accepted') {
            enableAnalytics();
        } else if (consent === 'rejected') {
            disableAnalytics();
        } else {
            // Не давал согласия — показываем баннер (с небольшой задержкой)
            setTimeout(showBanner, 800);
        }
    });

    // Экспортируем для использования в других скриптах
    window.FmsnoConsent = {
        get: getConsent,
        set: setConsent,
        enable: enableAnalytics,
        disable: disableAnalytics
    };
})();
