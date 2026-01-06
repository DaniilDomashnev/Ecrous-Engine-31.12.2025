// ==========================================
// --- МОБИЛЬНАЯ ЛОГИКА (src/core/mobile.js) ---
// ==========================================

// Глобальные переменные для мобильного драга
let isMobileDraggingNewBlock = false

// 1. Управление вкладками
function setMobileTab(tabName) {
	// Сбрасываем активность кнопок
	document
		.querySelectorAll('.mob-nav-btn')
		.forEach(btn => btn.classList.remove('active'))

	const sidebar = document.querySelector('.sidebar')
	const toolbox = document.querySelector('.toolbox')

	// Скрываем всё
	if (sidebar) sidebar.classList.remove('mobile-visible')
	if (toolbox) toolbox.classList.remove('mobile-visible')

	// Показываем нужное
	if (tabName === 'sidebar' && sidebar) sidebar.classList.add('mobile-visible')
	if (tabName === 'toolbox' && toolbox) toolbox.classList.add('mobile-visible')

	// Подсветка кнопок навигации
	const btns = document.querySelectorAll('.mob-nav-btn')
	if (btns.length >= 3) {
		if (tabName === 'canvas') btns[0].classList.add('active')
		if (tabName === 'toolbox') btns[1].classList.add('active')
		if (tabName === 'sidebar') btns[2].classList.add('active')
	}
}

// 2. Полностью переписанная логика Drag & Drop из меню
function attachMobileDrag(el, id, isTemplate) {
	el.style.touchAction = 'pan-y' // Разрешаем только вертикальный скролл браузера

	let dragTimer = null
	let ghost = null
	let startX = 0
	let startY = 0

	// Насколько поднять блок над пальцем, чтобы его было видно
	const VISUAL_OFFSET_Y = 80

	// Обработчик движения по DOCUMENT (чтобы не терять фокус при скрытии меню)
	const onTouchMove = e => {
		if (!ghost) return
		e.preventDefault() // Блокируем скролл всей страницы во время драга
		e.stopPropagation()

		const t = e.touches[0]
		ghost.style.left = t.clientX + 'px'
		ghost.style.top = t.clientY - VISUAL_OFFSET_Y + 'px'
	}

	// Обработчик отпускания по DOCUMENT
	const onTouchEnd = e => {
		// Очищаем слушатели
		document.removeEventListener('touchmove', onTouchMove, { passive: false })
		document.removeEventListener('touchend', onTouchEnd, { passive: false })

		if (ghost) {
			const t = e.changedTouches[0]
			const dropX = t.clientX
			const dropY = t.clientY - VISUAL_OFFSET_Y

			// Удаляем призрак
			ghost.remove()
			ghost = null
			isMobileDraggingNewBlock = false

			// Создаем блок в точке отпускания
			// Небольшая задержка, чтобы UI успел обновиться
			setTimeout(() => {
				if (isTemplate) {
					if (typeof instantiateTemplate === 'function')
						instantiateTemplate(id, dropX, dropY)
				} else {
					if (typeof createBlock === 'function') createBlock(id, dropX, dropY)
				}
			}, 50)
		}
	}

	// Начало касания элемента в меню
	el.addEventListener(
		'touchstart',
		e => {
			const touch = e.touches[0]
			startX = touch.clientX
			startY = touch.clientY

			// Блокируем скролл при начале драга
			document.body.classList.add('dragging-active')

			// Очищаем предыдущий таймер если был
			if (dragTimer) clearTimeout(dragTimer)

			// Запускаем таймер долгого нажатия
			dragTimer = setTimeout(() => {
				// --- НАЧАЛО ДРАГА (спустя 200мс) ---
				isMobileDraggingNewBlock = true

				// 1. Вибрация
				if (navigator.vibrate) navigator.vibrate(50)

				// 2. Создаем призрак
				ghost = document.createElement('div')
				ghost.innerHTML = el.innerHTML // Копируем содержимое (иконку и текст)
				ghost.className = 'tool-item dragging-ghost'
				// Удаляем кнопку удаления из призрака, если есть
				const trash = ghost.querySelector('.ri-delete-bin-line')
				if (trash) trash.remove()

				ghost.style.position = 'fixed'
				ghost.style.left = touch.clientX + 'px'
				ghost.style.top = touch.clientY - VISUAL_OFFSET_Y + 'px'
				ghost.style.width = 'auto'
				ghost.style.height = 'auto'
				ghost.style.pointerEvents = 'none' // Чтобы клики проходили сквозь него
				ghost.style.zIndex = '99999'
				ghost.style.transform = 'translate(-50%, -50%) scale(1.1)'

				document.body.appendChild(ghost)

				// 3. АВТОМАТИЧЕСКИ ПЕРЕКЛЮЧАЕМСЯ НА ХОЛСТ!
				// Это ключевое изменение: меню исчезает, вы видите сцену
				setMobileTab('canvas')

				// 4. Подписываемся на глобальные события движения
				document.addEventListener('touchmove', onTouchMove, { passive: false })
				document.addEventListener('touchend', onTouchEnd, { passive: false })
			}, 200) // 200мс задержка
		},
		{ passive: true }
	)

	// Если палец сдвинулся ДО того как таймер сработал (скролл меню)
	el.addEventListener(
		'touchmove',
		e => {
			if (!dragTimer) return // Таймер уже сработал или отменен

			const t = e.touches[0]
			const dx = Math.abs(t.clientX - startX)
			const dy = Math.abs(t.clientY - startY)

			// Если сдвинули палец больше чем на 10px, считаем это скроллом списка
			if (dx > 10 || dy > 10) {
				clearTimeout(dragTimer)
				dragTimer = null
			}
		},
		{ passive: true }
	)

	// Если отпустили палец ДО срабатывания таймера
	el.addEventListener(
		'touchend',
		() => {
			// Разблокируем скролл
			document.body.classList.remove('dragging-active')
			if (dragTimer) {
				clearTimeout(dragTimer)
				dragTimer = null
			}
		},
		{ passive: true }
	)
}

// 3. ДОЛГОЕ НАЖАТИЕ НА БЛОКИ В СЦЕНЕ (Контекстное меню)
function initMobileLongPress() {
	let timer = null
	let startX = 0
	let startY = 0
	const PRESS_DURATION = 500

	document.addEventListener(
		'touchstart',
		e => {
			if (e.touches.length !== 1) return
			const t = e.touches[0]
			startX = t.clientX
			startY = t.clientY

			const target = document.elementFromPoint(startX, startY)
			// Проверяем, что это блок на сцене
			if (!target || !target.closest('.node-block')) return

			timer = setTimeout(() => {
				if (navigator.vibrate) navigator.vibrate(50)

				const block = target.closest('.node-block')
				if (block) {
					const ev = new MouseEvent('contextmenu', {
						bubbles: true,
						cancelable: true,
						view: window,
						clientX: startX,
						clientY: startY,
					})
					block.dispatchEvent(ev)
				}
			}, PRESS_DURATION)
		},
		{ passive: true }
	)

	const cancel = () => {
		if (timer) {
			clearTimeout(timer)
			timer = null
		}
	}

	document.addEventListener('touchend', cancel)
	document.addEventListener('touchcancel', cancel)
	document.addEventListener(
		'touchmove',
		e => {
			const t = e.touches[0]
			if (
				Math.abs(t.clientX - startX) > 10 ||
				Math.abs(t.clientY - startY) > 10
			) {
				cancel()
			}
		},
		{ passive: true }
	)
}

window.addEventListener('DOMContentLoaded', () => {
	initMobileLongPress()
})
