import { Redis } from '@upstash/redis';

// Подключаемся правильно через HTTP REST API, как требует Serverless
const kv = new Redis({
  url: 'СЮДА_ВСТАВЬ_ССЫЛКУ_КОТОРАЯ_НАЧИНАЕТСЯ_С_HTTPS',
  token: 'СЮДА_ВСТАВЬ_ДЛИННЫЙ_ТОКЕН_ИЗ_ВКЛАДКИ_ENV'
});

export default async function handler(req, res) {
    // Настройки CORS, чтобы фронтенд мог свободно общаться с бэкендом
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 1. Получение всех отзывов
    if (req.method === 'GET') {
        try {
            const reviews = await kv.get('reviews') || [];
            return res.status(200).json(reviews);
        } catch (error) {
            console.error('Ошибка чтения:', error);
            return res.status(500).json({ error: 'Ошибка чтения из базы' });
        }
    }

    // 2. Добавление нового отзыва
    if (req.method === 'POST') {
        try {
            const { name, rating, text } = req.body;

            if (!rating || !text) {
                return res.status(400).json({ error: 'Заполните оценку и текст отзыва' });
            }

            const newReview = {
                id: Date.now(),
                name: name || 'Аноним',
                rating: parseInt(rating),
                text,
                date: new Date().toISOString()
            };

            const currentReviews = await kv.get('reviews') || [];
            currentReviews.unshift(newReview);
            await kv.set('reviews', currentReviews);

            return res.status(201).json(newReview);
        } catch (error) {
            console.error('Ошибка записи:', error);
            return res.status(500).json({ error: 'Ошибка записи в базу' });
        }
    }

    return res.status(405).json({ error: 'Метод не поддерживается' });
}
