// editor-training.js — Логика туториала для редактора (ES6, модульный код)

// Массив шагов туториала (все тексты на русском)
const steps = [
	{
		target: null, // Нет подсветки для приветствия
		title: 'Добро пожаловать в редактор Ecrous Engine!',
		text: 'Это ваш первый визит в редактор. Давайте проведём быстрый обзор интерфейса.',
	},
	{
		target: '.brand',
		title: 'Заголовок редактора',
		text: 'Здесь отображается название движка и проекта.',
	},
	{
		target: '.menu-bar',
		title: 'Меню проекта',
		text: 'Используйте это меню для сохранения, экспорта и настроек проекта.',
	},
	{
		target: '.sidebar',
		title: 'Боковая панель',
		text: 'Здесь отображаются сцены, объекты и их свойства.',
	},
	{
		target: '.toolbox',
		title: 'Панель инструментов',
		text: 'Перетаскивайте блоки отсюда на холст для создания логики.',
	},
	{
		target: '.canvas-container',
		title: 'Холст редактора',
		text: 'Основная область для размещения и соединения блоков.',
	},
	{
		target: '.play-btn',
		title: 'Кнопка запуска',
		text: 'Нажмите, чтобы запустить проект в режиме предпросмотра.',
	},
	{
		target: null, // Финальный шаг
		title: 'Готово!',
		text: 'Вы готовы к работе. Создавайте игры в Ecrous Engine!',
	},
]

let currentStep = 0
let overlay, tooltip, highlight

// Проверка и запуск туториала при загрузке
window.addEventListener('DOMContentLoaded', () => {
	if (!localStorage.getItem('editorTutorialCompleted')) {
		initEditorTutorial()
	}
})

// Инициализация элементов туториала
function initEditorTutorial() {
	// Проверка на существование (безопасность)
	if (!document.body) return

	// Создаем overlay
	overlay = document.createElement('div')
	overlay.classList.add('editor-tutorial-overlay')
	document.body.appendChild(overlay)

	// Создаем tooltip
	tooltip = document.createElement('div')
	tooltip.classList.add('editor-tutorial-tooltip')
	tooltip.innerHTML = `
        <h2></h2>
        <p></p>
        <div class="editor-tutorial-buttons"></div>
        <button class="editor-tutorial-btn editor-tutorial-btn-skip">Пропустить обучение</button>
    `
	document.body.appendChild(tooltip)

	// Создаем highlight
	highlight = document.createElement('div')
	highlight.classList.add('editor-tutorial-highlight')
	document.body.appendChild(highlight)

	// Обработчики кнопок
	tooltip
		.querySelector('.editor-tutorial-btn-skip')
		.addEventListener('click', completeEditorTutorial)
	overlay.addEventListener('click', e => {
		if (e.target === overlay) return // Игнор кликов вне тултипа
	})

	// Показываем первый шаг
	showEditorStep(currentStep)
}

// Показ шага
function showEditorStep(stepIndex) {
	const step = steps[stepIndex]
	const buttonsContainer = tooltip.querySelector('.editor-tutorial-buttons')
	buttonsContainer.innerHTML = '' // Очищаем кнопки

	// Обновляем контент (на русском)
	tooltip.querySelector('h2').textContent = step.title
	tooltip.querySelector('p').textContent = step.text

	// Кнопки навигации (на русском)
	if (stepIndex > 0) {
		const prevBtn = document.createElement('button')
		prevBtn.classList.add('editor-tutorial-btn', 'editor-tutorial-btn-prev')
		prevBtn.textContent = 'Назад'
		prevBtn.addEventListener('click', () => navigateEditorStep(-1))
		buttonsContainer.appendChild(prevBtn)
	}

	if (stepIndex < steps.length - 1) {
		const nextBtn = document.createElement('button')
		nextBtn.classList.add('editor-tutorial-btn', 'editor-tutorial-btn-next')
		nextBtn.textContent = 'Далее'
		nextBtn.addEventListener('click', () => navigateEditorStep(1))
		buttonsContainer.appendChild(nextBtn)
	} else {
		const doneBtn = document.createElement('button')
		doneBtn.classList.add('editor-tutorial-btn', 'editor-tutorial-btn-next')
		doneBtn.textContent = 'Завершить'
		doneBtn.addEventListener('click', completeEditorTutorial)
		buttonsContainer.appendChild(doneBtn)
	}

	// Активируем overlay
	overlay.classList.add('active')

	// Подсветка
	if (step.target) {
		const targetElement = document.querySelector(step.target)
		if (targetElement) {
			const rect = targetElement.getBoundingClientRect()
			highlight.style.width = `${Math.min(
				rect.width + 20,
				window.innerWidth - 20
			)}px` // Ограничение по экрану
			highlight.style.height = `${Math.min(
				rect.height + 20,
				window.innerHeight - 20
			)}px`
			highlight.style.top = `${Math.max(10, rect.top - 10)}px` // Не выходит за топ
			highlight.style.left = `${Math.max(10, rect.left - 10)}px` // Не выходит за левый край
			highlight.classList.add('visible')
		}
	} else {
		highlight.classList.remove('visible')
	}

	// Позиционируем тултип (адаптивно)
	positionEditorTooltip(step.target)

	// Анимация появления (fade + slide + scale)
	setTimeout(() => {
		tooltip.classList.add('visible')
	}, 100)
}

