function showNotification(message, icon = 'ri-checkbox-circle-line') {
	// 1. Ищем или создаем контейнер
	let container = document.querySelector('.notification-container')
	if (!container) {
		container = document.createElement('div')
		container.className = 'notification-container'
		document.body.appendChild(container)
	}

	// 2. Создаем уведомление
	const toast = document.createElement('div')
	toast.className = 'toast'
	toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`

	// 3. --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
	// Используем prepend вместо appendChild, чтобы новые были сверху
	container.prepend(toast)
	// --------------------------

	// 4. Удаляем через 3 секунды
	setTimeout(() => {
		toast.style.animation = 'toastSlideOut 0.3s forwards'
		setTimeout(() => toast.remove(), 300)
	}, 3000)
}

// --- Управление модальным окном уведомлений ---

const alertModal = document.getElementById('modal-alert');
const alertTitle = document.getElementById('alert-title');
const alertMessage = document.getElementById('alert-message');

/**
 * Показывает красивое модальное окно вместо alert()
 * @param {string} message - Текст сообщения
 * @param {string} title - Заголовок (по умолчанию "Внимание")
 * @param {string} iconClass - Класс иконки (по умолчанию ri-information-line)
 */
function showCustomAlert(message, title = 'Внимание', iconClass = 'ri-information-line') {
    if (!alertModal) return;

    // Настраиваем содержимое
    alertMessage.innerText = message;
    alertTitle.innerHTML = `<i class="${iconClass}" style="color:var(--accent)"></i> ${title}`;

    // Показываем окно (удаляем hidden, затем добавляем active для анимации)
    alertModal.classList.remove('hidden');
    // Небольшая задержка, чтобы браузер успел отрисовать display:flex перед анимацией opacity
    setTimeout(() => {
        alertModal.classList.add('active');
    }, 10);
}

function closeAlertModal() {
    if (!alertModal) return;

    // Убираем класс активности (запускается анимация исчезновения)
    alertModal.classList.remove('active');

    // Ждем окончания анимации (0.2s в CSS), затем скрываем полностью
    setTimeout(() => {
        alertModal.classList.add('hidden');
    }, 200);
}

// Закрытие по клику вне окна (опционально)
alertModal.addEventListener('click', (e) => {
    if (e.target === alertModal) {
        closeAlertModal();
    }
});
