function createBlock(typeId, clientX, clientY, restoreData = null) {
	const def = BLOCK_DEFINITIONS.find(b => b.id === typeId)
	if (!def) return

	const el = document.createElement('div')
	el.className = 'node-block'
	el.dataset.type = typeId
	if (restoreData && restoreData.id) el.id = restoreData.id
	else el.id = 'blk_' + Date.now() + Math.random().toString(36).substr(2, 5)

	el.dataset.category = def.category

	if (restoreData) {
		el.style.left = restoreData.x + 'px'
		el.style.top = restoreData.y + 'px'
	} else {
		const rect = canvas.getBoundingClientRect()
		el.style.left = (clientX - rect.left - panX) / zoomLevel + 'px'
		el.style.top = (clientY - rect.top - panY) / zoomLevel + 'px'
	}

	// --- ГЕНЕРАЦИЯ HTML ДЛЯ ВХОДОВ (INPUTS) ---
	let inputsHTML = ''
	if (def.inputs) {
		def.inputs.forEach((inp, idx) => {
			let val = inp.default
			if (
				restoreData &&
				restoreData.values &&
				restoreData.values[idx] !== undefined
			) {
				val = restoreData.values[idx]
			}

			// ОПРЕДЕЛЯЕМ, ЦВЕТ ЛИ ЭТО
			const isColor =
				inp.type === 'color' ||
				(inp.label && inp.label.toLowerCase().includes('цвет')) ||
				(typeof inp.default === 'string' && inp.default.startsWith('#'))

			if (isColor) {
				// ВАРИАНТ 1: ЦВЕТОВОЙ ПИКЕР
				inputsHTML += `
                <div class="input-row">
                    <span>${inp.label || inp.name}</span>
                    <div class="color-input-container">
                        <div class="color-swatch-btn" 
                             style="background-color: ${val}" 
                             id="swatch_${el.id}_${idx}"></div>
                        <input type="text" class="node-input" 
                               value="${val}" 
                               id="inp_${el.id}_${idx}"
                               onchange="document.getElementById('swatch_${
																	el.id
																}_${idx}').style.backgroundColor = this.value">
                    </div>
                </div>`
			}
			// --- НОВОЕ: МНОГОСТРОЧНОЕ ПОЛЕ ДЛЯ КОДА ---
			else if (inp.type === 'textarea') {
				inputsHTML += `
                <div class="input-row" style="flex-direction:column; align-items:flex-start; gap:5px;">
                    <span style="opacity:0.7; font-size:10px;">${
											inp.label || inp.name
										}</span>
                    <textarea class="node-input" rows="3" 
                              style="width:100%; min-width:180px; font-family:'Courier New', monospace; font-size:11px; background:rgba(0,0,0,0.3); border:1px solid var(--border); color:#a5d6a7; resize:vertical; border-radius:4px; padding:5px;"
                              oninput="this.innerHTML = this.value">${val}</textarea>
                </div>`
			} else if (inp.type === 'select') {
				let optionsHtml = ''
				if (inp.options) {
					inp.options.forEach(opt => {
						const selected = opt === val ? 'selected' : ''
						optionsHtml += `<option value="${opt}" ${selected}>${opt}</option>`
					})
				}
				inputsHTML += `
                <div class="input-row">
                    <span>${inp.label || inp.name}</span>
                    <div class="select-wrapper">
                        <select class="node-input" onchange="this.setAttribute('value', this.value)">
                            ${optionsHtml}
                        </select>
                        <i class="ri-arrow-down-s-line"></i>
                    </div>
                </div>`
			}
			else {
				// ВАРИАНТ 2: ОБЫЧНЫЙ ТЕКСТОВЫЙ ВВОД + РЕДАКТОР ФОРМУЛ

				// Генерируем уникальный ID
				const inputId = `inp_${el.id}_${idx}`

				inputsHTML += `
				<div class="input-row">
						<span>${inp.label || inp.name}</span>
						<div style="position:relative; flex:1;">
								<input type="text" class="node-input" value="${val}" id="${inputId}">
								<div class="formula-trigger" 
										onclick="window.FormulaEditor.open(document.getElementById('${inputId}'))">
										fx
								</div>
						</div>
				</div>`
			}
    })
	}

	el.innerHTML = `<div class="node-header" style="border-left: 4px solid ${def.color}"><div style="display:flex; align-items:center; gap:8px;"><i class="${def.icon}"></i> <span>${def.label}</span></div><i class="ri-close-line action-close"></i></div><div class="node-content">${inputsHTML}</div><div class="node-port port-in" title="Вход"></div><div class="node-port port-out" title="Выход"></div>`
	container.appendChild(el)

	// === ЛОГИКА СВОРАЧИВАНИЯ ===
	if (def.category === 'Группы' || def.category === 'События') {
		const header = el.querySelector('.node-header > div')
		const btn = document.createElement('div')
		btn.className = 'toggle-btn'
		btn.innerHTML = '<i class="ri-arrow-down-s-line"></i>'
		btn.onmousedown = e => {
			e.stopPropagation()
			toggleBlockCollapse(el, btn)
		}
		header.appendChild(btn)
	}

	if (restoreData) {
		if (restoreData.collapsed)
			toggleBlockCollapse(el, el.querySelector('.toggle-btn'), true)
		if (restoreData.disabled) el.classList.add('disabled')
	}

	// --- ПОДСКАЗКИ ---
	el.addEventListener('mouseenter', e => {
		if (draggedBlock) return
		const blockDef = BLOCK_DEFINITIONS.find(b => b.id === typeId)
		if (blockDef && blockDef.desc) {
			scheduleTooltip(e, blockDef.desc)
		}
	})
	el.addEventListener('mouseleave', hideTooltip)
	el.addEventListener('mousedown', hideTooltip)

	// --- СОБЫТИЯ ДЛЯ БЛОКА ---
	el.querySelector('.action-close').onclick = () => removeBlock(el.id)
	el.querySelector('.node-header').addEventListener('mousedown', e => {
		if (e.target.classList.contains('action-close')) return
		if (e.target.closest('.toggle-btn')) return // Не тащим за стрелочку
		draggedBlock = el
		el.classList.add('dragging')
		const r = el.getBoundingClientRect()
		dragOffset = {
			x: (e.clientX - r.left) / zoomLevel,
			y: (e.clientY - r.top) / zoomLevel,
		}
	})

	const pOut = el.querySelector('.port-out')
	const pIn = el.querySelector('.port-in')
	pOut.addEventListener('mousedown', e => startWireDrag(e, el))
	pIn.addEventListener('mouseup', e => endWireDrag(e, el))

	if (typeof attachMobileWiring === 'function') {
		attachMobileWiring(el)
	}

	// --- ИНИЦИАЛИЗАЦИЯ COLOR PICKER (СОБЫТИЯ) ---
	if (def.inputs) {
		def.inputs.forEach((inp, idx) => {
			const isColor =
				inp.type === 'color' ||
				(inp.label && inp.label.toLowerCase().includes('цвет')) ||
				(typeof inp.default === 'string' && inp.default.startsWith('#'))

			if (isColor) {
				const swatch = el.querySelector(`#swatch_${el.id}_${idx}`)
				const input = el.querySelector(`#inp_${el.id}_${idx}`)

				if (swatch && input) {
					// Открытие пикера
					const openHandler = e => {
						e.stopPropagation() // Не тащим блок
						e.preventDefault() // Не фокусируем лишнее
						if (window.ColorPicker) {
							window.ColorPicker.open(input, swatch)
						}
					}

					swatch.addEventListener('mousedown', openHandler)
					swatch.addEventListener('touchstart', openHandler, {
						passive: false,
					})
				}
			}
		})
	}

	// === МОБИЛЬНОЕ ПЕРЕТАСКИВАНИЕ (ИСПРАВЛЕННАЯ ЛОГИКА) ===
	const header = el.querySelector('.node-header')
	header.addEventListener(
		'touchstart',
		e => {
			if (e.target.classList.contains('action-close')) return
			if (e.target.closest('.toggle-btn')) return

			e.preventDefault()
			e.stopPropagation()

			draggedBlock = el
			el.classList.add('dragging')

			const t = e.touches[0]

			// --- ИСПРАВЛЕНИЕ: Используем canvas (вьюпорт), а не container ---
			const canvasRect = canvas.getBoundingClientRect() // Статичная рамка

			// Текущие координаты пальца в мире (с учетом зума и пана)
			// Формула: (ЭкранныеКоординаты - СдвигПана) / Зум
			const worldFingerX = (t.clientX - canvasRect.left - panX) / zoomLevel
			const worldFingerY = (t.clientY - canvasRect.top - panY) / zoomLevel

			// Текущие координаты блока (они уже в мире, так как это style.left/top)
			// Но style.left это строка "100px", парсим её:
			const blockX = parseFloat(el.style.left) || 0
			const blockY = parseFloat(el.style.top) || 0

			// Смещение хвата (разница между пальцем и углом блока)
			dragOffset = {
				x: worldFingerX - blockX,
				y: worldFingerY - blockY,
			}

			const touchMoveBlock = tm => {
				if (!draggedBlock) return
				tm.preventDefault()
				tm.stopPropagation()

				const t = tm.touches[0]
				const canvasRect = canvas.getBoundingClientRect() // Пересчитываем, вдруг ресайз окна

				let zoom = window.zoomLevel || 1
				if (zoom < 0.1) zoom = 0.1

				// --- ИСПРАВЛЕНИЕ: Правильная математика координат ---
				// 1. Получаем X пальца относительно левого края вьюпорта
				const rawX = t.clientX - canvasRect.left
				const rawY = t.clientY - canvasRect.top

				// 2. Переводим в мировые координаты (обратная матрица трансформации)
				const worldX = (rawX - panX) / zoom
				const worldY = (rawY - panY) / zoom

				// 3. Применяем смещение хвата
				const newX = worldX - dragOffset.x
				const newY = worldY - dragOffset.y

				draggedBlock.style.left = newX + 'px'
				draggedBlock.style.top = newY + 'px'

				if (typeof updateAllConnections === 'function') updateAllConnections()
			}

			const touchEndBlock = () => {
				document.removeEventListener('touchmove', touchMoveBlock)
				document.removeEventListener('touchend', touchEndBlock)

				if (draggedBlock) {
					draggedBlock.classList.remove('dragging')
					if (typeof checkMagnet === 'function') checkMagnet(draggedBlock)
					if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace()
					draggedBlock = null
				}
			}

			document.addEventListener('touchmove', touchMoveBlock, { passive: false })
			document.addEventListener('touchend', touchEndBlock)
		},
		{ passive: false }
	)

	// === МОБИЛЬНЫЕ ПРОВОДА ===
	const portOut = el.querySelector('.port-out')
	portOut.addEventListener(
		'touchstart',
		e => {
			e.preventDefault()
			e.stopPropagation()
			isWiring = true
			wireStartBlock = el
			const svg = document.getElementById('connections-layer')
			tempWireNode = document.createElementNS(
				'http://www.w3.org/2000/svg',
				'path'
			)
			tempWireNode.setAttribute('class', 'connection-wire')
			svg.appendChild(tempWireNode)
			const p = getPortPosition(el, 'out')
			updateTempPath(p.x, p.y)
		},
		{ passive: false }
	)
}
function removeBlock(id) {
	const el = document.getElementById(id)
	if (!el) return
	connections = connections.filter(c => c.from !== id && c.to !== id)
	el.remove()
	updateAllConnections()
}
function checkMagnet(current) {
	const blocks = document.querySelectorAll('.node-block')
	const cR = current.getBoundingClientRect()
	blocks.forEach(other => {
		if (other === current) return
		const oR = other.getBoundingClientRect()
		if (Math.abs(cR.top - oR.bottom) < 30 && Math.abs(cR.left - oR.left) < 30) {
			current.style.left = parseFloat(other.style.left) + 'px'
			current.style.top =
				parseFloat(other.style.top) + other.offsetHeight + 8 + 'px'
		}
	})
}
function startWireDrag(e, block) {
	if (editorMode !== 'nodes') return
	e.stopPropagation()
	e.preventDefault()
	isWiring = true
	wireStartBlock = block
	const svg = document.getElementById('connections-layer')
	tempWireNode = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	tempWireNode.setAttribute('class', 'connection-wire')
	tempWireNode.style.pointerEvents = 'none'
	svg.appendChild(tempWireNode)
	const p = getPortPosition(block, 'out')
	updateTempPath(p.x, p.y)
}
function updateTempPath(x, y) {
	if (!wireStartBlock || !tempWireNode) return
	const start = getPortPosition(wireStartBlock, 'out')
	tempWireNode.setAttribute('d', getBezierPath(start.x, start.y, x, y))
}
function endWireDrag(e, endBlock) {
	if (!isWiring || editorMode !== 'nodes') return
	e.stopPropagation()
	if (wireStartBlock !== endBlock) {
		connections = connections.filter(c => c.from !== wireStartBlock.id)
		connections.push({ from: wireStartBlock.id, to: endBlock.id })
		updateAllConnections()
	}
	cancelWiring()
}
function cancelWiring() {
	isWiring = false
	wireStartBlock = null
	if (tempWireNode) {
		tempWireNode.remove()
		tempWireNode = null
	}
}
function updateAllConnections() {
	const svg = document.getElementById('connections-layer')
	if (!svg) return
	svg.innerHTML = ''
	connections.forEach(conn => {
		const b1 = document.getElementById(conn.from)
		const b2 = document.getElementById(conn.to)
		if (b1 && b2) {
			const p1 = getPortPosition(b1, 'out')
			const p2 = getPortPosition(b2, 'in')
			const path = document.createElementNS(
				'http://www.w3.org/2000/svg',
				'path'
			)
			path.setAttribute('class', 'connection-wire')
			path.setAttribute('d', getBezierPath(p1.x, p1.y, p2.x, p2.y))
			path.onclick = e => {
				if (e.shiftKey) {
					connections = connections.filter(c => c !== conn)
					updateAllConnections()
				}
			}
			svg.appendChild(path)
		}
	})
	if (isWiring && tempWireNode) svg.appendChild(tempWireNode)
}
function getBezierPath(x1, y1, x2, y2) {
	const cp1x = x1 + 80,
		cp1y = y1
	const cp2x = x2 - 80,
		cp2y = y2
	return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`
}
function getPortPosition(block, type) {
	const port = block.querySelector(type === 'in' ? '.port-in' : '.port-out')
	const r = port.getBoundingClientRect()
	const cR = container.getBoundingClientRect()

	// --- ИСПРАВЛЕНИЕ: Делим на zoomLevel ---
	return {
		x: (r.left + r.width / 2 - cR.left) / zoomLevel,
		y: (r.top + r.height / 2 - cR.top) / zoomLevel,
	}
}
// 3. Исправление проводов (Touch Wiring)
// Вызывать эту функцию при создании блока в blocks-ui.js
function attachMobileWiring(blockElement) {
	const portOut = blockElement.querySelector('.port-out')
	if (!portOut) return

	portOut.addEventListener('touchstart', e => {
		e.preventDefault() // Чтобы не зумить экран
		e.stopPropagation()

		// Эмулируем начало проводки
		// Нам нужен доступ к переменным из blocks-ui.js (startWireDrag)
		// Но так как они локальные, мы вызовем их через событие или напрямую, если они доступны

		// Самый простой способ - вызвать логику вручную:
		const touch = e.touches[0]

		// Эмулируем объект события, похожий на MouseEvent
		const fakeEvent = {
			stopPropagation: () => {},
			preventDefault: () => {},
			clientX: touch.clientX,
			clientY: touch.clientY,
			target: portOut,
		}

		// Вызываем твою функцию startWireDrag (убедись, что она глобальна или доступна)
		if (typeof startWireDrag === 'function') {
			startWireDrag(fakeEvent, blockElement)
		}

		// Теперь нам нужно двигать провод пальцем
		const moveWire = tm => {
			const t = tm.touches[0]
			const rect = document
				.getElementById('canvas-container')
				.getBoundingClientRect()
			// Расчет координат с учетом зума (важно!)
			const zoom = window.zoomLevel || 1 // Берем глобальный зум
			const x = (t.clientX - rect.left) / zoom
			const y = (t.clientY - rect.top) / zoom

			if (typeof updateTempPath === 'function') {
				updateTempPath(x, y)
			}
		}

		const endWire = te => {
			document.removeEventListener('touchmove', moveWire)
			document.removeEventListener('touchend', endWire)

			// Самое сложное: понять, над каким элементом мы отпустили палец
			const t = te.changedTouches[0]
			const targetEl = document.elementFromPoint(t.clientX, t.clientY)

			if (targetEl && targetEl.classList.contains('port-in')) {
				// Нашли вход! Ищем родительский блок
				const endBlock = targetEl.closest('.node-block')
				if (endBlock && typeof endWireDrag === 'function') {
					// Эмулируем событие отпускания
					endWireDrag({ stopPropagation: () => {} }, endBlock)
				}
			} else {
				// Отпустили в пустоту - сброс
				if (typeof cancelWiring === 'function') cancelWiring()
			}
		}

		document.addEventListener('touchmove', moveWire, { passive: false })
		document.addEventListener('touchend', endWire)
	})
}

// Переключение сворачивания
function toggleBlockCollapse(block, btn, forceState = null) {
	if (!block || !btn) return

	let isCollapsed = block.classList.contains('collapsed')

	// Если передан forceState (при загрузке), используем его
	if (forceState !== null) {
		if (!forceState) return // Уже развернут
		isCollapsed = false // Сейчас сделаем true
	}

	if (isCollapsed) {
		// Разворачиваем
		block.classList.remove('collapsed')
		btn.innerHTML = '<i class="ri-arrow-down-s-line"></i>'
		setChainVisibility(findNextBlock(block.id), true)
	} else {
		// Сворачиваем
		block.classList.add('collapsed')
		btn.innerHTML = '<i class="ri-arrow-right-s-line"></i>'
		setChainVisibility(findNextBlock(block.id), false)
	}

	if (typeof updateAllConnections === 'function') updateAllConnections()
}

// Рекурсивное скрытие/показ цепочки
function setChainVisibility(blockId, visible) {
	if (!blockId) return
	const el = document.getElementById(blockId)
	if (!el) return

	// Скрываем или показываем блок
	el.style.display = visible ? 'block' : 'none'

	// Если мы показываем цепочку, но натыкаемся на свернутый блок внутри,
	// то мы показываем сам блок, но НЕ его детей.
	if (visible && el.classList.contains('collapsed')) {
		return
	}

	const next = findNextBlock(blockId)
	if (next) setChainVisibility(next, visible)
}

function findNextBlock(currentId) {
	const conn = connections.find(c => c.from === currentId)
	return conn ? conn.to : null
}

