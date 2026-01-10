// ==========================================
// --- RUNTIME (ИСПОЛНЕНИЕ) ---
// ==========================================

// Глобальные переменные
let currentKeyDownHandler = null
let currentScreenTouchHandler = null
let currentClickHandler = null
let runtimeSceneId = null
let isGameResizing = false
let activeCollisionsPair = new Set() // Чтобы событие срабатывало 1 раз при входе
let isConsoleVisible = true
window.globalCurrentSceneData = null // Ссылка на данные сцены для поиска скриптов
let matterEngine = null
let matterRender = null
let matterRunner = null
// Map для связи ID объекта (DOM) -> Body (Matter.js)
let bodyMap = new Map()

// Переменные для драга
let isGameWindowDragging = false
let gameDragOffset = { x: 0, y: 0 }

function initGameWindowDrag() {
	const win = document.querySelector('.game-window')
	const header = document.querySelector('.game-header')
	const resizer = document.querySelector('.game-window-resizer')
	const consoleElement = document.getElementById('game-console')

	if (!win || !header) return

	// --- ЛОГИКА ПЕРЕМЕЩЕНИЯ (DRAG) ---
	header.addEventListener('mousedown', e => {
		if (e.target.closest('.close-game-btn')) return
		isGameWindowDragging = true

		// Когда начинаем тащить, убираем CSS центрирование (transform)
		// и переходим на абсолютные координаты
		const rect = win.getBoundingClientRect()
		win.style.transform = 'none'
		win.style.left = rect.left + 'px'
		win.style.top = rect.top + 'px'

		gameDragOffset.x = e.clientX - rect.left
		gameDragOffset.y = e.clientY - rect.top
	})

	// --- ЛОГИКА ИЗМЕНЕНИЯ РАЗМЕРА (RESIZE) ---
	if (resizer) {
		resizer.addEventListener('mousedown', e => {
			e.stopPropagation() // Чтобы не срабатывал драг окна
			isGameResizing = true
			// Убираем transition если есть, чтобы не лагало
			win.style.transition = 'none'
		})
	}

	// --- ОБЩИЙ СЛУШАТЕЛЬ ДВИЖЕНИЯ ---
	window.addEventListener('mousemove', e => {
		// 1. Перемещение
		if (isGameWindowDragging) {
			const x = e.clientX - gameDragOffset.x
			const y = e.clientY - gameDragOffset.y
			win.style.left = x + 'px'
			win.style.top = y + 'px'
		}

		// 2. Изменение размера
		if (isGameResizing) {
			const rect = win.getBoundingClientRect()
			// Вычисляем новую ширину/высоту на основе положения мыши
			const newW = e.clientX - rect.left
			const newH = e.clientY - rect.top

			if (newW > 320) win.style.width = newW + 'px'
			if (newH > 240) {
				// +40px учитываем шапку, если нужно, но проще менять высоту всего контейнера
				win.style.height = newH + 'px'

				// Также нужно обновить размер stage внутри
				const stage = document.getElementById('game-stage')
				if (stage) {
					// Высота окна минус шапка (примерно 40px)
					stage.style.height = newH - 40 + 'px'
				}
			}
		}
	})

	window.addEventListener('mouseup', () => {
		isGameWindowDragging = false
		isGameResizing = false
	})
}

// === КОНСОЛЬ ===

function logToConsole(message, type = 'log') {
    const consoleElement = document.getElementById('game-console');
    if (!consoleElement) return;

    // Если консоль скрыта, но пришла ошибка — можно открыть её принудительно (опционально)
    // if (type === 'error' && !isConsoleVisible) toggleConsoleVisibility();

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    
    if (typeof message === 'object') {
        try {
            line.innerText = JSON.stringify(message, null, 2);
        } catch (e) {
            line.innerText = String(message);
        }
    } else {
        line.innerText = String(message);
    }

    consoleElement.appendChild(line);
    consoleElement.scrollTop = consoleElement.scrollHeight;
}

function clearConsole() {
    const consoleElement = document.getElementById('game-console');
    if (consoleElement) {
        consoleElement.innerHTML = '<div class="console-line system">> Консоль очищена</div>';
    }
}

