import { Redis } from '@upstash/redis';

// Прямое подключение по REDIS_URL (скопируй свою строку из Vercel)
const kv = new Redis({
  url: 'СЮДА_ВСТАВЬ_REDIS_URL', // например: redis://default:abc123@...upstash.io:6379
  token: '', // оставляем пустым, т.к. пароль уже встроен в URL
});

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET – все отзывы
  if (req.method === 'GET') {
    try {
      const reviews = (await kv.get('reviews')) || [];
      return res.status(200).json(reviews);
    } catch (error) {
      console.error('GET error:', error);
      return res.status(500).json({ error: 'Ошибка чтения: ' + error.message });
    }
  }

  // POST – новый отзыв
  if (req.method === 'POST') {
    try {
      const { name, rating, text, project } = req.body;

      // Проверяем обязательные поля
      if (!name || !rating || !text || !project) {
        return res.status(400).json({ error: 'Заполните все поля: имя, оценка, текст, проект' });
      }

      const ratingNum = parseInt(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
      }

      if (text.length > 1000) {
        return res.status(400).json({ error: 'Текст не должен превышать 1000 символов' });
      }

      const allowedProjects = ['VPN', 'Lynx', 'Quorvox', 'QuorKick', 'QuorStream'];
      if (!allowedProjects.includes(project)) {
        return res.status(400).json({ error: 'Некорректный проект' });
      }

      // Читаем текущий массив
      let currentReviews = (await kv.get('reviews')) || [];

      // Проверка на дубликат (по имени и проекту)
      const exists = currentReviews.some(r => r.name === name && r.project === project);
      if (exists) {
        return res.status(400).json({ error: `Вы уже оставили отзыв на проект "${project}"` });
      }

      // Создаём новый отзыв
      const newReview = {
        id: Date.now(),
        name,
        rating: ratingNum,
        text,
        project,
        date: new Date().toISOString(),
      };

      // Добавляем в начало
      currentReviews.unshift(newReview);
      await kv.set('reviews', currentReviews);

      return res.status(201).json(newReview);
    } catch (error) {
      console.error('POST error:', error);
      // Возвращаем детали ошибки, чтобы видеть в консоли браузера
      return res.status(500).json({ error: 'Ошибка записи: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}