// Навигация по шагам
function navigateEditorStep(direction) {
	currentStep += direction
	currentStep = Math.max(0, Math.min(steps.length - 1, currentStep))
	tooltip.classList.remove('visible')
	highlight.classList.remove('visible')
	setTimeout(() => showEditorStep(currentStep), 300) // Задержка для анимации
}

// Позиционирование тултипа (не выходит за экран)
function positionEditorTooltip(targetSelector) {
	if (window.innerWidth <= 768) {
		// Мобильный: фиксировано снизу, центрировано
		tooltip.style.top = 'auto'
		tooltip.style.left = '50%'
		tooltip.style.bottom = '20px'
		tooltip.style.transform = 'translateX(-50%)'
	} else {
		// Десктоп: рядом с target, но с проверкой границ
		if (targetSelector) {
			const target = document.querySelector(targetSelector)
			// --- MINIMAL FIX: Guard against null target to prevent TypeError; fallback to centering if element missing ---
			if (!target) {
				tooltip.style.top = '50%'
				tooltip.style.left = '50%'
				tooltip.style.transform = 'translate(-50%, -50%)'
				return // Early exit to skip rect calculation
			}
			// --- END OF FIX ---
			const rect = target.getBoundingClientRect()
			let top = rect.top + rect.height + 20
			let left = rect.left

			// Проверка границ
			if (top + 200 > window.innerHeight) top = rect.top - 200 // Перемещаем вверх если не помещается
			if (left + 320 > window.innerWidth) left = window.innerWidth - 340 // Сдвигаем влево

			tooltip.style.top = `${top}px`
			tooltip.style.left = `${left}px`
			tooltip.style.transform = 'none'

			// --- MINIMAL ADDED CLAMPING: Dynamically clamp based on actual tooltip size to prevent overflow ---
			// This uses offsetHeight/Width (available after append) for robust, non-magic-number bounding
			const tooltipRect = tooltip.getBoundingClientRect()
			const clampedTop = Math.max(
				0,
				Math.min(top, window.innerHeight - tooltipRect.height)
			)
			const clampedLeft = Math.max(
				0,
				Math.min(left, window.innerWidth - tooltipRect.width)
			)
			tooltip.style.top = `${clampedTop}px`
			tooltip.style.left = `${clampedLeft}px`
			// --- END OF ADDED CLAMPING ---
		} else {
			// Центр если нет target
			tooltip.style.top = '50%'
			tooltip.style.left = '50%'
			tooltip.style.transform = 'translate(-50%, -50%)'
		}
	}
}

// Завершение туториала
function completeEditorTutorial() {
	localStorage.setItem('editorTutorialCompleted', 'true')
	overlay.classList.remove('active')
	tooltip.classList.remove('visible')
	highlight.classList.remove('visible')
	setTimeout(() => {
		if (overlay) document.body.removeChild(overlay)
		if (tooltip) document.body.removeChild(tooltip)
		if (highlight) document.body.removeChild(highlight)
		overlay = null
		tooltip = null
		highlight = null
	}, 300)
}

// Публичная функция для сброса и повторного запуска туториала (без перезагрузки страницы)
window.resetAndStartEditorTraining = function () {
	// Защита от повторного запуска поверх активного туториала
	if (overlay && overlay.classList.contains('active')) {
		return // Уже запущен, игнорируем
	}

	// Сброс состояния в localStorage
	localStorage.removeItem('editorTutorialCompleted')

	// Сброс текущего шага
	currentStep = 0

	// Если элементы туториала уже существуют (например, от предыдущего запуска), удаляем их для чистого перезапуска
	if (overlay) {
		overlay.classList.remove('active')
		document.body.removeChild(overlay)
		overlay = null
	}
	if (tooltip) {
		tooltip.classList.remove('visible')
		document.body.removeChild(tooltip)
		tooltip = null
	}
	if (highlight) {
		highlight.classList.remove('visible')
		document.body.removeChild(highlight)
		highlight = null
	}

	// Запуск туториала заново (с плавной анимацией от initEditorTutorial)
	initEditorTutorial()
}
