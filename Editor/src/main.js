// ==========================================
// --- СИСТЕМНЫЕ ДАННЫЕ ПРОЕКТА ---
// ==========================================

// Получаем имя проекта из URL (например index.html?project=MyGame)
const urlParams = new URLSearchParams(window.location.search)
const currentProjectName = urlParams.get('project') || 'New_Project' // Дефолтное имя, если открыли без меню

// Генерируем уникальный ключ для сохранения этого конкретного проекта
const STORAGE_KEY = `ecrous_data_${currentProjectName}`

// Обновляем заголовок страницы
document.title = `Ecrous Engine | ${currentProjectName}`

// ==========================================
// --- ДАННЫЕ И СОСТОЯНИЕ ---
// ==========================================

let projectData = {
	scenes: [
		{
			id: 'scene_1',
			name: 'Главная сцена',
			objects: [
				{ id: 'obj_1', name: 'GameManager', scripts: [], connections: [] },
			],
		},
	],
}

let activeSceneId = 'scene_1'
let activeObjectId = 'obj_1'
let editorMode = 'stack'
let connections = []
window.currentSessionId = 0 // Глобальный счетчик сессий
window.loadedSounds = {} // Глобальное хранилище звуков
let currentAssetFolderId = null; // null = корневая папка
let isWiring = false
let wireStartBlock = null
let tempWireNode = null
let panX = 0,
	panY = 0
let zoomLevel = 1
let draggedBlock = null
let dragOffset = { x: 0, y: 0 }
let isPanning = false
let panStart = { x: 0, y: 0 }
let customTemplates = {}
// --- ФИЗИКА И КАМЕРА ---
let physicsObjects = {} // Хранилище: { id: { vx, vy, mass, bounce, collideWorld } }
let worldGravity = { x: 0, y: 0 }
let cameraState = {
	x: 0,
	y: 0,
	zoom: 1,
	target: null,
	lerp: 0.1,
	shakeInfo: { power: 0, time: 0 },
}
window.entityComponents = {} // Хранилище: { "obj_id": { "health": 100, ... } }
window.gameInventory = [] // Массив строк
window.gameQuests = {} // Хранилище: { "quest_id": "status" }
window.globalEvents = {} // Для подписок (в будущем)

// Runtime
let isRunning = false
let gameVariables = {}
let activeKeys = {}
let loadedSounds = {}

let isGamePaused = false
let fpsCounter = 0
let lastTime = performance.now()
let showFps = false
let fpsElement = null

let canvas = null
let container = null
let toolbox = null
let sceneListEl = null
let objectListEl = null

// Глобальный флаг для остановки циклов
let breakLoopFlag = false

async function executeChain(currentBlock, allBlocks, objConnections) {
	const mySession = window.currentSessionId
	if (!isRunning || window.currentSessionId !== mySession) return

	// Пауза
	while (isGamePaused && isRunning) {
		if (window.currentSessionId !== mySession) return
		await new Promise(r => setTimeout(r, 100))
	}

	if (currentBlock.disabled || currentBlock.type === 'flow_comment') {
		// Пропускаем комментарии и выключенные блоки
		const next = getNextBlock(currentBlock, allBlocks, objConnections)
		if (next) await executeChain(next, allBlocks, objConnections)
		return
	}

	let nextBlock = null
	let skipToBlock = null

	// --- 1. ЛОГИКА IF / ELSE (РАСШИРЕННАЯ) ---
	if (currentBlock.type === 'flow_if') {
		const valA = resolveValue(currentBlock.values[0])
		const op = currentBlock.values[1]
		const valB = resolveValue(currentBlock.values[2])

		let condition = false
		const nA = parseFloat(valA)
		const nB = parseFloat(valB)
		const isNum = !isNaN(nA) && !isNaN(nB)

		// Стандартные
		if (op === '=') condition = valA == valB
		else if (op === '>') condition = isNum ? nA > nB : valA > valB
		else if (op === '<') condition = isNum ? nA < nB : valA < valB
		// НОВЫЕ ОПЕРАТОРЫ
		else if (op === '!=') condition = valA != valB
		else if (op === '>=') condition = isNum ? nA >= nB : valA >= valB
		else if (op === '<=') condition = isNum ? nA <= nB : valA <= valB
		else if (op === 'contains') condition = String(valA).includes(String(valB))

		if (condition) {
			// IF ИСТИНА: продолжаем выполнение
		} else {
			// IF ЛОЖЬ: Ищем ELSE или END
			const elseBlock = findElseBlock(currentBlock, allBlocks, objConnections)
			if (elseBlock) {
				skipToBlock = elseBlock
			} else {
				skipToBlock = findClosingBlock(currentBlock, allBlocks, objConnections)
			}
		}
	}
	// Если встретили ELSE, а мы здесь (значит пришли сверху от успешного IF), нужно его перепрыгнуть
	else if (currentBlock.type === 'flow_else') {
		skipToBlock = findClosingBlock(currentBlock, allBlocks, objConnections)
	}

	// --- 2. ЦИКЛЫ ---
	else if (currentBlock.type === 'flow_repeat') {
		const count = parseInt(resolveValue(currentBlock.values[0])) || 1
		const loopBodyStart = getNextBlock(currentBlock, allBlocks, objConnections)
		const loopEnd = findClosingBlock(currentBlock, allBlocks, objConnections)

		if (loopBodyStart && loopEnd) {
			for (let i = 0; i < count; i++) {
				if (!isRunning || window.currentSessionId !== mySession) return
				await executeSection(loopBodyStart, loopEnd, allBlocks, objConnections)
			}
			skipToBlock = loopEnd
		}
	}

	// --- ВЫПОЛНЕНИЕ ЛОГИКИ БЛОКА ---
	if (!skipToBlock) {
		await executeBlockLogic(currentBlock)
	}

	// --- ПЕРЕХОД К СЛЕДУЮЩЕМУ ---
	if (skipToBlock) {
		nextBlock = getNextBlock(skipToBlock, allBlocks, objConnections)
	} else {
		nextBlock = getNextBlock(currentBlock, allBlocks, objConnections)
	}

	if (nextBlock) {
		if (window.currentSessionId !== mySession) return
		await executeChain(nextBlock, allBlocks, objConnections)
	}
}

function findElseBlock(startBlock, allBlocks, connections) {
	let depth = 0
	let curr = getNextBlock(startBlock, allBlocks, connections)
	let steps = 0
	while (curr && steps < 500) {
		if (curr.type === 'flow_if' || curr.type === 'flow_repeat') depth++
		if (curr.type === 'flow_end') depth--

		// Если нашли ELSE на глубине 0 — это наш клиент
		if (depth === 0 && curr.type === 'flow_else') return curr

		// Если вышли из блока (depth < 0) — значит ELSE нет
		if (depth < 0) return null

		curr = getNextBlock(curr, allBlocks, connections)
		steps++
	}
	return null
}

// Помощник: найти следующий блок
function getNextBlock(block, allBlocks, connections) {
	if (editorMode === 'nodes') {
		const conn = connections.find(c => c.from === block.id)
		return conn ? allBlocks.find(b => b.id === conn.to) : null
	} else {
		// --- STACK MODE FIX ---
		// Увеличиваем дистанцию поиска, так как блоки могут быть высокими (особенно диалоги)
		const SEARCH_HEIGHT = 500 // Было 150
		const ALIGN_TOLERANCE = 50 // Насколько криво могут стоять блоки по X

		let candidates = allBlocks.filter(b => {
			if (b.id === block.id) return false
			const dy = b.y - block.y
			const dx = Math.abs(b.x - block.x)

			// Ищем блок, который строго ниже (dy > 0), но не слишком далеко
			// И стоит примерно на той же вертикальной линии
			return dy > 0 && dy < SEARCH_HEIGHT && dx < ALIGN_TOLERANCE
		})

		// Сортируем: берем самый ближний по вертикали (верхний из нижних)
		candidates.sort((a, b) => a.y - b.y)

		return candidates[0]
	}
}

// Помощник: найти закрывающий блок (flow_end) с учетом вложенности
function findClosingBlock(startBlock, allBlocks, connections) {
	let depth = 1
	let curr = getNextBlock(startBlock, allBlocks, connections)

	// Защита от бесконечного поиска (макс 100 блоков)
	let steps = 0
	while (curr && steps < 500) {
		if (curr.type === 'flow_if' || curr.type === 'flow_repeat') depth++
		if (curr.type === 'flow_end') depth--

		if (depth === 0) return curr // Нашли пару

		curr = getNextBlock(curr, allBlocks, connections)
		steps++
	}
	return null
}

// Помощник: выполнить секцию кода (для циклов)
async function executeSection(start, end, allBlocks, conns) {
	let curr = start
	while (curr && curr.id !== end.id) {
		if (!isRunning) return
		// Рекурсивно вызываем executeChain для одного шага? Нет, это вызовет ад.
		// Просто выполняем логику
		await executeBlockLogic(curr)

		// Особая обработка вложенных IF внутри цикла (простая версия)
		if (curr.type === 'flow_if') {
			const valA = resolveValue(curr.values[0])
			const op = curr.values[1]
			const valB = resolveValue(curr.values[2])
			let cond = false
			if (op === '=') cond = valA == valB
			if (op === '>') cond = parseFloat(valA) > parseFloat(valB)
			if (op === '<') cond = parseFloat(valA) < parseFloat(valB)

			if (!cond) {
				// Скип внутри цикла
				const closer = findClosingBlock(curr, allBlocks, conns)
				if (closer) curr = closer
			}
		}

		curr = getNextBlock(curr, allBlocks, conns)
	}
}

// Помощник: разрешить переменную или значение
function resolveValue(val) {
	// Если это число
	if (!isNaN(parseFloat(val)) && isFinite(val)) return val
	// Если переменная существует
	if (gameVariables.hasOwnProperty(val)) return gameVariables[val]
	// Иначе строка
	return val
}