// === ПЕРЕКЛЮЧЕНИЕ ВИДИМОСТИ ===
function toggleConsoleVisibility() {
    const consoleElement = document.getElementById('game-console');
    const btn = document.getElementById('btnToggleConsole');
    
    if (!consoleElement) return;
    
    isConsoleVisible = !isConsoleVisible;
    
    if (isConsoleVisible) {
        consoleElement.style.display = 'block';
        if (btn) {
            btn.style.opacity = '1';
            btn.innerHTML = '<i class="ri-terminal-box-line"></i>'; // Иконка "Активно"
        }
    } else {
        consoleElement.style.display = 'none';
        if (btn) {
            btn.style.opacity = '0.5';
            btn.innerHTML = '<i class="ri-terminal-line"></i>'; // Иконка "Скрыто"
        }
    }
}

// === ИНИЦИАЛИЗАЦИЯ КНОПОК ===
function initConsoleControls() {
	const header = document.querySelector('.game-header')
	if (!header) return

	// 1. Кнопка ОЧИСТКИ (Корзина)
	if (!document.getElementById('btnClearConsole')) {
		// Третий параметр '10px' — отступ слева от соседней кнопки
		const btnClear = createHeaderBtn(
			'btnClearConsole',
			'ri-delete-bin-line',
			'Очистить консоль',
			'10px'
		)
		btnClear.onclick = e => {
			e.stopPropagation()
			clearConsole()
		}

		// Вставляем перед кнопкой закрытия
		const closeBtn = document.getElementById('btnCloseGame')
		if (closeBtn) header.insertBefore(btnClear, closeBtn)
	}

	// 2. Кнопка СКРЫТИЯ (Терминал)
	if (!document.getElementById('btnToggleConsole')) {
		// Третий параметр 'auto' — ВАЖНО: толкает все кнопки вправо, убирая "дыру" по центру
		const btnToggle = createHeaderBtn(
			'btnToggleConsole',
			'ri-terminal-box-line',
			'Скрыть/Показать консоль',
			'auto'
		)
		btnToggle.onclick = e => {
			e.stopPropagation()
			toggleConsoleVisibility()
		}

		// Вставляем ПЕРЕД кнопкой очистки
		const btnClear = document.getElementById('btnClearConsole')
		if (btnClear) header.insertBefore(btnToggle, btnClear)
	}
}

// Вспомогательная функция для создания кнопок (чтобы не дублировать код стилей)
function createHeaderBtn(id, iconClass, title, marginLeftValue) {
	const btn = document.createElement('button')
	btn.id = id
	btn.innerHTML = `<i class="${iconClass}"></i>`
	btn.className = 'icon-btn'

	// Стили
	btn.style.marginLeft = marginLeftValue // Используем переданный отступ
	btn.style.width = '24px'
	btn.style.height = '24px'
	btn.style.fontSize = '14px'
	btn.style.background = 'transparent'
	btn.style.border = 'none'
	btn.style.color = '#aaa'
	btn.style.cursor = 'pointer'
	btn.title = title

	// Ховер эффекты
	btn.onmouseover = () => (btn.style.color = '#fff')
	btn.onmouseleave = () => {
		if (id === 'btnToggleConsole' && !isConsoleVisible) return
		btn.style.color = '#aaa'
	}

	return btn
}

