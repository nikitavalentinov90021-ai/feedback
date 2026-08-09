import { kv } from '@vercel/kv';

const ALLOWED_PROJECTS = ['VPN', 'Lynx', 'Quorvox', 'QuorKick', 'QuorStream'];

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        try {
            const reviews = await kv.get('reviews') || [];
            // сортируем по дате (новые сверху)
            reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
            return res.status(200).json(reviews);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Ошибка чтения базы' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { name, rating, text, project } = req.body;

            if (!name || !rating || !text || !project) {
                return res.status(400).json({ error: 'Заполните все поля' });
            }

            if (!ALLOWED_PROJECTS.includes(project)) {
                return res.status(400).json({ error: 'Некорректный проект' });
            }

            const ratingNum = parseInt(rating);
            if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
                return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
            }

            if (text.length > 1000) {
                return res.status(400).json({ error: 'Текст не должен превышать 1000 символов' });
            }

            const currentReviews = await kv.get('reviews') || [];

            // Проверка на дубликат: один пользователь (имя) на проект - один отзыв
            const existing = currentReviews.find(r => r.name === name && r.project === project);
            if (existing) {
                return res.status(400).json({ error: `Вы уже оставили отзыв на проект ${project}` });
            }

            const newReview = {
                id: Date.now(),
                name,
                rating: ratingNum,
                text,
                project,
                date: new Date().toISOString()
            };

            currentReviews.unshift(newReview);
            await kv.set('reviews', currentReviews);

            return res.status(201).json(newReview);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Ошибка записи в базу' });
        }
    }

    return res.status(405).json({ error: 'Метод не поддерживается' });
}