function executeBlockLogic(block) {
	return new Promise(resolve => {
		if (!isRunning) return resolve()
		setTimeout(() => {
			const v = block.values
			const w = document.getElementById('game-world')

			switch (block.type) {
				// --- ДВИЖЕНИЕ ---
				case 'mov_set_pos': {
					const el = document.getElementById(v[0])
					if (el) {
						el.style.left = v[1] + 'px'
						el.style.top = v[2] + 'px'
					}
					break
				}
				case 'mov_change_pos': {
					const el = document.getElementById(v[0])
					if (el) {
						const curX = parseFloat(el.style.left || 0)
						const curY = parseFloat(el.style.top || 0)
						el.style.left = curX + parseFloat(v[1]) + 'px'
						el.style.top = curY + parseFloat(v[2]) + 'px'
					}
					break
				}
				case 'mov_look_at': {
					const me = document.getElementById(v[0])
					const target = document.getElementById(v[1])
					if (me && target) {
						const rect1 = me.getBoundingClientRect()
						const rect2 = target.getBoundingClientRect()
						const cx1 = rect1.left + rect1.width / 2
						const cy1 = rect1.top + rect1.height / 2
						const cx2 = rect2.left + rect2.width / 2
						const cy2 = rect2.top + rect2.height / 2

						const dy = cy2 - cy1
						const dx = cx2 - cx1
						const theta = Math.atan2(dy, dx)
						const deg = (theta * 180) / Math.PI
						me.style.transform = `rotate(${deg}deg)`
					}
					break
				}
				case 'mov_pin': {
					const el = document.getElementById(v[0])
					if (el) {
						if (v[1] === '1') el.style.position = 'fixed'
						else el.style.position = 'absolute'
					}
					break
				}
				case 'mov_align': {
					const el = document.getElementById(v[0])
					if (el) {
						// ИСПРАВЛЕНИЕ: Берем реальные размеры из конфига
						const winW = (window.gameConfig && window.gameConfig.width) || 800
						const winH = (window.gameConfig && window.gameConfig.height) || 600
						const width = el.offsetWidth
						const height = el.offsetHeight

						if (v[1] === 'center') {
							el.style.left = winW / 2 - width / 2 + 'px'
							el.style.top = winH / 2 - height / 2 + 'px'
						} else if (v[1] === 'left') {
							el.style.left = '0px'
						} else if (v[1] === 'right') {
							el.style.left = winW - width + 'px'
						} else if (v[1] === 'top') {
							el.style.top = '0px'
						} else if (v[1] === 'bottom') {
							el.style.top = winH - height + 'px'
						}
					}
					break
				}

				// --- ГРУППЫ ---
				case 'grp_add': {
					const el = document.getElementById(v[0])
					if (el) el.classList.add(`grp_${v[1]}`)
					break
				}
				case 'grp_remove': {
					const el = document.getElementById(v[0])
					if (el) el.classList.remove(`grp_${v[1]}`)
					break
				}
				case 'grp_move': {
					const grpName = v[0]
					const dx = parseFloat(v[1])
					const dy = parseFloat(v[2])
					const els = document.querySelectorAll(`.grp_${grpName}`)
					els.forEach(el => {
						const curX = parseFloat(el.style.left || 0)
						const curY = parseFloat(el.style.top || 0)
						el.style.left = curX + dx + 'px'
						el.style.top = curY + dy + 'px'
					})
					break
				}
				case 'grp_state': {
					const els = document.querySelectorAll(`.grp_${v[0]}`)
					els.forEach(el => {
						if (v[1] === 'hide') el.style.display = 'none'
						else el.style.display = 'block'
					})
					break
				}
				case 'grp_delete': {
					const els = document.querySelectorAll(`.grp_${v[0]}`)
					els.forEach(el => el.remove())
					break
				}

				// --- ОКНО ---
				case 'win_set_title': {
					const el = document.querySelector('.game-header span') // Для редактора меняем заголовок окна
					if (el) el.innerText = resolveValue(v[0])
					document.title = resolveValue(v[0]) // И вкладку браузера
					break
				}
				case 'win_scale_mode': {
					// В редакторе мы просто логируем, так как окно фиксировано
					console.log('Режим масштабирования установлен на: ' + v[0])
					break
				}
				case 'win_set_size': {
					const w = parseInt(v[0])
					const h = parseInt(v[1])

					// 1. Обновляем глобальный конфиг
					if (!window.gameConfig) window.gameConfig = {}
					window.gameConfig.width = w
					window.gameConfig.height = h

					// 2. Обновляем окно редактора
					const win = document.querySelector('.game-window')
					if (win) {
						win.style.width = w + 'px'
						win.style.height = h + 40 + 'px' // +40 шапка
					}

					// 3. Обновляем саму сцену (stage)
					const stage = document.getElementById('game-stage')
					if (stage) {
						stage.style.width = w + 'px'
						stage.style.height = h + 'px'
					}

					// 4. Пересчитываем масштаб (если включен Fit/Fill)
					if (typeof resizeGame === 'function') resizeGame()
					break
				}
				case 'win_set_cursor': {
					const stage = document.getElementById('game-stage')
					if (stage) {
						stage.style.cursor = v[0]
					}
					break
				}
				case 'win_fullscreen': {
					console.log(
						'Полноэкранный режим работает только в экспортированной игре.'
					)
					break
				}
				case 'win_bg_color': {
					const el = document.getElementById('game-stage')
					if (el) el.style.background = v[0]
					break
				}
				case 'win_bg_image': {
					const el = document.getElementById('game-stage')
					if (el) {
						const url = getAssetUrl(resolveValue(v[0])) // <--- Используем getAssetUrl
						el.style.backgroundImage = `url('${url}')`
						el.style.backgroundSize = 'cover'
					}
					break
				}
				case 'win_console_state': {
					const el = document.getElementById('game-console')
					if (el) {
						if (v[0] === 'hide' || v[0] === 'скрыть') el.style.display = 'none'
						else el.style.display = 'block'
					}
					break
				}

				// --- ПЕРЕМЕННЫЕ ---
				case 'var_set': {
					const varName = v[0]
					const val = resolveValue(v[1])
					gameVariables[varName] = val
					if (typeof updateDynamicText === 'function') updateDynamicText()
					break
				}
				case 'var_change': {
					const varName = v[0]
					const currentVal = parseFloat(gameVariables[varName]) || 0
					const amount = parseFloat(resolveValue(v[1])) || 0
					gameVariables[varName] = currentVal + amount
					if (typeof updateDynamicText === 'function') updateDynamicText()
					break
				}
				case 'log_print': {
					const msg = resolveValue(v[0])
					const isNewLine = v[1] === 'yes' || v[1] === undefined // По умолчанию да

					console.log('[LOG]:', msg)
					const consoleEl = document.getElementById('game-console')

					if (consoleEl) {
						if (isNewLine) {
							// Создаем новую строку
							const line = document.createElement('div')
							line.className = 'console-line'
							line.innerText = msg
							consoleEl.appendChild(line)
						} else {
							// Пытаемся найти последнюю строку
							let lastLine = consoleEl.lastElementChild

							// Если строк нет или последняя строка системная/скрытая - создаем новую
							if (!lastLine) {
								lastLine = document.createElement('div')
								lastLine.className = 'console-line'
								consoleEl.appendChild(lastLine)
							}

							// Дописываем текст (используем span для безопасности стилей)
							const span = document.createElement('span')
							span.innerText = msg
							lastLine.appendChild(span)
						}

						// Автоскролл вниз
						consoleEl.scrollTop = consoleEl.scrollHeight
					}
					break
				}

				// --- ОБЪЕКТЫ ---
				case 'obj_create_rect_custom': {
					const d = document.createElement('div')
					d.id = v[0]
					d.style.position = 'absolute'
					d.style.left = v[3] + 'px'
					d.style.top = v[4] + 'px'
					d.style.width = v[1] + 'px'
					d.style.height = v[2] + 'px'
					d.style.backgroundColor = v[5]
					d.style.borderRadius = v[6] + 'px'
					w.appendChild(d)
					break
				}
				case 'obj_create_circle': {
					const d = document.createElement('div')
					d.id = v[0]
					d.style.position = 'absolute'
					d.style.left = v[1] + 'px'
					d.style.top = v[2] + 'px'
					const s = parseInt(v[3]) * 2
					d.style.width = s + 'px'
					d.style.height = s + 'px'
					d.style.backgroundColor = v[4]
					d.style.borderRadius = '50%'
					w.appendChild(d)
					break
				}
				case 'obj_create_line': {
					const d = document.createElement('div')
					d.id = v[0]
					d.style.position = 'absolute'
					const x1 = parseFloat(v[1])
					const y1 = parseFloat(v[2])
					const x2 = parseFloat(v[3])
					const y2 = parseFloat(v[4])
					const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
					const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI

					d.style.width = length + 'px'
					d.style.height = v[5] + 'px'
					d.style.backgroundColor = v[6]
					d.style.left = x1 + 'px'
					d.style.top = y1 + 'px'
					d.style.transformOrigin = '0 50%'
					d.style.transform = `rotate(${angle}deg)`
					w.appendChild(d)
					break
				}
				case 'obj_create_poly': {
					const d = document.createElement('div')
					d.id = v[0]
					d.style.position = 'absolute'
					const cx = parseFloat(v[1])
					const cy = parseFloat(v[2])
					const r = parseFloat(v[3])
					const sides = parseInt(v[4])
					const size = r * 2

					d.style.width = size + 'px'
					d.style.height = size + 'px'
					d.style.left = cx - r + 'px'
					d.style.top = cy - r + 'px'
					d.style.backgroundColor = v[5]

					let pts = []
					for (let i = 0; i < sides; i++) {
						const theta = ((Math.PI * 2) / sides) * i - Math.PI / 2
						const px = 50 + 50 * Math.cos(theta)
						const py = 50 + 50 * Math.sin(theta)
						pts.push(`${px}% ${py}%`)
					}
					d.style.clipPath = `polygon(${pts.join(', ')})`
					w.appendChild(d)
					break
				}
				case 'obj_clone': {
					const src = document.getElementById(v[0])
					if (src) {
						const clone = src.cloneNode(true)
						clone.id = v[1]
						w.appendChild(clone)
					}
					break
				}
				case 'obj_delete': {
					const el = document.getElementById(v[0])
					if (el) el.remove()
					break
				}

				// --- СТИЛИЗАЦИЯ ---
				case 'obj_set_size': {
					const el = document.getElementById(v[0])
					if (el) {
						el.style.width = v[1] + 'px'
						el.style.height = v[2] + 'px'
					}
					break
				}
				case 'obj_set_scale': {
					const el = document.getElementById(v[0])
					if (el) el.style.transform = `scale(${v[1]}, ${v[2]})`
					break
				}
				case 'obj_set_rotate': {
					const el = document.getElementById(v[0])
					if (el) el.style.transform = `rotate(${v[1]}deg)`
					break
				}
				case 'obj_set_color': {
					const el = document.getElementById(v[0])
					if (el) el.style.backgroundColor = v[1]
					break
				}
				case 'obj_set_stroke': {
					const el = document.getElementById(v[0])
					if (el) el.style.border = `${v[2]}px solid ${v[1]}`
					break
				}
				case 'obj_set_border_adv': {
					const targetId = v[0] // ID объекта
					const el = document.getElementById(targetId)

					if (el) {
						// --- 1. ПАРСИНГ ЗНАЧЕНИЙ ---

						// Толщина
						let width = parseFloat(resolveValue(v[1]))
						if (isNaN(width)) width = 0

						// Стиль (проверка на валидность)
						let style = resolveValue(v[2])
						const validStyles = [
							'solid',
							'dashed',
							'dotted',
							'double',
							'groove',
							'ridge',
							'inset',
							'outset',
							'none',
							'hidden',
						]
						// Если стиль пустой или невалидный - ставим solid
						if (!style || !validStyles.includes(style)) style = 'solid'

						// Цвет
						let color = resolveValue(v[3])
						// Защита от нулевого цвета
						if (!color || color === '0' || color === 0) color = '#ffffff'

						// Радиус
						let radius = resolveValue(v[4])

						// --- 2. ПРИМЕНЕНИЕ СТИЛЕЙ (ПО ОТДЕЛЬНОСТИ) ---

						// Важно: border-box, чтобы рамка не увеличивала размер элемента внешне
						el.style.boxSizing = 'border-box'

						if (width > 0 && style !== 'none') {
							el.style.borderWidth = width + 'px'
							el.style.borderStyle = style
							el.style.borderColor = color
						} else {
							// Если толщина 0, убираем рамку
							el.style.borderStyle = 'none'
							el.style.borderWidth = '0px'
						}

						// --- 3. РАДИУС (СКРУГЛЕНИЕ) ---
						// Применяем независимо от рамки
						if (
							radius !== undefined &&
							radius !== '' &&
							radius !== '0' &&
							radius !== 0
						) {
							// Если это число (например 10) -> добавляем px
							if (!isNaN(parseFloat(radius)) && isFinite(radius)) {
								el.style.borderRadius = radius + 'px'
							} else {
								// Если это строка (например "50%") -> оставляем как есть
								el.style.borderRadius = radius
							}
						}
					} else {
						console.warn(
							`Объект с ID "${targetId}" не найден для установки границ.`
						)
					}
					break
				}
				case 'obj_set_texture': {
					const el = document.getElementById(v[0])
					if (el) {
						const url = getAssetUrl(resolveValue(v[1])) // <--- Используем getAssetUrl
						el.style.backgroundImage = `url('${url}')`
						el.style.backgroundSize = 'cover'
						el.style.backgroundPosition = 'center' // По центру красивее
						el.style.backgroundRepeat = 'no-repeat'
					}
					break
				}
				case 'obj_set_zindex': {
					const el = document.getElementById(v[0])
					if (el) el.style.zIndex = v[1]
					break
				}
				case 'obj_set_shadow': {
					const el = document.getElementById(v[0])
					if (el) el.style.boxShadow = `5px 5px ${v[2]}px ${v[1]}`
					break
				}
				case 'obj_set_blur': {
					const el = document.getElementById(v[0])
					if (el) el.style.filter = `blur(${v[1]}px)`
					break
				}

				// --- ТЕКСТ ---
				case 'txt_create': {
					if (document.getElementById(v[0])) break

					const d = document.createElement('div')
					d.id = v[0]
					d.style.position = 'absolute'
					d.style.left = v[1] + 'px'
					d.style.top = v[2] + 'px'
					d.dataset.template = v[3]
					// -----------------------

					d.innerText = resolveText(v[3])
					d.style.fontSize = v[4] + 'px'
					d.style.color = v[5]
					d.style.whiteSpace = 'nowrap'
					w.appendChild(d)
					break
				}
				case 'txt_set_opacity': {
					const t = document.getElementById(v[0])
					if (t) t.style.opacity = v[1]
					break
				}
				case 'txt_hide': {
					const t = document.getElementById(v[0])
					if (t) t.style.display = 'none'
					break
				}
				case 'txt_show': {
					const t = document.getElementById(v[0])
					if (t) t.style.display = 'block'
					break
				}

				case 'evt_wait': {
					const sec = parseFloat(v[0])
					setTimeout(() => {
						resolve()
					}, sec * 1000)
					return
				}
				case 'txt_modify': {
					const t = document.getElementById(v[0])
					if (!t) break

					const mode = v[1]
					const value = v[2]

					// добавить текст
					if (mode === 'add') {
						t.innerText += resolveText(value)
					}

					// заменить полностью
					else if (mode === 'replace') {
						t.dataset.template = value
						t.innerText = resolveText(value)
					}

					// изменить число в тексте (для кликера)
					else if (mode === 'number') {
						const match = t.innerText.match(/-?\d+/)
						if (match) {
							const num = parseInt(match[0])
							const newNum = num + Number(resolveText(value))
							t.innerText = t.innerText.replace(match[0], newNum)
						}
					}
					break
				}
				case 'txt_load_font': {
					const fontName = v[0] // Имя, которое вы придумали (например, "Pixel")
					const fontUrl = getAssetUrl(resolveValue(v[1])) // Сам файл (Base64)

					// Проверяем, не загружали ли мы его уже
					if (!document.getElementById('font-style-' + fontName)) {
						const style = document.createElement('style')
						style.id = 'font-style-' + fontName
						style.innerHTML = `
            @font-face {
                font-family: '${fontName}';
                src: url('${fontUrl}');
            }
        `
						document.head.appendChild(style)
					}
					break
				}

				case 'txt_set_font': {
					const t = document.getElementById(v[0])
					if (t) {
						t.style.fontFamily = v[1] // Здесь должно быть "Pixel", а не "font.ttf"
					}
					break
				}

				// --- АНИМАЦИЯ ---
				case 'anim_move_to': {
					const el = document.getElementById(v[0])
					const time = parseFloat(v[3])
					if (el) {
						el.style.transition = `all ${time}s ease-in-out`
						// Форсируем перерисовку для применения транзишн
						el.offsetHeight
						el.style.left = v[1] + 'px'
						el.style.top = v[2] + 'px'
					}
					break
				}
				case 'anim_rotate_to': {
					const el = document.getElementById(v[0])
					const time = parseFloat(v[2])
					if (el) {
						el.style.transition = `transform ${time}s ease-in-out`
						el.style.transform = `rotate(${v[1]}deg)`
					}
					break
				}
				case 'anim_scale_to': {
					const el = document.getElementById(v[0])
					const time = parseFloat(v[3])
					if (el) {
						el.style.transition = `transform ${time}s ease-in-out`
						el.style.transform = `scale(${v[1]}, ${v[2]})`
					}
					break
				}
				case 'anim_fade': {
					const el = document.getElementById(v[0])
					const time = parseFloat(v[2])
					if (el) {
						el.style.transition = `opacity ${time}s ease-in-out`
						el.style.opacity = v[1]
					}
					break
				}
				case 'anim_stop': {
					const el = document.getElementById(v[0])
					if (el) {
						const computedStyle = window.getComputedStyle(el)
						// Фиксируем текущие значения
						el.style.left = computedStyle.left
						el.style.top = computedStyle.top
						el.style.transform = computedStyle.transform
						el.style.opacity = computedStyle.opacity
						el.style.transition = 'none' // Убираем анимацию
					}
					break
				}

				// --- ОТЛАДКА ---
				case 'debug_draw_bounds': {
					const el = document.getElementById(v[0])
					if (el) {
						if (v[1] === '1') {
							el.style.outline = '2px dashed #F57C00'
							el.style.outlineOffset = '2px'
							// Создаем подпись с ID и координатами
							let dbgInfo = document.getElementById(v[0] + '_debug')
							if (!dbgInfo) {
								dbgInfo = document.createElement('div')
								dbgInfo.id = v[0] + '_debug'
								dbgInfo.style.position = 'absolute'
								dbgInfo.style.top = '-20px'
								dbgInfo.style.left = '0'
								dbgInfo.style.background = '#F57C00'
								dbgInfo.style.color = '#fff'
								dbgInfo.style.fontSize = '10px'
								dbgInfo.style.padding = '2px 4px'
								dbgInfo.style.pointerEvents = 'none'
								dbgInfo.innerText = `${v[0]} (${parseInt(
									el.style.left
								)}:${parseInt(el.style.top)})`
								el.appendChild(dbgInfo)
							}
						} else {
							el.style.outline = 'none'
							const dbgInfo = document.getElementById(v[0] + '_debug')
							if (dbgInfo) dbgInfo.remove()
						}
					}
					break
				}
				case 'debug_show_fps': {
					showFps = v[0] === '1'
					if (showFps) {
						if (!document.getElementById('ecrous-fps')) {
							const fps = document.createElement('div')
							fps.id = 'ecrous-fps'
							fps.style.position = 'absolute'
							fps.style.top = '10px'
							fps.style.right = '10px'
							fps.style.background = 'rgba(0,0,0,0.7)'
							fps.style.color = '#00E676'
							fps.style.padding = '5px 10px'
							fps.style.fontFamily = 'monospace'
							fps.style.borderRadius = '4px'
							fps.style.zIndex = '9999'
							document.getElementById('game-stage').appendChild(fps)
							fpsElement = fps
						} else {
							document.getElementById('ecrous-fps').style.display = 'block'
						}
					} else {
						const f = document.getElementById('ecrous-fps')
						if (f) f.style.display = 'none'
					}
					break
				}
				case 'debug_pause': {
					isGamePaused = true
					// Выводим сообщение в консоль игры
					const con = document.getElementById('game-console')
					if (con)
						con.innerHTML += `<div class="console-warn">|| ИГРА НА ПАУЗЕ</div>`
					break
				}
				case 'debug_step': {
					// Если игра на паузе, мы временно снимаем её на 100мс и снова ставим
					if (isGamePaused) {
						isGamePaused = false
						setTimeout(() => {
							isGamePaused = true
						}, 100)
					}
					break
				}

				// --- ЗВУК ---
				case 'snd_load': {
					const soundId = v[0]
					const src = getAssetUrl(resolveValue(v[1]))

					if (soundId && src) {
						const audio = new Audio(src)
						audio.preload = 'auto'
						loadedSounds[soundId] = audio

						// --- АСИНХРОННАЯ ЗАГРУЗКА ---
						// Мы не разрешаем идти к следующему блоку (resolve),
						// пока звук не будет полностью готов.

						let isResolved = false

						const finishLoading = () => {
							if (isResolved) return
							isResolved = true
							// Удаляем слушатели, чтобы память не текла
							audio.oncanplaythrough = null
							audio.onerror = null
							resolve() // <-- ТЕПЕРЬ МОЖНО ИДТИ ДАЛЬШЕ
						}

						audio.oncanplaythrough = finishLoading

						audio.onerror = e => {
							console.warn('Не удалось загрузить звук:', soundId)
							finishLoading() // Идем дальше, даже если ошибка, чтобы игра не зависла
						}

						// Предохранитель: если звук грузится дольше 2 секунд, не ждем его
						setTimeout(() => {
							if (!isResolved) {
								console.warn(
									'Звук грузится слишком долго, пропускаем ожидание:',
									soundId
								)
								finishLoading()
							}
						}, 2000)

						return // <--- ВАЖНО: Прерываем стандартный поток, ждем события
					}
					break
				}

				case 'snd_play': {
					const soundId = v[0]
					const sound = loadedSounds[soundId]
					if (sound) {
						sound.currentTime = 0 // Перемотка в начало
						// Используем Promise для play, чтобы избежать ошибок браузера
						sound.play().catch(e => console.warn('Ошибка воспроизведения:', e))
					}
					break
				}

				case 'snd_stop': {
					const soundId = v[0]
					const sound = loadedSounds[soundId]
					if (sound) {
						sound.pause()
						sound.currentTime = 0 // Сброс в начало
					}
					break
				}

				case 'snd_loop': {
					const soundId = v[0]
					const shouldLoop = v[1] === '1' || v[1] === 'true' || v[1] === 'да'
					const sound = loadedSounds[soundId]
					if (sound) {
						sound.loop = shouldLoop
					}
					break
				}

				case 'snd_stop_all': {
					// Пробегаемся по всем звукам и выключаем их
					Object.values(loadedSounds).forEach(snd => {
						snd.pause()
						snd.currentTime = 0
					})
					break
				}

				// --- ИНТЕРФЕЙС (UI) ---
				case 'ui_panel': {
					const ui = document.getElementById('game-ui')
					if (!ui) break

					// Если панель уже есть - не создаем дубликат
					if (document.getElementById(v[0])) break

					const p = document.createElement('div')
					p.id = v[0]
					p.className = 'ui-element'
					p.style.left = v[1] + 'px'
					p.style.top = v[2] + 'px'
					p.style.width = v[3] + 'px'
					p.style.height = v[4] + 'px'
					p.style.backgroundColor = v[5]
					p.style.borderRadius = '12px'
					p.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)'
					ui.appendChild(p)
					break
				}

				case 'ui_button_create': {
					const ui = document.getElementById('game-ui')
					if (!ui || document.getElementById(v[0])) break

					const btn = document.createElement('button')
					btn.id = v[0]
					btn.className = 'ui-element ui-btn'
					btn.innerText = v[1]
					btn.style.left = v[2] + 'px'
					btn.style.top = v[3] + 'px'
					btn.style.width = v[4] + 'px'
					btn.style.height = v[5] + 'px'
					// Размер шрифта адаптивный
					btn.style.fontSize = parseInt(v[5]) * 0.4 + 'px'
					ui.appendChild(btn)
					break
				}

				case 'ui_progressbar': {
					const ui = document.getElementById('game-ui')
					if (!ui) break

					let bar = document.getElementById(v[0])
					// Получаем значение (поддержка переменных {hp})
					let val = parseFloat(resolveText(v[1]))
					if (val < 0) val = 0
					if (val > 100) val = 100

					if (!bar) {
						// Создаем, если нет
						bar = document.createElement('div')
						bar.id = v[0]
						bar.className = 'ui-element ui-progress-bg'
						bar.style.left = v[2] + 'px'
						bar.style.top = v[3] + 'px'
						bar.style.width = v[4] + 'px'
						bar.style.height = v[5] + 'px'

						const fill = document.createElement('div')
						fill.className = 'ui-progress-fill'
						fill.style.width = val + '%'

						bar.appendChild(fill)
						ui.appendChild(bar)
					} else {
						// Обновляем, если есть
						const fill = bar.querySelector('.ui-progress-fill')
						if (fill) fill.style.width = val + '%'
					}
					break
				}

				case 'ui_slider': {
					const ui = document.getElementById('game-ui')
					if (!ui || document.getElementById(v[0])) break

					const slider = document.createElement('input')
					slider.type = 'range'
					slider.id = v[0]
					slider.className = 'ui-element ui-slider'

					const varName = v[1] // Имя переменной
					slider.min = v[2]
					slider.max = v[3]
					slider.style.left = v[4] + 'px'
					slider.style.top = v[5] + 'px'
					slider.style.width = '150px' // Стандартная ширина

					// При изменении слайдера - меняем переменную игры
					slider.oninput = e => {
						gameVariables[varName] = e.target.value
						updateDynamicText() // Обновить тексты на экране
					}

					ui.appendChild(slider)
					break
				}

				case 'ui_toggle': {
					const el = document.getElementById(v[0])
					if (el) {
						const mode = v[1] // toggle, show, hide

						// Определяем текущее состояние
						// (если display пустой, браузер считает его block/flex, то есть видимым)
						const isHidden = el.style.display === 'none'

						if (mode === 'show') {
							el.style.display = 'block'
						} else if (mode === 'hide') {
							el.style.display = 'none'
						} else {
							// Режим TOGGLE (Переключатель)
							if (isHidden) {
								el.style.display = 'block'
							} else {
								el.style.display = 'none'
							}
						}
					}
					break
				}

				// --- СЦЕНЫ ---
				case 'scene_load': {
					const targetName = v[0]
					// Ищем сцену по имени
					const targetScene = projectData.scenes.find(
						s => s.name === targetName
					)

					if (targetScene) {
						// Вызываем функцию загрузки из game.js
						loadRuntimeScene(targetScene)
						// Важно: Прерываем выполнение текущей цепочки, так как сцена сменилась
						return
					} else {
						console.warn(`Сцена "${targetName}" не найдена!`)
					}
					break
				}

				case 'scene_reload': {
					// Перезагружаем текущую сцену по ID
					const current = projectData.scenes.find(s => s.id === runtimeSceneId)
					if (current) {
						loadRuntimeScene(current)
						return
					}
					break
				}

				case 'scene_next': {
					// Ищем индекс текущей сцены
					const currentIndex = projectData.scenes.findIndex(
						s => s.id === runtimeSceneId
					)
					if (
						currentIndex !== -1 &&
						currentIndex < projectData.scenes.length - 1
					) {
						const nextScene = projectData.scenes[currentIndex + 1]
						loadRuntimeScene(nextScene)
						return
					} else {
						console.log('Это последняя сцена, дальше некуда.')
					}
					break
				}

				case 'scene_save_state': {
					const slotName = v[0] || 'autosave'
					// Сохраняем только переменные (позиции объектов сохранять сложнее)
					const saveData = {
						vars: gameVariables,
						timestamp: Date.now(),
					}
					localStorage.setItem(
						`ecrous_save_${currentProjectName}_${slotName}`,
						JSON.stringify(saveData)
					)
					// console.log("Игра сохранена в слот:", slotName);
					break
				}

				case 'scene_load_state': {
					const slotName = v[0] || 'autosave'
					const raw = localStorage.getItem(
						`ecrous_save_${currentProjectName}_${slotName}`
					)
					if (raw) {
						const data = JSON.parse(raw)
						gameVariables = data.vars || {}
						updateDynamicText() // Обновляем тексты на экране
					}
					break
				}

				// --- ФИЗИКА ---
				case 'phys_enable': {
					const id = v[0]
					const shape = v[1] // box или circle
					const isStatic = v[2] === '1' || v[2] === 'true'
					const restitution = parseFloat(v[3]) || 0

					const el = document.getElementById(id)
					if (el && matterEngine) {
						const x = parseFloat(el.style.left) || 0
						const y = parseFloat(el.style.top) || 0
						const w = el.offsetWidth
						const h = el.offsetHeight

						// Смещаем координаты к центру для Matter.js
						const centerX = x + w / 2
						const centerY = y + h / 2

						let body
						if (shape === 'circle') {
							body = Matter.Bodies.circle(centerX, centerY, w / 2, {
								isStatic: isStatic,
								restitution: restitution,
								label: id, // Важно для коллизий
							})
						} else {
							body = Matter.Bodies.rectangle(centerX, centerY, w, h, {
								isStatic: isStatic,
								restitution: restitution,
								label: id,
							})
						}

						Matter.World.add(matterEngine.world, body)
						bodyMap.set(id, body) // Сохраняем в map
					}
					break
				}
				case 'phys_set_gravity': {
					worldGravity.x = parseFloat(v[0])
					worldGravity.y = parseFloat(v[1])
					break
				}
				case 'phys_add_force': {
					// Теперь используем Matter.Body.applyForce
					const body = bodyMap.get(v[0])
					if (body) {
						const fx = parseFloat(v[1])
						const fy = parseFloat(v[2])
						Matter.Body.applyForce(body, body.position, {
							x: fx * 0.001,
							y: fy * 0.001,
						})
					}
					break
				}
				case 'phys_set_velocity': {
					const phys = physicsObjects[v[0]]
					if (phys) {
						phys.vx = parseFloat(v[1])
						phys.vy = parseFloat(v[2])
					}
					break
				}
				case 'phys_set_bounce': {
					const phys = physicsObjects[v[0]]
					if (phys) phys.bounce = parseFloat(v[1])
					break
				}
				case 'phys_collide_world': {
					const phys = physicsObjects[v[0]]
					if (phys) phys.collideWorld = v[1] === '1'
					break
				}

				// --- КАМЕРА ---
				case 'cam_follow': {
					const targetId = v[0]
					if (document.getElementById(targetId)) {
						cameraState.target = targetId
						cameraState.lerp = parseFloat(v[1]) || 0.1
					}
					break
				}
				case 'cam_set_pos': {
					cameraState.target = null // Отключаем слежение
					cameraState.x = parseFloat(v[0])
					cameraState.y = parseFloat(v[1])
					break
				}
				case 'cam_zoom': {
					cameraState.zoom = parseFloat(v[0])
					break
				}
				case 'cam_shake': {
					cameraState.shakeInfo = {
						power: parseFloat(v[0]),
						time: parseFloat(v[1]),
					}
					break
				}
				case 'cam_reset': {
					cameraState = {
						x: 0,
						y: 0,
						zoom: 1,
						target: null,
						lerp: 0.1,
						shakeInfo: { power: 0, time: 0 },
					}
					break
				}
				// --- DATA ---
				case 'data_save': {
					const key = v[0]
					const val = resolveValue(v[1])
					localStorage.setItem(`ecrous_data_${currentProjectName}_${key}`, val)
					break
				}
				case 'data_load': {
					const key = v[0]
					const varName = v[1]
					const val = localStorage.getItem(
						`ecrous_data_${currentProjectName}_${key}`
					)
					if (val !== null) {
						gameVariables[varName] = isNaN(val) ? val : parseFloat(val)
						updateDynamicText()
					}
					break
				}
				case 'data_clear': {
					// Очищаем только ключи этого проекта
					Object.keys(localStorage).forEach(k => {
						if (k.startsWith(`ecrous_data_${currentProjectName}_`))
							localStorage.removeItem(k)
					})
					break
				}

				// --- INPUT ---
				case 'input_key_down': {
					const code = v[0]
					const targetVar = v[1]
					gameVariables[targetVar] = activeKeys[code] ? 1 : 0
					break
				}
				case 'input_mouse_pos': {
					// Нужно где-то хранить mouseX/Y глобально. Добавим листенер в init.
					gameVariables[v[0]] = window.mouseX || 0
					gameVariables[v[1]] = window.mouseY || 0
					break
				}
				case 'input_touch': {
					gameVariables[v[0]] = window.isTouching ? 1 : 0
					break
				}

				// --- МАТЕМАТИКА ---
				case 'var_math': {
					const varName = v[0]
					const val1 = parseFloat(resolveValue(v[1])) || 0
					const op = v[2]
					const val2 = parseFloat(resolveValue(v[3])) || 0 // Используется только для бинарных операций (+, -, min...)

					let res = 0

					switch (op) {
						// Базовые операции (Нужны А и Б)
						case '+':
							res = val1 + val2
							break
						case '-':
							res = val1 - val2
							break
						case '*':
							res = val1 * val2
							break
						case '/':
							res = val2 !== 0 ? val1 / val2 : 0
							break
						case '%':
							res = val1 % val2
							break
						case '^':
						case 'pow':
							res = Math.pow(val1, val2)
							break

						// Сравнение (Нужны А и Б)
						case 'min':
							res = Math.min(val1, val2)
							break
						case 'max':
							res = Math.max(val1, val2)
							break
						case 'random':
							res = Math.random() * (val2 - val1) + val1
							break // Рандом float между А и Б

						// Одиночные операции (Нужно только А, "Число Б" игнорируется)
						case 'sqrt':
							res = Math.sqrt(val1)
							break // Корень
						case 'abs':
							res = Math.abs(val1)
							break // Модуль
						case 'round':
							res = Math.round(val1)
							break // Округление
						case 'floor':
							res = Math.floor(val1)
							break // Округление вниз
						case 'ceil':
							res = Math.ceil(val1)
							break // Округление вверх

						// Тригонометрия (Вход в радианах)
						case 'sin':
							res = Math.sin(val1)
							break
						case 'cos':
							res = Math.cos(val1)
							break
						case 'tan':
							res = Math.tan(val1)
							break
						case 'asin':
							res = Math.asin(val1)
							break
						case 'acos':
							res = Math.acos(val1)
							break
						case 'atan':
							res = Math.atan(val1)
							break // Обычно atan2 полезнее, но для простоты atan

						// Конвертация
						case 'deg2rad':
							res = val1 * (Math.PI / 180)
							break // Градусы -> Радианы
						case 'rad2deg':
							res = val1 * (180 / Math.PI)
							break // Радианы -> Градусы

						// Логарифмы
						case 'log':
						case 'ln':
							res = Math.log(val1)
							break // Натуральный
						case 'log10':
							res = Math.log10(val1)
							break
						case 'exp':
							res = Math.exp(val1)
							break

						default:
							res = val1
							break
					}

					gameVariables[varName] = res
					if (typeof updateDynamicText === 'function') updateDynamicText()
					break
				}
				case 'var_random': {
					const varName = v[0]
					const min = parseFloat(v[1])
					const max = parseFloat(v[2])
					// Рандом целое число
					gameVariables[varName] =
						Math.floor(Math.random() * (max - min + 1)) + min
					break
				}

				// --- ОБЪЕКТЫ ---
				case 'obj_get_pos': {
					const el = document.getElementById(v[0])
					if (el) {
						gameVariables[v[1]] = parseFloat(el.style.left) || 0 // X
						gameVariables[v[2]] = parseFloat(el.style.top) || 0 // Y
					}
					break
				}

				// --- КАМЕРА ---
				case 'cam_zoom_to': {
					const targetZoom = parseFloat(v[0])
					const duration = parseFloat(v[1])

					// Простая анимация через CSS transition не сработает для переменной JS,
					// поэтому делаем "хак" - запускаем интервал в updateCamera
					// Но для простоты сейчас сделаем мгновенно или через css transition на world
					const world = document.getElementById('game-world')
					if (world) {
						world.style.transition = `transform ${duration}s ease-in-out`
						cameraState.zoom = targetZoom
						// updateCamera вызовется в лупе и применит зум
					}
					break
				}

				// --- ВЫПОЛНЕНИЕ КОДА ---
				case 'sys_exec_js': {
					const code = v[0] // Получаем текст кода из блока

					try {
						// 1. Ищем HTML элемент текущего объекта (если скрипт привязан к объекту)
						// В Ecrous activeObjectId - это текущий выбранный в редакторе,
						// но во время игры нам нужен ТЕКУЩИЙ, чей скрипт выполняется.
						// Пока передадим document.getElementById, чтобы пользователь сам искал.

						// 2. Создаем функцию из строки
						// Мы передаем внутрь удобные переменные, чтобы пользователю было легче
						const runCode = new Function(
							'gameVariables',
							'container',
							'window',
							'document',
							code
						)

						// 3. Запускаем
						const stage = document.getElementById('game-stage')
						runCode(gameVariables, stage, window, document)

						// Если код менял переменные, обновим текст на экране
						if (typeof updateDynamicText === 'function') updateDynamicText()
					} catch (err) {
						console.error('ОШИБКА В JS БЛОКЕ:', err)
						// Выводим ошибку в игровую консоль
						const con = document.getElementById('game-console')
						if (con)
							con.innerHTML += `<div class="console-error" style="color:#ff5f56">JS Error: ${err.message}</div>`
					}
					break
				}

				// --- ЛОГИКА+ ---
				case 'logic_obj_exists': {
					const el = document.getElementById(v[0])
					gameVariables[v[1]] = el ? 1 : 0
					break
				}
				case 'logic_is_visible': {
					const el = document.getElementById(v[0])
					if (!el) {
						gameVariables[v[1]] = 0
					} else {
						// Проверяем display и visibility
						const style = window.getComputedStyle(el)
						const visible =
							style.display !== 'none' &&
							style.visibility !== 'hidden' &&
							style.opacity !== '0'
						gameVariables[v[1]] = visible ? 1 : 0
					}
					break
				}
				case 'interact_dist': {
					const a = document.getElementById(v[0])
					const b = document.getElementById(v[1])
					if (a && b) {
						// Центры объектов
						const r1 = a.getBoundingClientRect()
						const r2 = b.getBoundingClientRect()
						const x1 = r1.left + r1.width / 2
						const y1 = r1.top + r1.height / 2
						const x2 = r2.left + r2.width / 2
						const y2 = r2.top + r2.height / 2
						// Дистанция
						const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
						// Нормализуем относительно зума
						gameVariables[v[2]] = dist / (window.zoomLevel || 1)
					} else {
						gameVariables[v[2]] = 999999
					}
					break
				}
				case 'zone_check': {
					const me = document.getElementById(v[0])
					const zone = document.getElementById(v[1])
					let result = 0
					if (me && zone) {
						const r1 = me.getBoundingClientRect()
						const r2 = zone.getBoundingClientRect()
						// AABB проверка пересечения
						if (
							!(
								r2.left > r1.right ||
								r2.right < r1.left ||
								r2.top > r1.bottom ||
								r2.bottom < r1.top
							)
						) {
							result = 1
						}
					}
					gameVariables[v[2]] = result
					break
				}

				// --- STATE / TAGS ---
				case 'state_set': {
					const el = document.getElementById(v[0])
					if (el) el.dataset.state = v[1]
					break
				}
				case 'state_get': {
					const el = document.getElementById(v[0])
					gameVariables[v[1]] = el ? el.dataset.state || '' : ''
					break
				}
				case 'tag_add': {
					const el = document.getElementById(v[0])
					if (el) el.classList.add(`tag_${v[1]}`)
					break
				}
				case 'tag_check': {
					const el = document.getElementById(v[0])
					const has = el && el.classList.contains(`tag_${v[1]}`)
					gameVariables[v[2]] = has ? 1 : 0
					break
				}

				// --- AI (Step) ---
				case 'ai_move_to': {
					const me = document.getElementById(v[0])
					const target = document.getElementById(v[1])
					const speed = parseFloat(v[2])
					if (me && target) {
						// Текущие позиции (без учета transform scale для простоты)
						const mx = parseFloat(me.style.left || 0)
						const my = parseFloat(me.style.top || 0)
						const tx = parseFloat(target.style.left || 0)
						const ty = parseFloat(target.style.top || 0)

						// Вектор
						const dx = tx - mx
						const dy = ty - my
						const dist = Math.sqrt(dx * dx + dy * dy)

						if (dist > speed) {
							me.style.left = mx + (dx / dist) * speed + 'px'
							me.style.top = my + (dy / dist) * speed + 'px'
						}
					}
					break
				}
				case 'ai_flee': {
					const me = document.getElementById(v[0])
					const target = document.getElementById(v[1])
					const speed = parseFloat(v[2])
					if (me && target) {
						const mx = parseFloat(me.style.left || 0)
						const my = parseFloat(me.style.top || 0)
						const tx = parseFloat(target.style.left || 0)
						const ty = parseFloat(target.style.top || 0)

						// Вектор ОТ цели
						const dx = mx - tx
						const dy = my - ty
						const dist = Math.sqrt(dx * dx + dy * dy)

						if (dist > 0) {
							me.style.left = mx + (dx / dist) * speed + 'px'
							me.style.top = my + (dy / dist) * speed + 'px'
						}
					}
					break
				}

				// --- INPUT AXIS ---
				case 'input_axis': {
					const codeMin = v[0]
					const codeMax = v[1]
					let val = 0
					if (activeKeys[codeMin]) val -= 1
					if (activeKeys[codeMax]) val += 1
					gameVariables[v[2]] = val
					break
				}

				// --- VFX ---
				case 'fx_screen_color': {
					const color = v[0]
					const time = parseFloat(v[1]) * 1000

					let overlay = document.getElementById('fx-overlay-color')
					if (!overlay) {
						overlay = document.createElement('div')
						overlay.id = 'fx-overlay-color'
						overlay.style.position = 'absolute'
						overlay.style.top = 0
						overlay.style.left = 0
						overlay.style.width = '100%'
						overlay.style.height = '100%'
						overlay.style.pointerEvents = 'none'
						overlay.style.zIndex = '9999'
						overlay.style.transition = `background ${time / 2}ms`
						document.getElementById('game-stage').appendChild(overlay)
					}

					// Вспышка
					overlay.style.background = color
					setTimeout(() => {
						overlay.style.background = 'transparent'
					}, time)
					break
				}
				case 'fx_shake': {
					const id = v[0]
					const power = parseFloat(v[1])
					const duration = parseFloat(v[2]) * 1000
					const el = document.getElementById(id)

					if (el) {
						const start = Date.now()
						const originTransform = el.style.transform

						const shakeInterval = setInterval(() => {
							const now = Date.now()
							if (now - start > duration) {
								clearInterval(shakeInterval)
								el.style.transform = originTransform
								return
							}
							const dx = (Math.random() - 0.5) * power
							const dy = (Math.random() - 0.5) * power
							el.style.transform = `${originTransform} translate(${dx}px, ${dy}px)`
						}, 16)
					}
					break
				}

				// --- PREFABS (CLONE) ---
				case 'obj_spawn_clone': {
					const original = document.getElementById(v[0])
					const newName = resolveValue(v[1])
					const x = parseFloat(resolveValue(v[2]))
					const y = parseFloat(resolveValue(v[3]))

					if (original) {
						const clone = original.cloneNode(true)
						clone.id = newName
						clone.style.left = x + 'px'
						clone.style.top = y + 'px'
						// Снимаем скрытие, если оригинал был префабом (скрытым)
						clone.style.display = 'block'

						// Удаляем класс "ui-draggable" если он был из редактора
						clone.classList.remove('ui-draggable', 'ui-draggable-handle')

						document.getElementById('game-world').appendChild(clone)

						// Важно: если у объекта была физика, ее надо добавить вручную через блок "Вкл Физику",
						// либо копировать запись из physicsObjects.
						// Для простоты пока просто клонируем DOM.
					}
					break
				}
				case 'obj_set_visible': {
					const el = document.getElementById(v[0]) // Находим объект по ID
					if (el) {
						const mode = v[1] // hide, show, toggle

						if (mode === 'hide') {
							el.style.display = 'none'
						} else if (mode === 'show') {
							// Восстанавливаем отображение (обычно block подходит для div)
							el.style.display = 'block'
						} else if (mode === 'toggle') {
							// Если сейчас 'none', то показываем, иначе скрываем
							if (el.style.display === 'none') {
								el.style.display = 'block'
							} else {
								el.style.display = 'none'
							}
						}
					}
					break
				}

				// --- КОМПОНЕНТЫ ---
				case 'comp_add':
				case 'comp_set': {
					const id = v[0]
					const comp = v[1]
					const val = resolveValue(v[2])

					if (!window.entityComponents[id]) window.entityComponents[id] = {}
					window.entityComponents[id][comp] = val
					break
				}
				case 'comp_get': {
					const id = v[0]
					const comp = v[1]
					const targetVar = v[2]

					let val = 0
					if (
						window.entityComponents[id] &&
						window.entityComponents[id][comp] !== undefined
					) {
						val = window.entityComponents[id][comp]
					}
					gameVariables[targetVar] = val
					break
				}
				case 'comp_has': {
					const id = v[0]
					const comp = v[1]
					let has =
						window.entityComponents[id] &&
						window.entityComponents[id][comp] !== undefined
					gameVariables[v[2]] = has ? 1 : 0
					break
				}

				// --- СОБЫТИЯ (MESSAGING) ---
				case 'evt_message_send': {
					const eventName = resolveValue(v[0])
					const param = resolveValue(v[1])

					// Сохраняем параметр глобально, чтобы получатель мог его прочитать
					gameVariables['event_param'] = param

					// ХАК: Ищем во всей сцене блоки "При событии" и запускаем их
					// Это позволяет не менять архитектуру game.js
					if (window.globalCurrentSceneData) {
						const allObjs = window.globalCurrentSceneData.objects
						allObjs.forEach(obj => {
							if (!obj.scripts) return
							const listeners = obj.scripts.filter(
								b =>
									b.type === 'evt_message_receive' && b.values[0] === eventName
							)
							listeners.forEach(block => {
								// Запускаем асинхронно
								executeChain(block, obj.scripts, obj.connections)
							})
						})
					}
					console.log(`[Event] Sent: ${eventName} (${param})`)
					break
				}

				// --- ДИАЛОГИ ---
				case 'ui_dialog_show': {
					return new Promise(resolve => {
						// Считываем параметры
						const name = resolveValue(v[0]) || 'NPC'
						const text = resolveValue(v[1]) || '...' // Защита от пустого текста
						const avaUrl = resolveValue(v[2])
						const showAvatar = v[3] === 'yes'
						const position = v[4] || 'bottom'
						const style = v[5] || 'classic'
						const closeMode = v[6] || 'click_anywhere'
						const statusVar = v[7]

						const old = document.getElementById('game-dialog-overlay')
						if (old) old.remove()

						const dlg = document.createElement('div')
						dlg.id = 'game-dialog-overlay'

						// Переменные для цветов
						let bgColor = 'rgba(0, 0, 0, 0.85)'
						let textColor = '#ffffff'
						let nameColor = '#ff9800'
						let borderColor = '#ffffff'
						let borderRadius = '8px'
						let boxCSS = ''

						// --- НАСТРОЙКА СТИЛЕЙ ---
						if (style === 'pixel') {
							bgColor = '#2d2d2d'
							textColor = '#ffffff'
							borderColor = '#ffffff'
							borderRadius = '0'
							nameColor = '#ffcc00'
							boxCSS = `
                left: 0; width: 100%;
                border-top: 4px solid ${borderColor}; 
                border-bottom: 4px solid ${borderColor};
                font-family: 'Courier New', monospace;
                image-rendering: pixelated;
                ${
									position === 'center'
										? ''
										: position === 'top'
										? 'top:0;'
										: 'bottom:0;'
								}
            `
						} else if (style === 'modern') {
							bgColor = 'rgba(255, 255, 255, 0.95)'
							textColor = '#333333' // Темный текст для светлого фона
							borderColor = 'transparent'
							borderRadius = '12px'
							nameColor = '#E91E63'
							boxCSS = `
                left: 50%; width: 600px; max-width: 90%;
                ${
									position === 'center'
										? 'transform: translate(-50%, -50%);'
										: 'transform: translateX(-50%);'
								}
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                font-family: sans-serif;
            `
						} else {
							// Classic
							boxCSS = `
                left: 5%; width: 90%;
                border: 2px solid ${borderColor};
                font-family: monospace;
                ${position === 'center' ? 'transform: translateY(-50%);' : ''}
            `
						}

						// --- ПОЗИЦИЯ (TOP / BOTTOM / CENTER) ---
						let posCSS = ''
						if (style !== 'pixel') {
							// Pixel прижимается сам
							if (position === 'top') posCSS = 'top: 20px; bottom: auto;'
							else if (position === 'center') posCSS = 'top: 50%; bottom: auto;'
							else posCSS = 'bottom: 20px; top: auto;'
						}

						// Применяем стили контейнера
						dlg.style.cssText = `
            position: absolute; z-index: 10000; 
            display: flex; align-items: flex-start; gap: 15px;
            box-sizing: border-box; padding: 15px;
            transition: opacity 0.3s; opacity: 0;
            background: ${bgColor};
            color: ${textColor};
            border-radius: ${borderRadius};
            ${posCSS}
            ${boxCSS}
        `

						// --- АВАТАР ---
						let htmlAvatar = ''
						if (showAvatar && avaUrl) {
							htmlAvatar = `<img src="${getAssetUrl(avaUrl)}" style="
                width: 60px; height: 60px; object-fit: cover; flex-shrink: 0;
                border-radius: ${style === 'pixel' ? '0' : '50%'}; 
                border: 2px solid rgba(255,255,255,0.2);
            ">`
						}

						// --- КОНТЕНТ (С ЯВНЫМ ЦВЕТОМ ТЕКСТА) ---
						let htmlContent = `
            ${htmlAvatar}
            <div style="flex:1; min-width: 0;"> 
                <div style="font-weight:bold; color:${nameColor}; margin-bottom:6px; font-size:1.1em;">
                    ${name}
                </div>
                <div style="
                    line-height:1.4; 
                    white-space: pre-wrap; 
                    word-wrap: break-word; 
                    color: ${textColor}; 
                ">${text}</div>
            </div>
        `

						// --- КНОПКА ЗАКРЫТИЯ ---
						let btnHtml = ''
						if (closeMode === 'button_next') {
							btnHtml = `
                <button id="dlg-next-btn" style="
                    align-self: flex-end; margin-left:10px; flex-shrink:0;
                    background: ${style === 'modern' ? '#E91E63' : '#fff'}; 
                    color: ${style === 'modern' ? '#fff' : '#000'}; 
                    border: none; padding: 8px 16px; border-radius: 4px; 
                    font-weight: bold; cursor: pointer;
                ">OK</button>
            `
						} else if (closeMode === 'click_anywhere') {
							btnHtml = `<div style="position:absolute; bottom:5px; right:10px; font-size:10px; opacity:0.5;">▼</div>`
						}

						dlg.innerHTML = htmlContent + btnHtml
						document.getElementById('game-stage').appendChild(dlg)

						requestAnimationFrame(() => (dlg.style.opacity = '1'))

						// Логика закрытия
						const closeDialog = () => {
							dlg.style.opacity = '0'
							setTimeout(() => {
								if (dlg.parentNode) dlg.parentNode.removeChild(dlg)
								if (statusVar) gameVariables[statusVar] = 1
								resolve()
							}, 250)
						}

						if (closeMode === 'wait_3s') {
							setTimeout(closeDialog, 3000)
						} else if (closeMode === 'button_next') {
							const btn = document.getElementById('dlg-next-btn')
							if (btn)
								btn.onclick = e => {
									e.stopPropagation()
									closeDialog()
								}
						} else {
							setTimeout(() => {
								dlg.onclick = closeDialog
							}, 100)
						}
					})
				}
				case 'ui_dialog_hide': {
					const dlg = document.getElementById('game-dialog-overlay')
					if (dlg) dlg.style.display = 'none'
					break
				}

				// --- ИНВЕНТАРЬ ---
				case 'inv_add': {
					const item = resolveValue(v[0])
					if (!window.gameInventory.includes(item)) {
						window.gameInventory.push(item)
					}
					break
				}
				case 'inv_has': {
					const item = resolveValue(v[0])
					gameVariables[v[1]] = window.gameInventory.includes(item) ? 1 : 0
					break
				}

				// --- КВЕСТЫ ---
				case 'quest_set': {
					const qId = v[0]
					const stage = resolveValue(v[1])
					window.gameQuests[qId] = stage
					break
				}

				// --- ГРАФИКА (СВЕТ/ЭФФЕКТЫ) ---
				case 'gfx_light_ambient': {
					const val = parseFloat(v[0])
					let amb = document.getElementById('gfx-ambient')
					if (!amb) {
						amb = document.createElement('div')
						amb.id = 'gfx-ambient'
						amb.style.cssText =
							'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:500; mix-blend-mode: multiply;'
						document.getElementById('game-stage').appendChild(amb)
					}
					// Инвертируем: 1.0 ярко -> прозрачный слой, 0.0 темно -> черный слой
					const alpha = 1.0 - val
					amb.style.backgroundColor = `rgba(0,0,0,${alpha})`
					break
				}
				case 'gfx_light_point': {
					const el = document.getElementById(v[0])
					if (el) {
						const color = v[1]
						const radius = v[2] + 'px'
						const intensity = v[3]
						// Используем box-shadow для симуляции света
						el.style.boxShadow = `0 0 ${radius} ${
							parseFloat(radius) / 4
						}px ${color}`
						el.style.zIndex = '501' // Поверх затенения (нужен хак с изоляцией, но для 2D сойдет)
						// ХАК: Чтобы свет "пробивал" ambient, нужно использовать сложную структуру слоев.
						// Для простоты пока делаем просто свечение (glow).
					}
					break
				}
				case 'gfx_particles': {
					const x = parseFloat(v[0])
					const y = parseFloat(v[1])
					const color = v[2]
					const count = parseInt(v[3])
					const stage = document.getElementById('game-stage')

					for (let i = 0; i < count; i++) {
						const p = document.createElement('div')
						p.style.cssText = `position:absolute; left:${x}px; top:${y}px; width:4px; height:4px; background:${color}; border-radius:50%; pointer-events:none; z-index:1000;`
						stage.appendChild(p)

						// Случайный разлет
						const angle = Math.random() * Math.PI * 2
						const speed = Math.random() * 50 + 20
						const tx = Math.cos(angle) * speed
						const ty = Math.sin(angle) * speed

						// Анимация JS
						p.animate(
							[
								{ transform: 'translate(0,0) scale(1)', opacity: 1 },
								{
									transform: `translate(${tx}px, ${ty}px) scale(0)`,
									opacity: 0,
								},
							],
							{
								duration: 500 + Math.random() * 500,
								easing: 'ease-out',
							}
						).onfinish = () => p.remove()
					}
					break
				}
				case 'gfx_filter': {
					const type = v[0]
					const val = v[1]
					const stage = document.getElementById('game-stage')
					if (type === 'none') {
						stage.style.filter = 'none'
					} else {
						// Формируем строку фильтра
						let fStr = ''
						if (type === 'blur') fStr = `blur(${val / 10}px)`
						else if (type === 'contrast') fStr = `contrast(${val}%)`
						else fStr = `${type}(${val}%)`
						stage.style.filter = fStr
					}
					break
				}

				// --- ВИДЕО ---
				case 'video_load': {
					const vidId = v[0]
					const src = getAssetUrl(resolveValue(v[1]))
					const wVal = resolveValue(v[2])
					const hVal = resolveValue(v[3])
					const zIdx = resolveValue(v[4])

					// Удаляем старое, если есть
					const old = document.getElementById(vidId)
					if (old) old.remove()

					const vid = document.createElement('video')
					vid.id = vidId
					vid.src = src
					vid.style.position = 'absolute'
					vid.style.left = '0'
					vid.style.top = '0'
					vid.style.width = wVal
					vid.style.height = hVal
					vid.style.objectFit = 'cover' // Чтобы не искажалось
					vid.style.zIndex = zIdx

					// Скрываем элементы управления браузера
					vid.controls = false

					// Добавляем обработчик окончания для события video_on_end
					vid.onended = () => {
						// Ищем триггеры в сцене (ХАК: используем globalCurrentSceneData)
						if (window.globalCurrentSceneData) {
							window.globalCurrentSceneData.objects.forEach(obj => {
								if (!obj.scripts) return
								const triggers = obj.scripts.filter(
									b => b.type === 'video_on_end' && b.values[0] === vidId
								)
								triggers.forEach(trig =>
									executeChain(trig, obj.scripts, obj.connections)
								)
							})
						}
					}

					// Куда добавляем? Если z-index высокий, можно прямо в stage, но лучше в UI слой если это интерфейс
					// Для простоты кидаем в game-stage
					document.getElementById('game-stage').appendChild(vid)
					break
				}

				case 'video_control': {
					const vid = document.getElementById(v[0])
					const action = v[1]
					if (vid) {
						if (action === 'play') vid.play().catch(e => console.warn(e))
						else if (action === 'pause') vid.pause()
						else if (action === 'stop') {
							vid.pause()
							vid.currentTime = 0
						} else if (action === 'remove') vid.remove()
					}
					break
				}

				case 'video_settings': {
					const vid = document.getElementById(v[0])
					if (vid) {
						vid.volume = parseFloat(resolveValue(v[1]))
						vid.loop = v[2] === '1' || v[2] === 'true'
						vid.style.opacity = resolveValue(v[3])
					}
					break
				}

				case 'game_pause': {
					isGamePaused = v[0] === '1' || v[0] === 'true'
					// Можно добавить визуал паузы
					if (isGamePaused) {
						document.getElementById('game-stage').style.filter =
							'grayscale(100%)'
					} else {
						document.getElementById('game-stage').style.filter = 'none'
					}
					break
				}

				case 'game_restart': {
					// Сброс всего и перезагрузка сцены
					// Можно вызвать runProject(), но лучше мягкую перезагрузку:
					const current = projectData.scenes.find(s => s.id === runtimeSceneId)
					if (current) {
						// Очищаем переменные если нужно, или оставляем
						gameVariables = {}
						activeKeys = {}
						loadRuntimeScene(current)
						return // Прерываем цепочку
					}
					break
				}

				case 'game_over_screen': {
					isGamePaused = true
					const stage = document.getElementById('game-stage')

					const screen = document.createElement('div')
					screen.style.cssText = `
        position: absolute; top:0; left:0; width:100%; height:100%;
        background: rgba(0,0,0,0.85); display: flex; flex-direction: column;
        align-items: center; justify-content: center; z-index: 9999; color: white;
    `

					screen.innerHTML = `
        <h1 style="font-size: 60px; color: #ff3d00; margin-bottom: 20px;">${resolveValue(
					v[0]
				)}</h1>
        <button id="btn-restart-go" style="padding: 15px 30px; font-size: 24px; cursor: pointer; background: #fff; color: #000; border: none; border-radius: 5px;">
            RETRY
        </button>
    `

					stage.appendChild(screen)

					// Логика кнопки
					document.getElementById('btn-restart-go').onclick = () => {
						screen.remove()
						isGamePaused = false
						// Триггерим рестарт
						const current = projectData.scenes.find(
							s => s.id === runtimeSceneId
						)
						if (current) {
							gameVariables = {}
							loadRuntimeScene(current)
						}
					}
					break
				}

				case 'pp_filter_set': {
					const type = v[0]
					const val = parseFloat(resolveValue(v[1]))
					const world = document.getElementById('game-world')

					if (world) {
						// Формируем строку CSS фильтра
						let filterStr = ''
						if (type === 'blur') filterStr = `blur(${val}px)`
						else if (type === 'hue-rotate') filterStr = `hue-rotate(${val}deg)`
						else if (
							type === 'contrast' ||
							type === 'brightness' ||
							type === 'saturate'
						)
							filterStr = `${type}(${val}%)`
						else filterStr = `${type}(${val}%)` // grayscale, sepia, invert

						// Применяем (заменяет предыдущий фильтр, для комбинации нужна более сложная логика)
						// Но для простоты пока перезаписываем
						world.style.filter = filterStr
					}
					break
				}

				case 'pp_vignette': {
					const isOn = v[0] === '1' || v[0] === 'true'
					const strength = parseFloat(resolveValue(v[1]))
					const color = v[2]
					const stage = document.getElementById('game-stage')

					// Удаляем старую
					const old = document.getElementById('pp-overlay-vignette')
					if (old) old.remove()

					if (isOn) {
						const div = document.createElement('div')
						div.id = 'pp-overlay-vignette'
						div.style.cssText = `
            position: absolute; top:0; left:0; width:100%; height:100%; pointer-events: none; z-index: 800;
            background: radial-gradient(circle, transparent 50%, ${color} 100%);
            opacity: ${strength};
            mix-blend-mode: multiply;
        `
						stage.appendChild(div)
					}
					break
				}

				case 'pp_crt_effect': {
					const isOn = v[0] === '1' || v[0] === 'true'
					const opacity = parseFloat(resolveValue(v[1]))
					const stage = document.getElementById('game-stage')

					const old = document.getElementById('pp-overlay-crt')
					if (old) old.remove()

					if (isOn) {
						const div = document.createElement('div')
						div.id = 'pp-overlay-crt'
						div.style.cssText = `
            position: absolute; top:0; left:0; width:100%; height:100%; pointer-events: none; z-index: 9990;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            background-size: 100% 4px, 6px 100%;
            opacity: ${opacity};
        `
						stage.appendChild(div)
					}
					break
				}

				case 'pp_chromatic': {
					const isOn = v[0] === '1' || v[0] === 'true'
					const shift = resolveValue(v[1]) // пиксели
					const world = document.getElementById('game-world')

					if (world) {
						if (isOn) {
							// CSS хак для хроматической аберрации через text-shadow работает только для текста,
							// для всего мира используем просто цветовой сдвиг через фильтры или наложение.
							// Самый простой способ имитации глитча на DOM:
							world.style.textShadow = `${shift}px 0 red, -${shift}px 0 blue`
							// А для картинок используем drop-shadow (дорого для производительности, но красиво)
							// Но лучше просто сместить каналы. Сделаем "тряску" цветов:
							world.style.filter = `drop-shadow(${shift}px 0 0 rgba(255,0,0,0.5)) drop-shadow(-${shift}px 0 0 rgba(0,0,255,0.5))`
						} else {
							world.style.textShadow = 'none'
							world.style.filter = 'none'
						}
					}
					break
				}

				case 'pp_bloom_fake': {
					const isOn = v[0] === '1' || v[0] === 'true'
					const val = parseFloat(resolveValue(v[1]))
					const world = document.getElementById('game-world')

					if (world) {
						if (isOn) {
							// Комбинация яркости и контраста дает эффект "выжигания" цветов (Bloom)
							world.style.filter = `brightness(${val}) contrast(1.1) saturate(1.2)`
						} else {
							world.style.filter = 'none'
						}
					}
					break
				}

				case 'pp_clear_all': {
					const world = document.getElementById('game-world')
					const stage = document.getElementById('game-stage')

					if (world) {
						world.style.filter = 'none'
						world.style.textShadow = 'none'
					}

					// Удаляем оверлеи по ID
					;['pp-overlay-vignette', 'pp-overlay-crt'].forEach(id => {
						const el = document.getElementById(id)
						if (el) el.remove()
					})
					break
				}

				// --- ИСПРАВЛЕННЫЙ UI_ANCHOR (сохраняет повороты) ---
				case 'ui_anchor': {
					const el = document.getElementById(v[0])
					const anchor = v[1]
					const offX = parseFloat(resolveValue(v[2])) || 0
					const offY = parseFloat(resolveValue(v[3])) || 0

					if (el) {
						el.style.left = 'auto'
						el.style.right = 'auto'
						el.style.top = 'auto'
						el.style.bottom = 'auto'
						el.style.position = 'absolute'
						el.style.margin = '0'

						// Получаем текущие трансформации (например, поворот), кроме трансляции
						let currentTransform = el.style.transform || ''
						// Убираем старые трансляции, чтобы не дублировать, если они были
						// (простая регулярка, может быть не идеальной, но рабочей для простых случаев)
						currentTransform = currentTransform
							.replace(/translate\([^)]+\)/g, '')
							.replace(/translateX\([^)]+\)/g, '')
							.replace(/translateY\([^)]+\)/g, '')
							.trim()

						let newTranslate = ''

						switch (anchor) {
							case 'top-left':
								el.style.left = offX + 'px'
								el.style.top = offY + 'px'
								break
							case 'top-center':
								el.style.left = '50%'
								el.style.top = offY + 'px'
								newTranslate = `translateX(calc(-50% + ${offX}px))`
								break
							case 'top-right':
								el.style.right = offX + 'px'
								el.style.top = offY + 'px'
								break

							case 'center-left':
								el.style.left = offX + 'px'
								el.style.top = '50%'
								newTranslate = `translateY(calc(-50% + ${offY}px))`
								break
							case 'center':
								el.style.left = '50%'
								el.style.top = '50%'
								newTranslate = `translate(calc(-50% + ${offX}px), calc(-50% + ${offY}px))`
								break
							case 'center-right':
								el.style.right = offX + 'px'
								el.style.top = '50%'
								newTranslate = `translateY(calc(-50% + ${offY}px))`
								break

							case 'bottom-left':
								el.style.left = offX + 'px'
								el.style.bottom = offY + 'px'
								break
							case 'bottom-center':
								el.style.left = '50%'
								el.style.bottom = offY + 'px'
								newTranslate = `translateX(calc(-50% + ${offX}px))`
								break
							case 'bottom-right':
								el.style.right = offX + 'px'
								el.style.bottom = offY + 'px'
								break

							case 'stretch-full':
								el.style.left = '0'
								el.style.top = '0'
								el.style.width = '100%'
								el.style.height = '100%'
								break
						}

						// Применяем комбинацию (сначала сдвиг, потом старые трансформации типа поворота)
						if (newTranslate) {
							el.style.transform = `${newTranslate} ${currentTransform}`
						} else {
							el.style.transform = currentTransform // Возвращаем поворот, если трансляция не нужна
						}
					}
					break
				}
				case 'cam_set_parallax': {
					const target = v[0]
					const factor = v[1]

					// Пытаемся найти объект
					const el = document.getElementById(target)
					if (el) {
						el.dataset.parallax = factor
					} else {
						// Или ищем группу
						const grp = document.querySelectorAll(`.grp_${target}`)
						grp.forEach(item => (item.dataset.parallax = factor))
					}
					break
				}

				case 'ai_move_smart': {
					const me = document.getElementById(v[0])
					const target = document.getElementById(v[1])
					const speed = parseFloat(v[2])
					const mapData = gameVariables[v[3]] // Ожидаем массив [[0,1]...]

					if (me && target && mapData) {
						// Конвертируем координаты пикселей в координаты клетки
						const tileSize = 32 // Должно совпадать с размером тайла

						const myGridX = Math.floor(parseFloat(me.style.left) / tileSize)
						const myGridY = Math.floor(parseFloat(me.style.top) / tileSize)
						const targetGridX = Math.floor(
							parseFloat(target.style.left) / tileSize
						)
						const targetGridY = Math.floor(
							parseFloat(target.style.top) / tileSize
						)

						// Получаем путь (кэшируем, чтобы не считать каждый кадр!)
						// ХАК: Храним путь прямо в DOM элементе, чтобы помнить его
						if (
							!me.currentPath ||
							me.pathTarget !== `${targetGridX},${targetGridY}`
						) {
							me.currentPath = findPath(
								mapData,
								myGridX,
								myGridY,
								targetGridX,
								targetGridY
							)
							me.pathTarget = `${targetGridX},${targetGridY}`
							me.pathStep = 0
						}

						// Двигаемся к следующей точке пути
						if (me.currentPath && me.currentPath[0]) {
							const nextNode = me.currentPath[0]
							const targetX = nextNode.x * tileSize
							const targetY = nextNode.y * tileSize

							// Простая логика движения к точке (как в ai_move_to)
							// Когда дошли — me.currentPath.shift(), удаляем точку
						}
					}
					break
				}

				// --- 3D МИР ---
				case 'scene_3d_init': {
					const perspective = v[0]
					const stage = document.getElementById('game-stage')
					const world = document.getElementById('game-world')
					if (stage && world) {
						stage.style.perspective = perspective + 'px'
						stage.style.overflow = 'hidden' // Скрываем вылеты за экран
						world.style.transformStyle = 'preserve-3d' // Важно для вложенных 3D объектов
						// Центрируем мир, чтобы 0,0 был по центру экрана (опционально, но удобно для 3D)
						world.style.width = '100%'
						world.style.height = '100%'
					}

					// Добавляем CSS стили для куба, если их нет
					if (!document.getElementById('css-3d-styles')) {
						const style = document.createElement('style')
						style.id = 'css-3d-styles'
						style.innerHTML = `
							.ecr-cube { position: absolute; transform-style: preserve-3d; }
							.ecr-face { position: absolute; width: 100%; height: 100%; border: 1px solid rgba(0,0,0,0.1); display:flex; align-items:center; justify-content:center; font-size:20px; color:rgba(255,255,255,0.5); }
							.ecr-face.front  { transform: rotateY(  0deg) translateZ(calc(var(--s) / 2)); }
							.ecr-face.back   { transform: rotateY(180deg) translateZ(calc(var(--s) / 2)); }
							.ecr-face.right  { transform: rotateY( 90deg) translateZ(calc(var(--s) / 2)); }
							.ecr-face.left   { transform: rotateY(-90deg) translateZ(calc(var(--s) / 2)); }
							.ecr-face.top    { transform: rotateX( 90deg) translateZ(calc(var(--s) / 2)); }
							.ecr-face.bottom { transform: rotateX(-90deg) translateZ(calc(var(--s) / 2)); }
						`
						document.head.appendChild(style)
					}
					break
				}

				case 'obj_3d_create_cube': {
					const id = v[0]
					if (document.getElementById(id)) break // Не создаем дубликат

					const size = parseInt(resolveValue(v[1]))
					const color = resolveValue(v[2])
					const x = resolveValue(v[3])
					const y = resolveValue(v[4])
					const z = resolveValue(v[5])

					const cube = document.createElement('div')
					cube.id = id
					cube.className = 'ecr-cube'
					cube.style.width = size + 'px'
					cube.style.height = size + 'px'
					cube.style.setProperty('--s', size + 'px') // Для CSS переменных

					// Начальная позиция
					cube.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`

					// Затемнение сторон для объема
					const darken = (col, amt) => {
						// Простая имитация затемнения (можно улучшить)
						return col
					}

					// Создаем 6 граней
					const faces = ['front', 'back', 'right', 'left', 'top', 'bottom']
					// Разные оттенки для реализма
					const shades = [1, 0.8, 0.6, 0.6, 1.2, 0.4]

					faces.forEach((face, i) => {
						const el = document.createElement('div')
						el.className = `ecr-face ${face}`
						el.style.backgroundColor = color
						el.style.filter = `brightness(${shades[i]})` // Тень
						// Можно добавить opacity, если нужен прозрачный куб
						el.style.opacity = '0.9'
						cube.appendChild(el)
					})

					w.appendChild(cube)
					break
				}

				case 'obj_3d_transform': {
					const el = document.getElementById(v[0])
					if (el) {
						const x = resolveValue(v[1])
						const y = resolveValue(v[2])
						const z = resolveValue(v[3])
						const rx = resolveValue(v[4])
						const ry = resolveValue(v[5])
						const rz = resolveValue(v[6])

						// Используем translate3d для GPU ускорения
						el.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`
					}
					break
				}

				case 'obj_3d_rotate_anim': {
					const id = v[0]
					const sx = parseFloat(resolveValue(v[1]))
					const sy = parseFloat(resolveValue(v[2]))
					const sz = parseFloat(resolveValue(v[3]))

					// Используем глобальный объект для хранения состояния вращения 3D
					if (!window.anim3d) window.anim3d = {}
					if (!window.anim3d[id]) window.anim3d[id] = { rx: 0, ry: 0, rz: 0 }

					// Запускаем цикл (или добавляем в GameLoop, но здесь сделаем через интервал для простоты блока)
					// Лучше всего это делать в evt_update, но для простоты добавим data-атрибуты
					const el = document.getElementById(id)
					if (el) {
						// Читаем текущую трансформацию (упрощенно)
						// Хак: сохраняем скорость в dataset, а обновлять будем в gameLoop (если бы он поддерживал custom updates)
						// Но мы сделаем Interval, привязанный к объекту

						if (el.rotateInterval) clearInterval(el.rotateInterval)

						el.rotateInterval = setInterval(() => {
							if (!document.getElementById(id) || !isRunning) {
								clearInterval(el.rotateInterval)
								return
							}

							const state = window.anim3d[id]
							state.rx += sx
							state.ry += sy
							state.rz += sz

							// Нам нужно сохранить текущую позицию (translate), меняя только rotate
							// Парсинг transform сложный, поэтому мы предполагаем,
							// что этот блок используется ВМЕСТЕ с позиционированием или блокирует его.
							// Для полноценной работы лучше использовать переменные gameVariables для координат и блок "3D Трансформация" в Update.

							// УПРОЩЕННЫЙ ВАРИАНТ: Просто крутим, сбрасывая позицию (или берем из style)
							// Чтобы было круто, лучше использовать блок "3D Трансформация" внутри события "Каждый кадр".
							// Но если нужен авто-спиннер:
							const currentTrans =
								el.style.transform.match(/translate3d\([^)]+\)/)
							const posStr = currentTrans
								? currentTrans[0]
								: 'translate3d(0px,0px,0px)'

							el.style.transform = `${posStr} rotateX(${state.rx}deg) rotateY(${state.ry}deg) rotateZ(${state.rz}deg)`
						}, 16)
					}
					break
				}

				case 'cam_3d_move': {
					const x = resolveValue(v[0])
					const y = resolveValue(v[1])
					const z = resolveValue(v[2])
					const rotY = resolveValue(v[3])

					const world = document.getElementById('game-world')
					if (world) {
						// Двигаем МИР в противоположную сторону, чтобы создать эффект камеры
						// translateZ двигает мир ближе/дальше
						// rotateY вращает мир вокруг оси
						world.style.transform = `translateZ(${z}px) rotateY(${-rotY}deg) translate3d(${-x}px, ${-y}px, 0px)`
						// Важно: порядок трансформаций имеет значение!
					}
					break
				}
				// --- ПЛОСКОСТЬ (СТЕНА/ПОЛ) ---
				case 'obj_3d_create_plane': {
					const id = v[0]
					if (document.getElementById(id)) break

					const wVal = resolveValue(v[1])
					const hVal = resolveValue(v[2])
					const color = resolveValue(v[3])
					const x = resolveValue(v[4])
					const y = resolveValue(v[5])
					const z = resolveValue(v[6])
					const rx = resolveValue(v[7])

					const plane = document.createElement('div')
					plane.id = id
					plane.className = 'ecr-plane' // Новый класс
					plane.style.position = 'absolute'
					plane.style.width = wVal + 'px'
					plane.style.height = hVal + 'px'
					plane.style.backgroundColor = color
					// transform-style: preserve-3d не обязателен для листа, но полезен
					plane.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg)`

					// Центрируем точку трансформации
					plane.style.transformOrigin = 'center center'

					document.getElementById('game-world').appendChild(plane)
					break
				}

				// --- ЦИЛИНДР ---
				case 'obj_3d_create_cylinder': {
					const id = v[0]
					if (document.getElementById(id)) break

					const height = parseFloat(resolveValue(v[1]))
					const diameter = parseFloat(resolveValue(v[2]))
					const sides = parseInt(resolveValue(v[3])) || 8
					const color = resolveValue(v[4])
					const x = resolveValue(v[5])
					const y = resolveValue(v[6])
					const z = resolveValue(v[7])

					const container = document.createElement('div')
					container.id = id
					container.className = 'ecr-cylinder-group'
					container.style.position = 'absolute'
					container.style.transformStyle = 'preserve-3d'
					container.style.width = '0px' // Контейнер-точка
					container.style.height = '0px'
					container.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`

					// Математика цилиндра
					const angleStep = 360 / sides
					// Ширина одной грани (теорема косинусов или тангенс)
					// width = 2 * R * tan(PI/sides)
					const radius = diameter / 2
					const stripWidth = 2 * radius * Math.tan(Math.PI / sides) // Более точная формула
					// Или упрощенная: (diameter * Math.PI) / sides (дает небольшие щели, но проще)

					// Чуть увеличим ширину, чтобы закрыть щели CSS-рендеринга
					const finalStripWidth = stripWidth + 1

					for (let i = 0; i < sides; i++) {
						const strip = document.createElement('div')
						strip.style.position = 'absolute'
						strip.style.height = height + 'px'
						strip.style.width = finalStripWidth + 'px'
						strip.style.backgroundColor = color

						// Имитация затемнения (фейковое освещение)
						// Чем "боковее" грань, тем темнее
						// const brightness = 0.5 + 0.5 * Math.sin((i / sides) * Math.PI);
						// strip.style.filter = `brightness(${brightness})`;
						// Простой вариант: чередование цвета
						if (i % 2 === 0) strip.style.filter = 'brightness(0.9)'

						const angle = i * angleStep
						// Смещаем грань на радиус и поворачиваем
						// translateZ выталкивает грань из центра
						strip.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`

						// Центрируем стрип по горизонтали относительно контейнера
						strip.style.left = -finalStripWidth / 2 + 'px'
						strip.style.top = -height / 2 + 'px'

						container.appendChild(strip)
					}

					// Крышки (опционально, сложно сделать идеально круглыми в CSS, пока без них)

					document.getElementById('game-world').appendChild(container)
					break
				}

				// --- 3D СПРАЙТ (BILLBOARD) ---
				case 'obj_3d_billboard': {
					const id = v[0]
					if (document.getElementById(id)) break

					const url = getAssetUrl(resolveValue(v[1]))
					const wVal = resolveValue(v[2])
					const hVal = resolveValue(v[3])
					const x = resolveValue(v[4])
					const y = resolveValue(v[5])
					const z = resolveValue(v[6])

					const sprite = document.createElement('div')
					sprite.id = id
					sprite.style.position = 'absolute'
					sprite.style.width = wVal + 'px'
					sprite.style.height = hVal + 'px'
					sprite.style.backgroundImage = `url('${url}')`
					sprite.style.backgroundSize = 'contain'
					sprite.style.backgroundRepeat = 'no-repeat'
					sprite.style.backgroundPosition = 'center bottom' // Обычно персонажи стоят ногами на точке
					sprite.style.transformStyle = 'preserve-3d'

					// Важно: смещение origin вниз, чтобы Z был в ногах
					// sprite.style.transformOrigin = 'center bottom';

					// Начальная позиция
					// Мы центрируем div по X и Y, чтобы координаты были в центре спрайта
					sprite.style.transform = `translate3d(${x}px, ${y}px, ${z}px) translate(-50%, -100%)`

					// Сохраняем "базовую позицию" в dataset, чтобы потом вращать не сбивая координаты
					sprite.dataset.pos3d = JSON.stringify({ x, y, z })

					document.getElementById('game-world').appendChild(sprite)
					break
				}

				// --- ТЕКСТУРА ГРАНИ ---
				case 'obj_3d_set_face': {
					const cubeId = v[0]
					const faceClass = v[1] // front, back...
					const url = getAssetUrl(resolveValue(v[2]))

					const cube = document.getElementById(cubeId)
					if (cube) {
						const face = cube.querySelector(`.ecr-face.${faceClass}`)
						if (face) {
							face.style.backgroundImage = `url('${url}')`
							face.style.backgroundSize = 'cover'
							face.style.backgroundColor = 'transparent' // Убираем цвет, чтобы видеть PNG
							face.innerHTML = '' // Убираем отладочный текст
							face.style.border = 'none'
						}
					}
					break
				}

				// --- БИЛЛБОРДИНГ (ПОВОРОТ К КАМЕРЕ) ---
				case 'cam_3d_look_at': {
					const targetId = v[0]
					const el = document.getElementById(targetId)
					if (el) {
						// Нам нужно знать поворот мира (камеры), чтобы повернуть объект обратно
						// В Ecrous камера реализована через вращение мира
						const world = document.getElementById('game-world')

						// Парсим текущий поворот мира. Это сложно сделать точно из string,
						// поэтому лучше хранить состояние камеры глобально.
						// Предположим, вы использовали блок '3D Камера' и сохранили угол в gameVariables или window.camera3D

						// ХАК: Пытаемся найти rotateY в style мира
						let camRotY = 0
						if (world.style.transform) {
							const match = world.style.transform.match(
								/rotateY\(([-\d.]+)deg\)/
							)
							if (match) camRotY = parseFloat(match[1])
						}

						// Чтобы смотреть на камеру, объект должен иметь поворот -camRotY
						// Но нужно сохранить его позицию translate3d

						// Если мы сохранили позицию при создании:
						let bx = 0,
							by = 0,
							bz = 0
						if (el.dataset.pos3d) {
							const p = JSON.parse(el.dataset.pos3d)
							bx = p.x
							by = p.y
							bz = p.z
						}

						// Применяем: позиция + отмена вращения камеры
						// translate(-50%, -100%) нужен, если мы хотим Pivot в ногах (как в obj_3d_billboard)
						el.style.transform = `translate3d(${bx}px, ${by}px, ${bz}px) rotateY(${-camRotY}deg) translate(-50%, -100%)`
					}
					break
				}

				// --- СИСТЕМНЫЕ ---
				case 'flow_comment':
				case 'flow_else':
					// Ничего не делаем, они обрабатываются в executeChain
					break
			}
			resolve()
		}, 10)
	})
}

function resolveText(input) {
	if (typeof input !== 'string') return input

	return input.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, varName) => {
		return gameVariables.hasOwnProperty(varName)
			? gameVariables[varName]
			: match
	})
}

// Функция для обновления всех текстов, зависящих от переменных
function updateDynamicText() {
	// Ищем все элементы, у которых есть сохраненный шаблон
	const dynamicTexts = document.querySelectorAll('[data-template]')

	dynamicTexts.forEach(el => {
		// Заново прогоняем шаблон через resolveText с новыми значениями переменных
		el.innerText = resolveText(el.dataset.template)
	})
}

function resolveValue(val) {
	if (typeof val !== 'string') return val

	// Если значение в фигурных скобках {varName} - это переменная
	if (val.startsWith('{') && val.endsWith('}')) {
		const key = val.slice(1, -1)
		if (gameVariables.hasOwnProperty(key)) return gameVariables[key]
		return 0 // Если переменной нет, возвращаем 0
	}

	// Если это просто число в виде строки
	if (!isNaN(parseFloat(val)) && isFinite(val)) return val

	return val
}

// Поиск данных ассета по его ID или URL
function getAssetUrl(input) {
	if (!input) return ''

	// 1. Если это ID из нашего списка ассетов
	if (projectData.assets) {
		const asset = projectData.assets.find(a => a.id === input)
		if (asset) return asset.data // Возвращаем Base64
	}

	// 2. Если переменная {var} (уже обработано resolveValue, но на всякий случай)
	if (input.startsWith('{') && input.endsWith('}')) {
		return resolveValue(input)
	}

	// 3. Иначе считаем, что это прямая ссылка (https://...)
	return input
}