function runProject() {
	stopGame()
	saveCurrentWorkspace() // Убедитесь, что эта функция доступна глобально (из main.js или inicialization.js)
	initConsoleControls()

	// UI
	document.getElementById('game-overlay').classList.remove('hidden')

	isConsoleVisible = true

	// === [ИСПРАВЛЕНО] Убрано дублирование const gameWindow ===
	const gameWindow = document.querySelector('.game-window')

	// Настраиваем позицию
	if (gameWindow) {
		gameWindow.style.top = '50%'
		gameWindow.style.left = '50%'
		gameWindow.style.transform = 'translate(-50%, -50%)'
		gameWindow.style.transition = 'none'

		const w =
			window.gameConfig && window.gameConfig.width
				? window.gameConfig.width
				: 800
		const h =
			window.gameConfig && window.gameConfig.height
				? window.gameConfig.height
				: 600

		gameWindow.style.width = w + 'px'
		gameWindow.style.height = parseInt(h) + 40 + 'px'

		const stage = document.getElementById('game-stage')
		if (stage) {
			stage.style.width = '100%'
			stage.style.height = h + 'px'
		}
	}

	// --- ИНИЦИАЛИЗАЦИЯ MATTER.JS ---
	// [ИСПРАВЛЕНО] Проверка наличия Matter перед использованием
	if (typeof Matter !== 'undefined') {
		const Engine = Matter.Engine
		// const World = Matter.World // Не используется напрямую, берем из engine

		window.matterEngine = Engine.create()
		window.matterEngine.world.gravity.y = 1

		Matter.Events.on(window.matterEngine, 'collisionStart', event => {
			event.pairs.forEach(pair => {
				const idA = pair.bodyA.label
				const idB = pair.bodyB.label
				triggerCollisionEvent(idA, idB) // Теперь эта функция существует
			})
		})
	} else {
		console.error('Matter.js не найден! Физика не будет работать.')
	}

	bodyMap.clear()

	document.querySelector('.game-header span').innerText = 'ИГРОВОЙ ПРОЦЕСС'
	document.getElementById('game-console').style.display = 'block'

	// Сброс данных
	gameVariables = {}
	activeKeys = {}
	loadedSounds = {}
	physicsObjects = {}
	worldGravity = { x: 0, y: 0 }
	cameraState = {
		x: 0,
		y: 0,
		zoom: 1,
		target: null,
		lerp: 0.1,
		shakeInfo: { power: 0, time: 0 },
	}

	activeCollisionsPair.clear()

	// ... (остальной код runProject без изменений) ...

	// --- ФИНАЛЬНЫЙ ЗАПУСК ---
	isRunning = true
	isGamePaused = false
	showFps = false
	fpsCounter = 0
	lastTime = performance.now()

	const startScene = getActiveScene()

	if (startScene) {
		loadRuntimeScene(startScene)
	} else {
		console.error('Нет активной сцены!')
	}

	requestAnimationFrame(gameLoop)
}

