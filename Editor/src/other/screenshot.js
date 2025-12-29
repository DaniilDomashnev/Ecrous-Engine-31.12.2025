// ==========================================
// --- SCREENSHOT SYSTEM ---
// ==========================================

function openScreenshotModal() {
    const modal = document.getElementById('modal-screenshot');
    const container = document.getElementById('shot-nodes-container');
    
    // 1. Очищаем старое
    container.innerHTML = '';
    
    // 2. Ищем все блоки на сцене
    const originalBlocks = document.querySelectorAll('#canvas-container .node-block');
    
    if (originalBlocks.length === 0) {
        alert("Сцена пуста! Добавьте блоки для фото.");
        return;
    }

    // 3. Вычисляем границы (Bounding Box), чтобы центрировать блоки
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    originalBlocks.forEach(block => {
        // Парсим координаты из style (они там в px)
        const x = parseFloat(block.style.left);
        const y = parseFloat(block.style.top);
        const w = block.offsetWidth;
        const h = block.offsetHeight;

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x + w > maxX) maxX = x + w;
        if (y + h > maxY) maxY = y + h;
    });

    // Добавляем отступы
    const padding = 20; // Внутренний отступ от краев окна кода

    // Задаем размеры контейнера внутри окна
    const totalW = (maxX - minX);
    const totalH = (maxY - minY);
    
    container.style.width = (totalW) + 'px';
    container.style.height = (totalH) + 'px';

    // 4. Клонируем блоки
    originalBlocks.forEach(block => {
        const clone = block.cloneNode(true);
        
        // Пересчитываем координаты относительно начала группы
        const oldX = parseFloat(block.style.left);
        const oldY = parseFloat(block.style.top);
        
        clone.style.left = (oldX - minX) + 'px';
        clone.style.top = (oldY - minY) + 'px';
        
        // Убираем лишние классы выделения если есть
        clone.classList.remove('selected');
        
        container.appendChild(clone);
    });

    // 5. Показываем окно
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeScreenshotModal() {
    const modal = document.getElementById('modal-screenshot');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

// Смена фона
function setShotBg(bgValue) {
    document.getElementById('shot-bg').style.background = bgValue;
}

// Скачивание
function downloadScreenshot() {
    const element = document.getElementById('screenshot-capture-area');
    const btn = document.querySelector('#modal-screenshot .primary');
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Обработка...';

    // Используем html2canvas
    html2canvas(element, {
        backgroundColor: null, // Прозрачный фон вокруг
        scale: 2, // Высокое качество (Retina)
        logging: false,
        useCORS: true
    }).then(canvas => {
        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        link.download = `Ecrous_Shot_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        btn.innerHTML = originalText;
    });
}
