// ==========================================
// --- ЛОГИКА ПОДСКАЗОК (TOOLTIPS) ---
// ==========================================

let tooltipTimer = null
const tooltipDelay = 800 // Задержка 0.8 сек перед показом
const tooltipEl = document.getElementById('block-tooltip')

function scheduleTooltip(e, text) {
	// Если текста нет, ничего не делаем
	if (!text) return

	// Очищаем предыдущий таймер, если быстро водили мышкой
	clearTimeout(tooltipTimer)

	// Сохраняем координаты мыши, чтобы позиционировать тултип
	const x = e.clientX
	const y = e.clientY

	tooltipTimer = setTimeout(() => {
		showTooltip(x, y, text)
	}, tooltipDelay)
}

function showTooltip(x, y, text) {
	if (!tooltipEl) return

	tooltipEl.innerText = text
	tooltipEl.classList.remove('hidden')

	// Небольшой reflow, чтобы анимация сработала
	void tooltipEl.offsetWidth
	tooltipEl.classList.add('visible')

	// Позиционируем чуть ниже и правее курсора
	// Проверка, чтобы не вылезло за край экрана
	let top = y + 15
	let left = x + 15

	if (left + 200 > window.innerWidth) left = x - 210
	if (top + 50 > window.innerHeight) top = y - 50

	tooltipEl.style.top = top + 'px'
	tooltipEl.style.left = left + 'px'
}

function hideTooltip() {
	clearTimeout(tooltipTimer)
	if (tooltipEl) {
		tooltipEl.classList.remove('visible')
		// Ждем окончания анимации перед скрытием (опционально)
		setTimeout(() => {
			if (!tooltipEl.classList.contains('visible')) {
				tooltipEl.classList.add('hidden')
			}
		}, 200)
	}
}
