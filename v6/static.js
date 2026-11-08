// Общие действия статичных страниц. Основной текст и ссылки работают без JavaScript.
document.addEventListener('click', async (event) => {
  const serviceLink = event.target.closest('.st-summary a[href^="#service-"]');
  if (serviceLink) {
    const card = document.querySelector(serviceLink.hash);
    if (card && card.hidden) document.querySelector('.tl-chip[data-task="все"]')?.click();
  }
  const button = event.target.closest('button[data-copy]');
  if (!button) return;
  const source = document.getElementById(button.dataset.copy);
  if (!source) return;
  try {
    await navigator.clipboard.writeText(source.textContent);
    button.textContent = 'Скопировано';
    button.setAttribute('aria-live', 'polite');
  } catch (_) {
    const range = document.createRange();
    range.selectNodeContents(source);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    button.textContent = 'Выделено: скопируйте вручную';
  }
});
