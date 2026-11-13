(() => {
  const form = document.getElementById('setup-passport');
  if (!form) return;
  form.querySelector('button[type="submit"]').disabled = false;
  const fields = [
    ['task', 'Задача и ожидаемый результат'], ['tool', 'Основной инструмент'],
    ['model', 'Модель и подключение'], ['runtime', 'Где выполняется работа'],
    ['context', 'Где лежат файлы и инструкции'], ['budget', 'Бюджет и лимиты'],
    ['fallback', 'Запасной вариант'], ['check', 'Как проверю результат'],
    ['open', 'Что ещё не проверено'],
  ];
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = 'Паспорт моего ИИ-сетапа\n\n' + fields.map(([name, label]) =>
      label + '\n' + (form.elements[name].value.trim() || 'Не заполнено')
    ).join('\n\n') + '\n\nАртефакты · https://ai.madzhitov.ru/znaniya/ai-setup.html\n';
    const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'moy-ai-setup.txt';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    document.getElementById('setup-export-status').textContent = 'Файл подготовлен. Если браузер запросит разрешение на скачивание, подтвердите его.';
  });
})();
