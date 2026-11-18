const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 4000;

// 1. Базові принципи безпеки: захисні HTTP-заголовки
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10kb' })); // Обмеження розміру тіла запиту
app.use(express.static(path.join(__dirname, 'public')));

// Імітація сховища зареєстрованих користувачів у пам'яті сервера
const usersDatabase = [];

// Тимчасове сховище для обмеження частоти запитів (Rate Limiting)
const requestCounts = new Map();

// 2. Функція санітизації тексту (захист від XSS-атак)
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// 3. Криптографічне хешування пароля із сіллю (ніколи не зберігаємо паролі у відкритому вигляді)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// Middleware для захисту від спаму / брутфорсу (не більше 10 запитів на хвилину з однієї IP)
function rateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const record = requestCounts.get(ip) || { count: 0, startTime: now };

  if (now - record.startTime > 60000) {
    record.count = 1;
    record.startTime = now;
  } else {
    record.count += 1;
  }
  requestCounts.set(ip, record);

  if (record.count > 10) {
    return res.status(429).json({
      success: false,
      errors: ['Забагато запитів. Спробуйте повторити спробу через 1 хвилину.']
    });
  }
  next();
}

// 4. Ендпоінт прийому, валідації та обробки даних форми
app.post('/api/register', rateLimiter, (req, res) => {
  const { username, email, password, age, comment } = req.body;
  const errors = [];

  // Валідація імені користувача
  const cleanUsername = sanitizeInput(username);
  if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 30) {
    errors.push('Ім’я користувача має містити від 3 до 30 символів.');
  }

  // Валідація електронної пошти
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!emailRegex.test(cleanEmail)) {
    errors.push('Вкажіть коректну адресу електронної пошти.');
  }

  // Валідація пароля
  if (typeof password !== 'string' || password.length < 8) {
    errors.push('Пароль повинен містити щонайменше 8 символів.');
  }

  // Валідація віку
  const numericAge = Number(age);
  if (!Number.isInteger(numericAge) || numericAge < 14 || numericAge > 120) {
    errors.push('Вік має бути цілим числом у діапазоні від 14 до 120 років.');
  }

  // Перевірка унікальності email
  if (usersDatabase.some((u) => u.email === cleanEmail)) {
    errors.push('Користувач із такою електронною поштою вже зареєстрований.');
  }

  // Якщо виявлено помилки валідації — повертаємо статус 400 Bad Request
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  // Безпечне збереження даних (пароль у хешованому вигляді, коментар — санітизований)
  const newUser = {
    id: crypto.randomUUID(),
    username: cleanUsername,
    email: cleanEmail,
    passwordHash: hashPassword(password),
    age: numericAge,
    comment: sanitizeInput(comment),
    createdAt: new Date().toISOString()
  };

  usersDatabase.push(newUser);

  // Повертаємо відповідь клієнту (без передачі хешу пароля назад!)
  res.status(201).json({
    success: true,
    message: 'Дані успішно пройшли валідацію та збережені на сервері.',
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      age: newUser.age,
      comment: newUser.comment,
      createdAt: newUser.createdAt
    }
  });
});

app.listen(PORT, () => {
  console.log(`Сервер Лабораторної роботи №4 запущено: http://localhost:${PORT}`);
});