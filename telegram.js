// telegram.js - Функции для отправки сообщений в Telegram

class TelegramBot {
    constructor(botToken, chatId) {
        this.botToken = botToken;
        this.chatId = chatId;
        this.apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        this.lastMessageTime = 0;
        this.minDelay = 5000; // Минимальная задержка между сообщениями (5 секунд)
    }

    async sendMessage(message, options = {}) {
        const now = Date.now();
        if (now - this.lastMessageTime < this.minDelay) {
            console.warn('Сообщение не отправлено: слишком частые запросы');
            return null;
        }
        
        this.lastMessageTime = now;
        
        const defaultOptions = {
            parse_mode: 'HTML',
            disable_web_page_preview: false
        };
        
        const sendOptions = {
            chat_id: this.chatId,
            text: message.substring(0, 4096), // Максимальная длина сообщения в Telegram
            ...defaultOptions,
            ...options
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sendOptions)
            });

            const data = await response.json();
            console.log('Сообщение отправлено в Telegram:', data);
            return data;
        } catch (error) {
            console.error('Ошибка отправки сообщения в Telegram:', error);
            return null;
        }
    }

    async sendMessageWithRetry(message, options = {}, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const result = await this.sendMessage(message, options);
                if (result && result.ok) {
                    return result;
                }
            } catch (error) {
                console.warn(`Попытка ${i + 1} не удалась:`, error);
            }
            
            // Задержка перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
        
        console.error('Все попытки отправки сообщения неудачны');
        return null;
    }

    formatCompetitionMessage(competition) {
        const date = new Date(competition.date);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        return `
🏆 <b>НОВОЕ СОРЕВНОВАНИЕ</b>

<b>${competition.title}</b>

📅 ${formattedDate}
⏰ ${competition.time}
📍 ${competition.location}

${competition.description || 'Подробности на сайте: https://fmsno.ru/competitions.html'}

👉 <a href="https://fmsno.ru/competitions.html">Все соревнования на сайте</a>

#мотоспорт #нижнийновгород #fmsno
        `;
    }

    formatNewsMessage(news) {
        const date = new Date(news.date);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Обрезаем текст до 300 символов для превью
        const previewText = news.text.length > 300 ? 
            news.text.substring(0, 300) + '...' : 
            news.text;

        return `
📢 <b>НОВОСТЬ ФЕДЕРАЦИИ</b>

<b>${news.title}</b>

${previewText}

📅 ${formattedDate}

👉 <a href="https://fmsno.ru/news.html">Читать полностью на сайте</a>

#мотоспорт #новости #fmsno
        `;
    }
}

// Инициализация бота (замените значения на ваши)
const botToken = window.ENV?.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN'; // Ваш реальный токен
const chatId = window.ENV?.TELEGRAM_CHAT_ID || '-1001234567890'; // ID вашего канала

const telegramBot = new TelegramBot(botToken, chatId);

// Функция для отправки нового соревнования
async function sendNewCompetition(competition) {
    if (!competition || !competition.title) return;
    
    const message = telegramBot.formatCompetitionMessage(competition);
    return await telegramBot.sendMessageWithRetry(message);
}

// Функция для отправки новой новости
async function sendNewNews(news) {
    if (!news || !news.title) return;
    
    const message = telegramBot.formatNewsMessage(news);
    return await telegramBot.sendMessageWithRetry(message);
}

// Экспорт функций для использования в других файлах
window.telegramBot = {
    sendNewCompetition,
    sendNewNews
};