function loadRuntimeScene(sceneData) {
	if (!sceneData) return
	window.currentSessionId++
	runtimeSceneId = sceneData.id

	// !!! ВАЖНО: Сохраняем ссылку на данные сцены для триггеров !!!
	window.globalCurrentSceneData = sceneData

	if (typeof loadedSounds !== 'undefined') {
		Object.values(loadedSounds).forEach(snd => {
			if (snd) {
				snd.pause()
				snd.currentTime = 0
			}
		})
	}
	loadedSounds = {}

	const stage = document.getElementById('game-stage')
	stage.innerHTML = `<div id="game-world"></div><div id="game-ui"></div>`
	document.getElementById(
		'game-console'
	).innerHTML += `<div class="console-line system">> Scene: ${sceneData.name}</div>`

	if (currentKeyDownHandler)
		window.removeEventListener('keydown', currentKeyDownHandler)
	if (currentClickHandler)
		document
			.getElementById('game-stage')
			.removeEventListener('click', currentClickHandler)
	currentKeyDownHandler = null
	currentClickHandler = null

	const allScripts = sceneData.objects.flatMap(o => o.scripts || [])

	// Start
	allScripts
		.filter(b => b.type === 'evt_start')
		.forEach(block => {
			if (block.disabled) return
			const owner = sceneData.objects.find(o =>
				o.scripts.some(s => s.id === block.id)
			)
			executeChain(block, owner.scripts, owner.connections)
		})

	const updateEvents = allScripts.filter(b => b.type === 'evt_update')
	if (updateEvents.length > 0) {
		// Подписываемся на игровой цикл
		window.updateInterval = setInterval(() => {
			if (!isRunning || isGamePaused) return
			updateEvents.forEach(block => {
				const owner = sceneData.objects.find(o =>
					o.scripts.some(s => s.id === block.id)
				)
				if (owner) {
					// Запускаем цепочку без await, чтобы не блочить рендер
					executeChain(block, owner.scripts, owner.connections)
				}
			})
		}, 16) // ~60 FPS
	}

	// Screen Touch (Глобальное касание)
	const screenTouchEvents = allScripts.filter(
		b => b.type === 'evt_screen_touch'
	)
	if (screenTouchEvents.length > 0) {
		// Очищаем старый, если был
		if (currentScreenTouchHandler) {
			window.removeEventListener('pointerdown', currentScreenTouchHandler)
		}

		currentScreenTouchHandler = e => {
			if (!isRunning || isGamePaused) return

			// Игнорируем клики по кнопкам редактора, если случайно нажали
			if (e.target.closest('.game-header') || e.target.closest('.console-line'))
				return

			screenTouchEvents.forEach(block => {
				const owner = sceneData.objects.find(o =>
					o.scripts.some(s => s.id === block.id)
				)
				if (owner) {
					executeChain(block, owner.scripts, owner.connections)
				}
			})
		}

		// ВАЖНО: Слушаем window, чтобы ловить клики везде
		window.addEventListener('pointerdown', currentScreenTouchHandler)
	}

	// Таймеры
	const timerEvents = allScripts.filter(b => b.type === 'evt_timer')
	timerEvents.forEach(block => {
		const sec = parseFloat(block.values[0]) || 1
		const interval = setInterval(() => {
			if (!isRunning || isGamePaused) return
			const owner = sceneData.objects.find(o =>
				o.scripts.some(s => s.id === block.id)
			)
			if (owner) executeChain(block, owner.scripts, owner.connections)
		}, sec * 1000)
		// Нужно где-то хранить интервалы, чтобы очистить при стопе (добавь window.activeTimers = [] в runProject)
		if (!window.activeTimers) window.activeTimers = []
		window.activeTimers.push(interval)
	})

	// 2. В функцию stopGame добавь очистку:
	if (window.updateInterval) clearInterval(window.updateInterval)
	if (window.activeTimers) {
		window.activeTimers.forEach(t => clearInterval(t))
		window.activeTimers = []
	}

	// Keys
	const keyEvents = allScripts.filter(b => b.type === 'evt_key_press')
	if (keyEvents.length > 0) {
		currentKeyDownHandler = e => {
			if (!isRunning || isGamePaused) return
			keyEvents.forEach(block => {
				if (e.code === block.values[0] || e.key === block.values[0]) {
					const owner = sceneData.objects.find(o =>
						o.scripts.some(s => s.id === block.id)
					)
					executeChain(block, owner.scripts, owner.connections)
				}
			})
		}
		window.addEventListener('keydown', currentKeyDownHandler)
	}

	// Clicks
	const clickEvents = allScripts.filter(b => b.type === 'evt_object_click')
	const uiEvents = allScripts.filter(b => b.type === 'ui_button_onclick')
	if (clickEvents.length > 0 || uiEvents.length > 0) {
		currentClickHandler = e => {
			if (!isRunning || isGamePaused) return
			const targetId = e.target.id || e.target.closest('[id]')?.id
			if (!targetId) return
			const checkAndRun = list => {
				list.forEach(block => {
					if (targetId === block.values[0]) {
						const owner = sceneData.objects.find(o =>
							o.scripts.some(s => s.id === block.id)
						)
						executeChain(block, owner.scripts, owner.connections)
					}
				})
			}
			checkAndRun(clickEvents)
			checkAndRun(uiEvents)
		}
		document
			.getElementById('game-stage')
			.addEventListener('click', currentClickHandler)
	}

	if (currentScreenTouchHandler) {
		document
			.getElementById('game-stage')
			?.removeEventListener('pointerdown', currentScreenTouchHandler)
		currentScreenTouchHandler = null
	}
}

