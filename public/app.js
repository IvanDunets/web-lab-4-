const form = document.getElementById('userForm');
const responseBox = document.getElementById('responseBox');
const sessionInfo = document.getElementById('sessionInfo');
const localInfo = document.getElementById('localInfo');
const clearStorageBtn = document.getElementById('clearStorageBtn');

// Ініціалізація сесії вкладки у sessionStorage
if (!sessionStorage.getItem('sessionStartedAt')) {
  sessionStorage.setItem('sessionStartedAt', new Date().toLocaleTimeString());
  sessionStorage.setItem('submissionsCount', '0');
}

// Оновлення інформації про стан сховищ на екрані
function renderStorageState() {
  const started = sessionStorage.getItem('sessionStartedAt');
  const count = sessionStorage.getItem('submissionsCount') || '0';
  sessionInfo.textContent = `активна з ${started} (відправок у сесії: ${count})`;

  const savedProfile = localStorage.getItem('savedUserProfile');
  if (savedProfile) {
    const parsed = JSON.parse(savedProfile);
    localInfo.textContent = `${parsed.username} (${parsed.email})`;
  } else {
    localInfo.textContent = 'Відсутній';
  }
}

// Відновлення даних із localStorage при завантаженні сторінки
function restoreFormFromLocalStorage() {
  const savedProfile = localStorage.getItem('savedUserProfile');
  if (savedProfile) {
    const data = JSON.parse(savedProfile);
    document.getElementById('username').value = data.username || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('age').value = data.age || '';
  }
}

restoreFormFromLocalStorage();
renderStorageState();

// Обробка відправки форми
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    username: document.getElementById('username').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    age: document.getElementById('age').value,
    comment: document.getElementById('comment').value
  };

  // Збереження неконфіденційних даних у localStorage (пароль не зберігається з міркувань безпеки!)
  if (document.getElementById('rememberMe').checked) {
    localStorage.setItem(
      'savedUserProfile',
      JSON.stringify({ username: payload.username, email: payload.email, age: payload.age })
    );
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    // Оновлення лічильника сесії у sessionStorage
    const currentCount = Number(sessionStorage.getItem('submissionsCount') || 0) + 1;
    sessionStorage.setItem('submissionsCount', String(currentCount));
    renderStorageState();

    responseBox.classList.remove('hidden', 'success', 'error');

    if (res.ok) {
      responseBox.classList.add('success');
      responseBox.innerHTML = `
        <strong>Успішно!</strong> ${result.message}<br>
        <small>ID: ${result.user.id} | Санітизований коментар: ${result.user.comment || '—'}</small>
      `;
      document.getElementById('password').value = ''; // Очищення поля пароля
    } else {
      responseBox.classList.add('error');
      responseBox.innerHTML = `<strong>Помилка валідації:</strong><ul>${result.errors
        .map((err) => `<li>${err}</li>`)
        .join('')}</ul>`;
    }
  } catch (err) {
    responseBox.classList.remove('hidden', 'success');
    responseBox.classList.add('error');
    responseBox.textContent = 'Помилка з’єднання із сервером.';
  }
});

// Очищення localStorage та sessionStorage
clearStorageBtn.addEventListener('click', () => {
  localStorage.removeItem('savedUserProfile');
  sessionStorage.clear();
  form.reset();
  responseBox.classList.add('hidden');
  sessionInfo.textContent = 'Очищено (оновіть сторінку для нової сесії)';
  localInfo.textContent = 'Відсутній';
});