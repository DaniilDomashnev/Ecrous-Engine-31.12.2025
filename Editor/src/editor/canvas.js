// ==========================================
// --- Canavs ---
// ==========================================

function initCanvasEvents() {
	// --- DRAG & DROP (Desktop) ---
	canvas.addEventListener('dragover', e => e.preventDefault())
	canvas.addEventListener('drop', e => {
		e.preventDefault()
		const data = e.dataTransfer.getData('text/plain')
		const type = e.dataTransfer.getData('type')
		if (!data) return

		if (
			e.target.tagName === 'INPUT' &&
			e.target.classList.contains('node-input')
		) {
			e.target.value = data
			e.target.dispatchEvent(new Event('input'))
			return
		}

		if (data.startsWith('TEMPLATE:')) {
			instantiateTemplate(data.replace('TEMPLATE:', ''), e.clientX, e.clientY)
		} else if (type === 'variable') {
			// logic for vars
		} else if (!customTemplates[data]) {
			createBlock(data, e.clientX, e.clientY)
		}
	})

	// --- ZOOM & PAN (Desktop Mouse) ---
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

	// ==========================================
	// --- TOUCH HANDLING (MOBILE) ---
	// ==========================================

	let initialPinchDist = 0
	let lastZoom = 1

	canvas.addEventListener(
		'touchstart',
		e => {
			// Если мы в процессе создания нового блока из меню (mobile.js), игнорируем события холста
			if (window.isMobileDraggingNewBlock) return

			if (e.touches.length === 1) {
				// Один палец: Паннинг (сдвиг холста)
				// Но только если мы НЕ попали по блоку и НЕ попали по контролам
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
				// Два пальца: Зум
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

	// ОБРАБОТКА ДВИЖЕНИЯ
	const handleMove = (clientX, clientY, isTouch = false) => {
		const rect = canvas.getBoundingClientRect()
		let rawX = clientX - rect.left
		let rawY = clientY - rect.top

		// --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
		// Раньше тут было rawY -= 80 для всех блоков, и при зуме это давало "километр".
		// Теперь смещение только если мы тянем ПРОВОД (isWiring).
		// Блоки тянутся ровно под пальцем.
		if (isTouch && isWiring) {
			rawY -= 60
		}

		const x = (rawX - panX) / zoomLevel
		const y = (rawY - panY) / zoomLevel

		// 1. Тянем провод
		if (isWiring && tempWireNode) {
			updateTempPath(x, y)
			return
		}

		// 2. Тянем блок
		if (draggedBlock) {
			// Если мы схватили блок за конкретную точку (dragOffset), используем её
			// Иначе (fallback) по центру
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
			handleMove(e.clientX, e.clientY, false) // false = мышь
		}
	})

	document.addEventListener(
		'touchmove',
		e => {
			// Если тащим новый блок из меню, здесь ничего не делаем (обрабатывает mobile.js)
			if (window.isMobileDraggingNewBlock) return

			if (e.touches.length === 1) {
				if (draggedBlock || isWiring) {
					e.preventDefault() // Блокируем скролл страницы
					handleMove(e.touches[0].clientX, e.touches[0].clientY, true) // true = тач
				} else if (isPanning) {
					e.preventDefault() // Блокируем скролл страницы при панорамировании
					panX = e.touches[0].clientX - panStart.x
					panY = e.touches[0].clientY - panStart.y
					updateTransform()
				}
			} else if (e.touches.length === 2) {
				e.preventDefault()

				// --- ZOOM ---
				const dx = e.touches[0].clientX - e.touches[1].clientX
				const dy = e.touches[0].clientY - e.touches[1].clientY
				const dist = Math.sqrt(dx * dx + dy * dy)

				if (initialPinchDist > 0) {
					const scale = dist / initialPinchDist
					let newZoom = lastZoom * scale
					if (newZoom < 0.1) newZoom = 0.1
					if (newZoom > 5) newZoom = 5
					zoomLevel = newZoom
				}

				// --- PAN with 2 fingers ---
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

	const endAction = e => {
		if (isWiring) {
			if (e.changedTouches) {
				const t = e.changedTouches[0]
				const target = document.elementFromPoint(t.clientX, t.clientY)
				// Расширенная зона поиска порта для мобилок
				if (target) {
					// Ищем порт или родителя порта
					const port = target.closest('.port-in')
					if (port) {
						const block = port.closest('.node-block')
						// Подменяем target на порт для корректной отработки endWireDrag
						// (Хак, так как endWireDrag смотрит e.target)
						// Но endWireDrag в editor/connections.js требует переработки под тач
						// Пока вызываем endWireDrag с эмулированным событием
						endWireDrag({ target: port }, block)
						return
					}
				}
			} else {
				// Mouse
				if (e.target.classList.contains('port-in')) {
					const block = e.target.closest('.node-block')
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
	container.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`
	canvas.style.backgroundPosition = `${panX}px ${panY}px`
	const gridSize = 24 * zoomLevel
	canvas.style.backgroundSize = `${gridSize}px ${gridSize}px`
}