function gameLoop() {
	if (!isRunning) return

	const now = performance.now()
	const dt = Math.min(now - lastTime, 50) // мс

	if (!isGamePaused) {
		// 1. Шаг физики Matter.js
		Matter.Engine.update(matterEngine, dt)

		// 2. Синхронизация: Matter Body -> DOM Element
		updateDOMFromPhysics()

		// 3. Камера и прочее
		updateCamera(dt / 1000)
	}

	lastTime = now
	requestAnimationFrame(gameLoop)
}

function updateDOMFromPhysics() {
	bodyMap.forEach((body, domId) => {
		const el = document.getElementById(domId)
		if (!el) return

		// Matter.js использует центр объекта, DOM - левый верхний угол
		// Нам нужно учесть половину ширины/высоты, сохраненную в body.render.sprite
		const w = body.bounds.max.x - body.bounds.min.x
		const h = body.bounds.max.y - body.bounds.min.y

		// Позиция
		const x = body.position.x - w / 2
		const y = body.position.y - h / 2

		// Вращение (Matter.js в радианах, CSS в deg)
		const angleDeg = body.angle * (180 / Math.PI)

		el.style.left = `${x}px`
		el.style.top = `${y}px`
		el.style.transform = `rotate(${angleDeg}deg)`
	})
}

// ==========================================
// --- ФИЗИКА И СОБЫТИЯ (ОБЪЕДИНЕНО) ---
// ==========================================
function updatePhysics(dt) {
	const ids = Object.keys(physicsObjects)
	if (ids.length === 0) return

	// 1. ПОДГОТОВКА ДАННЫХ
	const objects = ids
		.map(id => {
			const el = document.getElementById(id)
			if (!el) return null
			const phys = physicsObjects[id]

			let x = parseFloat(el.style.left) || 0
			let y = parseFloat(el.style.top) || 0

			return {
				id,
				el,
				phys,
				x,
				y,
				w: phys.width || el.offsetWidth,
				h: phys.height || el.offsetHeight,
				isStatic: phys.mass === 0,
			}
		})
		.filter(o => o !== null)

	// 2. ЦИКЛ ДВИЖЕНИЯ (ГРАВИТАЦИЯ, ТРЕНИЕ, СТЕНЫ)
	objects.forEach(obj => {
		if (obj.isStatic) return

		const phys = obj.phys

		// Силы
		phys.vx += worldGravity.x
		phys.vy += worldGravity.y

		// Трение
		phys.vx *= 0.9
		phys.vy *= 0.99

		// Анти-дрожание
		if (Math.abs(phys.vx) < 0.1) phys.vx = 0
		if (Math.abs(phys.vy) < 0.1) phys.vy = 0

		// Движение X
		obj.x += phys.vx
		let colX = checkCollisions(obj, objects)
		if (colX) {
			obj.x -= phys.vx
			phys.vx = 0
		}

		// Движение Y
		obj.y += phys.vy
		let colY = checkCollisions(obj, objects)
		if (colY) {
			obj.y -= phys.vy
			phys.vy = 0
		}

		// Границы мира
		if (phys.collideWorld) {
			// --- ИСПРАВЛЕНИЕ: БЕРЕМ РАЗМЕР ИЗ КОНФИГА ИЛИ DOM ---
			const stage = document.getElementById('game-stage')
			const gameW = stage ? stage.offsetWidth : 800
			const gameH = stage ? stage.offsetHeight : 600

			if (obj.x < 0) {
				obj.x = 0
				phys.vx = 0
			}
			if (obj.x + obj.w > gameW) {
				obj.x = gameW - obj.w
				phys.vx = 0
			}
			if (obj.y < 0) {
				obj.y = 0
				phys.vy = 0
			}
			if (obj.y + obj.h > gameH) {
				obj.y = gameH - obj.h
				phys.vy = 0
			}
		}

		// Применение координат к DOM
		obj.el.style.left = obj.x + 'px'
		obj.el.style.top = obj.y + 'px'
	})

	// 3. ЦИКЛ СОБЫТИЙ СТОЛКНОВЕНИЙ (EVT_COLLISION)
	const currentFrameCollisions = new Set()

	for (let i = 0; i < objects.length; i++) {
		for (let j = i + 1; j < objects.length; j++) {
			const a = objects[i]
			const b = objects[j]

			// AABB проверка (пересекаются ли прямоугольники)
			if (
				a.x < b.x + b.w &&
				a.x + a.w > b.x &&
				a.y < b.y + b.h &&
				a.y + a.h > b.y
			) {
				// Создаем уникальный ID пары (сортируем, чтобы A+B было равно B+A)
				const pairId = [a.id, b.id].sort().join(':')
				currentFrameCollisions.add(pairId)

				// Если этой пары не было в прошлом кадре — это НОВОЕ столкновение
				if (!activeCollisionsPair.has(pairId)) {
					triggerCollisionEvent(a.id, b.id)
				}
			}
		}
	}
	// Запоминаем текущие столкновения для следующего кадра
	activeCollisionsPair = currentFrameCollisions
}

