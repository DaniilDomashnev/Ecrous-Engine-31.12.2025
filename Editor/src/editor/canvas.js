// ==========================================
// --- Canavs ---
// ==========================================

function initCanvasEvents() {
	canvas.addEventListener('dragover', e => e.preventDefault())
	canvas.addEventListener('drop', e => {
		e.preventDefault()
		const data = e.dataTransfer.getData('text/plain')
		const type = e.dataTransfer.getData('type')

		if (!data) return

		// --- 1. ЕСЛИ БРОСИЛИ В ИНПУТ (Scratch Style) ---
		if (
			e.target.tagName === 'INPUT' &&
			e.target.classList.contains('node-input')
		) {
			e.target.value = data // Вставляем "{score}" прямо в поле
			// Вызываем событие input, чтобы сохранить изменение в DOM (если есть listener)
			e.target.dispatchEvent(new Event('input'))
			return
		}

		// --- 2. ЕСЛИ БРОСИЛИ ПРОСТО НА ПОЛЕ ---
		if (data.startsWith('TEMPLATE:')) {
			instantiateTemplate(data.replace('TEMPLATE:', ''), e.clientX, e.clientY)
		}
		// Если это переменная, создадим блок "Получить переменную" (опционально)
		else if (type === 'variable') {
			// Можно автоматически создать блок log_print с этой переменной или get_var
			// Пока просто игнорируем или можно сделать alert("Бросьте переменную в поле ввода!")
		} else if (!customTemplates[data]) {
			// Обычный блок
			createBlock(data, e.clientX, e.clientY)
		}
	})

	// --- МЫШЬ (ПК) ---
	canvas.addEventListener(
		'wheel',
		e => {
			e.preventDefault()
			const zoomSensitivity = 0.001
			const delta = -e.deltaY * zoomSensitivity
			let newZoom = zoomLevel + delta
			if (newZoom < 0.1) newZoom = 0.1
			if (newZoom > 5) newZoom = 5

			const rect = canvas.getBoundingClientRect()
			const mouseX = e.clientX - rect.left
			const mouseY = e.clientY - rect.top

			panX = mouseX - (mouseX - panX) * (newZoom / zoomLevel)
			panY = mouseY - (mouseY - panY) * (newZoom / zoomLevel)

			zoomLevel = newZoom
			updateTransform()
			if (editorMode === 'nodes') updateAllConnections()
		},
		{ passive: false }
	)

	canvas.addEventListener('mousedown', e => {
		if (e.target.classList.contains('connection-wire')) return
		if (e.target.closest('.canvas-controls')) return
		if (
			e.target === canvas ||
			e.target === container ||
			e.target.id === 'connections-layer'
		) {
			isPanning = true
			panStart = { x: e.clientX - panX, y: e.clientY - panY }
			canvas.style.cursor = 'grabbing'
		}
	})

	// --- СЕНСОР (ТЕЛЕФОН) ---
	let initialPinchDist = 0
	let lastZoom = 1

	canvas.addEventListener(
		'touchstart',
		e => {
			// Если коснулись пустого места - начинаем двигать камеру
			if (e.touches.length === 1) {
				// Проверяем, что не попали по блоку (блоки обрабатывают себя сами)
				if (
					!e.target.closest('.node-block') &&
					!e.target.closest('.canvas-controls')
				) {
					isPanning = true
					panStart = {
						x: e.touches[0].clientX - panX,
						y: e.touches[0].clientY - panY,
					}
				}
			} else if (e.touches.length === 2) {
				// Два пальца - зум
				isPanning = true
				const dx = e.touches[0].clientX - e.touches[1].clientX
				const dy = e.touches[0].clientY - e.touches[1].clientY
				initialPinchDist = Math.sqrt(dx * dx + dy * dy)
				lastZoom = zoomLevel

				const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
				const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
				panStart = { x: centerX - panX, y: centerY - panY }
			}
		},
		{ passive: false }
	)

	// Настройка смещения для мобилок (чтобы видеть блок НАД пальцем)
	// Можно вынести это в настройки проекта в будущем
	const MOBILE_DRAG_OFFSET_Y = 80 // Пикселей вверх

	// ГЛОБАЛЬНОЕ ДВИЖЕНИЕ (И мышь, и палец)
	const handleMove = (clientX, clientY, isTouch = false) => {
		const rect = canvas.getBoundingClientRect()

		// Корректируем координаты
		let rawX = clientX - rect.left
		let rawY = clientY - rect.top

		// Если это тач - поднимаем точку выше, чтобы блок был над пальцем
		if (isTouch) {
			rawY -= MOBILE_DRAG_OFFSET_Y
		}

		// Переводим в координаты канваса с учетом зума и панорамирования
		const x = (rawX - panX) / zoomLevel
		const y = (rawY - panY) / zoomLevel

		// 1. Тянем провод
		if (isWiring && tempWireNode) {
			updateTempPath(x, y)
			return
		}

		// 2. Тянем блок
		if (draggedBlock) {
			// dragOffset - это смещение внутри самого блока (за что взяли)
			// Если dragOffset не задан (новый блок), ставим по центру
			const offsetX = dragOffset ? dragOffset.x : draggedBlock.offsetWidth / 2
			const offsetY = dragOffset ? dragOffset.y : draggedBlock.offsetHeight / 2

			draggedBlock.style.left = x - offsetX + 'px'
			draggedBlock.style.top = y - offsetY + 'px'

			if (editorMode === 'nodes') updateAllConnections()
			return
		}
	}

	document.addEventListener('mousemove', e => {
		if (isPanning) {
			panX = e.clientX - panStart.x
			panY = e.clientY - panStart.y
			updateTransform()
		} else {
        handleMove(e.clientX, e.clientY, false); // false = это мышь
    }
	})

	document.addEventListener(
		'touchmove',
		e => {
			if (e.touches.length === 1) {
				if (draggedBlock || isWiring) {
					e.preventDefault() // Чтобы не тянуть страницу пока тянем блок
					handleMove(e.touches[0].clientX, e.touches[0].clientY)
				} else if (isPanning) {
					panX = e.touches[0].clientX - panStart.x
					panY = e.touches[0].clientY - panStart.y
					updateTransform()
				}
			} else if (e.touches.length === 2) {
				e.preventDefault()
				// ЗУМ
				const dx = e.touches[0].clientX - e.touches[1].clientX
				const dy = e.touches[0].clientY - e.touches[1].clientY
				const dist = Math.sqrt(dx * dx + dy * dy)

				if (initialPinchDist > 0) {
					const scale = dist / initialPinchDist
					zoomLevel = Math.min(Math.max(lastZoom * scale, 0.1), 5)
				}

				// ПАН (центр щипка)
				const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
				const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
				panX = cx - panStart.x
				panY = cy - panStart.y

				updateTransform()
				if (editorMode === 'nodes') updateAllConnections()
			}
		},
		{ passive: false }
	)

	// ЗАВЕРШЕНИЕ ДЕЙСТВИЙ
	const endAction = e => {
		if (isWiring) {
			// Если это TouchEnd, нужно найти элемент под пальцем
			if (e.changedTouches) {
				const t = e.changedTouches[0]
				const target = document.elementFromPoint(t.clientX, t.clientY)
				if (target && target.classList.contains('port-in')) {
					const block = target.closest('.node-block')
					endWireDrag(e, block)
					return
				}
			}
			cancelWiring()
		}

		if (draggedBlock) {
			if (editorMode === 'stack') checkMagnet(draggedBlock)
			draggedBlock.classList.remove('dragging')
			draggedBlock = null
		}
		isPanning = false
		canvas.style.cursor = 'default'
	}

	document.addEventListener('mouseup', endAction)
	document.addEventListener('touchend', endAction)
}
function updateTransform() {
	// Применяем смещение и масштаб
	container.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`

	// Обновляем позицию сетки фона
	canvas.style.backgroundPosition = `${panX}px ${panY}px`

	// Масштабируем саму сетку, чтобы создать эффект глубины
	// Базовый размер сетки был 24px (из CSS), умножаем его на зум
	const gridSize = 24 * zoomLevel
	canvas.style.backgroundSize = `${gridSize}px ${gridSize}px`
}
