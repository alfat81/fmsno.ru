// telegram.js - Функции для отправки сообщений в Telegram

class TelegramBot {
    constructor(botToken, chatId) {
        this.botToken = botToken;
        this.chatId = chatId;
        this.apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    }

    async sendMessage(message, options = {}) {
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
const botToken = '8461977678:AAHXGOs2mSyHsAEXsHHUro58j638iIHwm6U'; // Замените на ваш токен
const chatId = '-1003455512571'; // Замените на ID вашего канала

const telegramBot = new TelegramBot(botToken, chatId);

// Функция для отправки нового соревнования
async function sendNewCompetition(competition) {
    if (!competition || !competition.title) return;
    
    const message = telegramBot.formatCompetitionMessage(competition);
    return await telegramBot.sendMessage(message);
}

// Функция для отправки новой новости
async function sendNewNews(news) {
    if (!news || !news.title) return;
    
    const message = telegramBot.formatNewsMessage(news);
    return await telegramBot.sendMessage(message);
}

// Экспорт функций для использования в других файлах
window.telegramBot = {
    sendNewCompetition,
    sendNewNews
};