// Функция запуска скриптов при столкновении
function triggerCollisionEvent(id1, id2) {
	if (!window.globalCurrentSceneData) return

	// Получаем объекты сцены
	const objectsData = window.globalCurrentSceneData.objects
	if (!objectsData) return

	objectsData.forEach(obj => {
		if (!obj.scripts) return

		// Проверяем, участвует ли этот объект в столкновении
		if (obj.id === id1 || obj.id === id2) {
			// Ищем блоки "Столкновение"
			const events = obj.scripts.filter(b => b.type === 'evt_collision')

			events.forEach(evt => {
				// evt.values[0] - обычно "Кто" (по умолчанию self), evt.values[1] - "С кем"
				const targetName = evt.values[1]

				// Определяем ID второго объекта
				const otherId = obj.id === id1 ? id2 : id1
				const otherObjDef = objectsData.find(o => o.id === otherId)

				// Логика проверки:
				// Срабатывает, если в блоке не указано имя (пусто),
				// ИЛИ если имя совпадает с именем второго объекта,
				// ИЛИ если ID совпадает.
				const isMatch =
					!targetName ||
					(otherObjDef && otherObjDef.name === targetName) ||
					targetName === otherId

				if (isMatch) {
					executeChain(evt, obj.scripts, obj.connections)
				}
			})
		}
	})
}

// Проверка физических столкновений (для стен и платформ)
function checkCollisions(me, allObjects) {
	for (let other of allObjects) {
		if (me.id === other.id) continue

		if (
			me.x < other.x + other.w &&
			me.x + me.w > other.x &&
			me.y < other.y + other.h &&
			me.y + me.h > other.y
		) {
			// Физически отталкиваемся только от статичных объектов (земля, стены)
			if (other.isStatic) return true
		}
	}
	return false
}

function updateCamera(dt) {
	const world = document.getElementById('game-world')
	if (!world) return
	if (cameraState.target) {
		const targetEl = document.getElementById(cameraState.target)
		if (targetEl) {
			// --- ИСПРАВЛЕНИЕ: БЕРЕМ РАЗМЕР ИЗ КОНФИГА ИЛИ DOM ---
			const stage = document.getElementById('game-stage')
			const winW = stage ? stage.offsetWidth : 800
			const winH = stage ? stage.offsetHeight : 600
			// -----------------------------------------------------

			const tX = parseFloat(targetEl.style.left) + targetEl.offsetWidth / 2
			const tY = parseFloat(targetEl.style.top) + targetEl.offsetHeight / 2
			const targetCamX = tX - winW / 2 / cameraState.zoom
			const targetCamY = tY - winH / 2 / cameraState.zoom
			cameraState.x += (targetCamX - cameraState.x) * cameraState.lerp
			cameraState.y += (targetCamY - cameraState.y) * cameraState.lerp
		}
	}
	let shakeX = 0,
		shakeY = 0
	if (cameraState.shakeInfo.time > 0) {
		cameraState.shakeInfo.time -= dt
		const power = cameraState.shakeInfo.power
		shakeX = (Math.random() - 0.5) * power
		shakeY = (Math.random() - 0.5) * power
	}
	const finalX = -cameraState.x + shakeX
	const finalY = -cameraState.y + shakeY
	world.style.transformOrigin = 'top left'
	world.style.transform = `scale(${cameraState.zoom}) translate(${finalX}px, ${finalY}px)`

	// --- ЛОГИКА ПАРАЛЛАКСА ---
	// Находим все объекты с параллаксом
	const parallaxObjs = document.querySelectorAll('[data-parallax]')
	parallaxObjs.forEach(el => {
		const factor = parseFloat(el.dataset.parallax) || 1
		if (factor === 1) return // Стандартное поведение

		// Считаем смещение относительно камеры
		// Если factor 0.5, объект должен двигаться в 2 раза медленнее камеры.
		// Так как камера двигает весь мир на finalX, нам нужно сдвинуть объект ОБРАТНО на часть этого пути.

		const offsetX = -finalX * (1 - factor)
		const offsetY = -finalY * (1 - factor)

		// Применяем transform, сохраняя возможный поворот из физики
		// Примечание: Это может конфликтовать с updateDOMFromPhysics, если объект физический.
		// Физические объекты лучше не делать параллаксом.
		el.style.transform = `translate(${offsetX}px, ${offsetY}px)`
	})
}

