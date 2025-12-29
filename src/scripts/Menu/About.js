function openAbout() {
	const panel = document.getElementById('aboutPanel')
	if (!panel) return

	// Используем существующую логику оверлея, если она есть в main.js или thanks.js
	// Если нет, просто блокируем скролл
	try {
		document.documentElement.style.overflow = 'hidden'
	} catch (e) {}

	panel.style.display = 'flex'
}

function closeAbout() {
	const panel = document.getElementById('aboutPanel')
	if (!panel) return

	// Анимация исчезновения (опционально, можно просто скрыть)
	panel.style.animation = 'fadeOut 0.3s forwards'

	setTimeout(() => {
		panel.style.display = 'none'
		panel.style.animation = '' // Сброс анимации для следующего открытия
		document.documentElement.style.overflow = ''
	}, 300)
}

// Добавим CSS анимацию исчезновения в JS или CSS
const styleSheet = document.createElement('style')
styleSheet.innerText = `
@keyframes fadeOut {
    from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    to { opacity: 0; transform: translate(-50%, -45%) scale(0.95); }
}`
document.head.appendChild(styleSheet)
