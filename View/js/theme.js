const body = document.body;
const toggle = document.querySelector('.theme-toggle');

function applyTheme(theme) {
  body.dataset.theme = theme;

  if (!toggle) return;

  toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  toggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Bytt til lys modus' : 'Bytt til mørk modus'
  );
  toggle.title = theme === 'dark' ? 'Bytt til lys modus' : 'Bytt til mørk modus';

  localStorage.setItem('theme', theme);
}

const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

applyTheme(initialTheme);

const setScrollState = () => {
  body.classList.toggle('scrolled', window.scrollY > 30);
};

setScrollState();
window.addEventListener('scroll', setScrollState, { passive: true });

if (toggle) {
  toggle.addEventListener('click', () => {
    const nextTheme = body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });
}