// Простейшая реализация A*
function findPath(grid, startX, startY, endX, endY) {
    // grid - двумерный массив, где 0 - свободно, 1 - стена
    // Возвращает массив точек [{x,y}, {x,y}...]
    
    // (Тут нужен стандартный алгоритм A*, я дам сокращенный пример)
    // Можно использовать библиотеку EasyStar.js или pathfinding.js, 
    // но для Ecrous лучше написать мини-версию, чтобы не тащить зависимости.
    
    // ... Реализация BFS для простоты (для начала пойдет) ...
    let queue = [{x: startX, y: startY, path: []}];
    let visited = new Set([`${startX},${startY}`]);
    
    while(queue.length > 0) {
        let curr = queue.shift();
        if (curr.x === endX && curr.y === endY) return curr.path;
        
        const dirs = [[0,1], [1,0], [0,-1], [-1,0]];
        for(let d of dirs) {
            let nx = curr.x + d[0];
            let ny = curr.y + d[1];
            
            if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[0].length) {
                if (grid[ny][nx] === 0 && !visited.has(`${nx},${ny}`)) {
                    visited.add(`${nx},${ny}`);
                    queue.push({x: nx, y: ny, path: [...curr.path, {x: nx, y: ny}]});
                }
            }
        }
    }
    return []; // Путь не найден
}

function stopGame() {
	isRunning = false
	document.getElementById('game-overlay').classList.add('hidden')
	if (typeof loadedSounds !== 'undefined' && loadedSounds) {
		Object.values(loadedSounds).forEach(snd => {
			if (snd) {
				snd.pause()
				snd.currentTime = 0
			}
		})
	}
	loadedSounds = {}
	if (currentKeyDownHandler)
		window.removeEventListener('keydown', currentKeyDownHandler)
	// Очистка Matter.js (ИСПОЛЬЗУЕМ window.matterEngine)
	if (window.matterEngine) {
		Matter.World.clear(window.matterEngine.world)
		Matter.Engine.clear(window.matterEngine)
		window.matterEngine = null
	}
	bodyMap.clear()
	if (currentClickHandler)
		document
			.getElementById('game-stage')
			?.removeEventListener('click', currentClickHandler)
	currentKeyDownHandler = null
	currentClickHandler = null
	if (currentScreenTouchHandler) {
		window.removeEventListener('pointerdown', currentScreenTouchHandler) // Было getElementById...
		currentScreenTouchHandler = null
	}
}

function resolveValue(input) {
	if (typeof input !== 'string') return input

	// Если это переменная {name}
	if (input.startsWith('{') && input.endsWith('}')) {
		const key = input.slice(1, -1)
		if (gameVariables.hasOwnProperty(key)) return gameVariables[key]
		return 0 // По умолчанию 0
	}

	// Если это просто число
	if (!isNaN(parseFloat(input)) && isFinite(input)) return parseFloat(input)

	return input
}
