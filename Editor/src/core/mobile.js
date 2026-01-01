// ==========================================
// --- МОБИЛЬНАЯ ЛОГИКА (src/core/mobile.js) ---
// ==========================================

// 1. Управление вкладками (которое мы делали раньше)
function setMobileTab(tabName) {
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

	// Подсветка кнопок
	const btns = document.querySelectorAll('.mob-nav-btn')
	if (btns.length >= 3) {
		if (tabName === 'canvas') btns[0].classList.add('active')
		if (tabName === 'toolbox') btns[1].classList.add('active')
		if (tabName === 'sidebar') btns[2].classList.add('active')
	}
}

// 2. Исправление добавления блоков (Touch Drag из тулбокса)
function attachMobileDrag(el, id, isTemplate) {
    el.style.touchAction = 'none'; // Важно для отключения жестов браузера

    el.addEventListener(
        'touchstart',
        e => {
            // Полная блокировка скролла и зума браузера
            e.preventDefault()
            e.stopPropagation()

            const touch = e.touches[0]
            const ghost = document.createElement('div')

            // Стилизация призрака
            ghost.innerText = el.innerText
            ghost.className = 'tool-item dragging-ghost'
            ghost.style.position = 'fixed'
            // СМЕЩЕНИЕ: Поднимаем блок на 70px выше пальца, чтобы видеть, куда ставим
            const Y_OFFSET = 70 
            ghost.style.left = touch.clientX + 'px'
            ghost.style.top = (touch.clientY - Y_OFFSET) + 'px'
            
            ghost.style.transform = 'translate(-50%, -50%) scale(1.1)'
            ghost.style.opacity = '0.9'
            ghost.style.pointerEvents = 'none'
            ghost.style.zIndex = '10000'
            ghost.style.background = '#333'
            ghost.style.color = '#fff'
            ghost.style.border = '2px solid var(--accent)' // Жирнее рамка для видимости
            ghost.style.padding = '8px 12px'
            ghost.style.borderRadius = '8px'
            ghost.style.boxShadow = '0 10px 20px rgba(0,0,0,0.5)'

            document.body.appendChild(ghost)

            let isDragging = true

            const moveHandler = tm => {
                if (isDragging) {
                    // Блокируем всё, чтобы экран не ехал
                    tm.preventDefault() 
                    tm.stopPropagation()
                    
                    const t = tm.touches[0]
                    ghost.style.left = t.clientX + 'px'
                    ghost.style.top = (t.clientY - Y_OFFSET) + 'px' // Сохраняем смещение
                }
            }

            const endHandler = te => {
                document.removeEventListener('touchmove', moveHandler)
                document.removeEventListener('touchend', endHandler)

                if (isDragging && ghost) {
                    // Получаем координаты пальца
                    const t = te.changedTouches[0]
                    const x = t.clientX
                    // Важно: при создании блока учитываем тот же офсет, 
                    // чтобы блок появился там, где был "призрак", а не под пальцем
                    const y = t.clientY - Y_OFFSET 

                    ghost.remove()

                    // Переключаемся на Canvas
                    if (typeof setMobileTab === 'function') {
                        setMobileTab('canvas')
                    }

                    setTimeout(() => {
                        if (isTemplate) {
                            if (typeof instantiateTemplate === 'function')
                                instantiateTemplate(id, x, y)
                        } else {
                            if (typeof createBlock === 'function') 
                                createBlock(id, x, y)
                        }
                    }, 50)
                }
                isDragging = false
            }

            document.addEventListener('touchmove', moveHandler, { passive: false })
            document.addEventListener('touchend', endHandler, { passive: false })
        },
        { passive: false }
    )
}

// 3. ДОЛГОЕ НАЖАТИЕ (ПКМ НА ТЕЛЕФОНЕ)
function initMobileLongPress() {
	let timer = null
	let startX = 0
	let startY = 0
	const PRESS_DURATION = 500 // 0.5 секунды для срабатывания

	// Следим за нажатиями во всем документе, но реагируем только на блоки
	document.addEventListener(
		'touchstart',
		e => {
			// Если нажали не одним пальцем - игнор
			if (e.touches.length !== 1) return

			const t = e.touches[0]
			startX = t.clientX
			startY = t.clientY

			// Ищем, нажали ли мы на блок
			const target = document.elementFromPoint(startX, startY)
			if (!target || !target.closest('.node-block')) return // Если не блок, выходим

			// Запускаем таймер
			timer = setTimeout(() => {
				// Таймер сработал!

				// 1. Вибрация для обратной связи
				if (navigator.vibrate) navigator.vibrate(50)

				// 2. Имитируем событие contextmenu
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

	// Функция отмены таймера (если палец убрали или сдвинули)
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
			// Если палец сдвинулся больше чем на 10 пикселей - это свайп, а не клик
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

// Автозапуск при загрузке
window.addEventListener('DOMContentLoaded', () => {
	initMobileLongPress()
})
