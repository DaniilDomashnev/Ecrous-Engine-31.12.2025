// ==========================================
// --- RUNTIME (ИСПОЛНЕНИЕ) ---
// ==========================================

// Глобальные переменные
let currentKeyDownHandler = null
let currentClickHandler = null
let runtimeSceneId = null

// --- НОВЫЕ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let activeCollisionsPair = new Set() // Чтобы событие срабатывало 1 раз при входе
window.globalCurrentSceneData = null // Ссылка на данные сцены для поиска скриптов

// Переменные для драга
let isGameWindowDragging = false;
let gameDragOffset = { x: 0, y: 0 };

function initGameWindowDrag() {
    const win = document.querySelector('.game-window');
    const header = document.querySelector('.game-header');

    if (!win || !header) return;

    header.addEventListener('mousedown', (e) => {
        // Игнорируем клик по кнопке закрытия
        if(e.target.closest('.close-game-btn')) return;
        
        isGameWindowDragging = true;
        
        // Считаем смещение мыши относительно угла окна
        const rect = win.getBoundingClientRect();
        gameDragOffset.x = e.clientX - rect.left;
        gameDragOffset.y = e.clientY - rect.top;
        
        // Убираем transform translate, чтобы управлять через top/left напрямую
        // Но нужно сохранить текущую визуальную позицию
        win.style.transform = 'none';
        win.style.left = rect.left + 'px';
        win.style.top = rect.top + 'px';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isGameWindowDragging) return;
        const x = e.clientX - gameDragOffset.x;
        const y = e.clientY - gameDragOffset.y;
        
        win.style.left = x + 'px';
        win.style.top = y + 'px';
    });

    window.addEventListener('mouseup', () => {
        isGameWindowDragging = false;
    });
}

function runProject() {
	stopGame()
	saveCurrentWorkspace()

	// UI
	document.getElementById('game-overlay').classList.remove('hidden')
	const gameWindow = document.querySelector('.game-window')
	if (gameWindow) {
		gameWindow.style.width = '800px'
		gameWindow.style.height = '600px'
	}
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

	// Сброс коллизий
	activeCollisionsPair.clear()

	// Хак для звука
	const audioUnlock = new Audio()
	audioUnlock.play().catch(e => {})

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
}


function gameLoop() {
	if (!isRunning) return
	const now = performance.now()
	const dt = Math.min((now - lastTime) / 1000, 0.05) // Макс шаг 50мс

	if (now - lastTime >= 1000) {
		if (showFps && fpsElement) fpsElement.innerText = `FPS: ${fpsCounter}`
		fpsCounter = 0
	}

	if (!isGamePaused) {
		updatePhysics(dt)
		updateCamera(dt)
	}
	lastTime = now
	fpsCounter++
	requestAnimationFrame(gameLoop)
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
			const gameW = 800
			const gameH = 600

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
	// Если сцена не загружена корректно, выходим
	if (!window.globalCurrentSceneData) return

	const objectsData = window.globalCurrentSceneData.objects

	// Проходим по всем объектам, чтобы найти, у кого есть блок "При столкновении"
	objectsData.forEach(obj => {
		if (!obj.scripts) return

		// Событие может быть на одном из участников столкновения
		if (obj.id === id1 || obj.id === id2) {
			const events = obj.scripts.filter(b => b.type === 'evt_collision')

			events.forEach(evt => {
				const targetName = evt.values[1] // С кем должно быть столкновение?

				// Определяем "другого"
				const otherId = obj.id === id1 ? id2 : id1
				const otherObjDef = objectsData.find(o => o.id === otherId)

				// Логика фильтрации:
				// 1. Поле пустое -> сталкиваемся с чем угодно
				// 2. Имя совпадает с именем объекта
				// 3. ID совпадает
				const isMatch =
					!targetName ||
					(otherObjDef && otherObjDef.name === targetName) ||
					targetName === otherId

				if (isMatch) {
					// Запускаем цепочку блоков!
					// executeChain находится в main.js, но доступна глобально
					if (typeof executeChain === 'function') {
						executeChain(evt, obj.scripts, obj.connections)
					}
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
			const winW = 800,
				winH = 600
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
	if (currentClickHandler)
		document
			.getElementById('game-stage')
			?.removeEventListener('click', currentClickHandler)
	currentKeyDownHandler = null
	currentClickHandler = null
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
