import { Redis } from '@upstash/redis';

// Явно создаём клиент из переменных окружения (если они есть)
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET – получение всех отзывов
  if (req.method === 'GET') {
    try {
      const reviews = (await kv.get('reviews')) || [];
      return res.status(200).json(reviews);
    } catch (error) {
      console.error('GET error:', error);
      return res.status(500).json({ error: 'Ошибка чтения из базы: ' + error.message });
    }
  }

  // POST – добавление нового отзыва
  if (req.method === 'POST') {
    try {
      const { name, rating, text, project } = req.body;

      // Проверяем обязательные поля
      if (!rating || !text || !project) {
        return res.status(400).json({ error: 'Заполните все поля: оценка, текст, проект' });
      }

      const newReview = {
        id: Date.now(),
        name: name || 'Аноним',
        rating: parseInt(rating),
        text,
        project,
        date: new Date().toISOString(),
      };

      // Читаем текущий массив
      let currentReviews = (await kv.get('reviews')) || [];
      // Проверяем, не оставлял ли уже этот пользователь отзыв на этот проект
      const exists = currentReviews.some(r => r.name === newReview.name && r.project === newReview.project);
      if (exists) {
        return res.status(400).json({ error: `Вы уже оставили отзыв на проект "${project}"` });
      }

      // Добавляем в начало
      currentReviews.unshift(newReview);
      // Сохраняем обратно
      await kv.set('reviews', currentReviews);

      return res.status(201).json(newReview);
    } catch (error) {
      console.error('POST error:', error);
      // Возвращаем текст ошибки для отладки
      return res.status(500).json({ error: 'Ошибка записи в базу: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}
