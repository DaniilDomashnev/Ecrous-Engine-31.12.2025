// ==========================================
// --- ECROUS PAINT PRO (Logic) ---
// ==========================================

// Конфигурация
let pState = {
	width: 32,
	height: 32,
	layers: [], // { id, canvas, ctx, visible, name }
	activeLayerId: null,
	zoom: 15, // Множитель масштаба
	tool: 'pencil', // pencil, eraser, fill, picker, line, rect
	color: '#ffffff',
	brushSize: 1,
	isDrawing: false,

	// --- НОВЫЕ ПОЛЯ ---
	brushMode: 'pixel', // 'pixel' или 'smooth'
	history: [], // История состояний для Undo
	historyStep: -1, // Текущий шаг истории
	startPos: { x: 0, y: 0 },
	lastPos: { x: 0, y: 0 }, // Для гладкой линии
}

// ==========================================
// --- ИНИЦИАЛИЗАЦИЯ И UI ---
// ==========================================

function openPaintModal() {
	const modal = document.getElementById('modal-paint')
	modal.classList.remove('hidden')
	setTimeout(() => modal.classList.add('active'), 10)

	// Если редактор пустой, создаем дефолтный 32x32
	if (pState.layers.length === 0) {
		initPaintSystem(32, 32)
	}

	// Имя спрайта
	document.getElementById('paint-filename').value = `spr_${Date.now()
		.toString()
		.substr(-4)}`

	// --- ОБНОВЛЕННАЯ ПРИВЯЗКА СОБЫТИЙ (МЫШЬ + TOUCH) ---
	const viewport = document.getElementById('paintViewport')

	// Удаляем старые, чтобы не двоилось при повторном открытии
	viewport.removeEventListener('mousedown', onPaintDown)
	window.removeEventListener('mousemove', onPaintMove)
	window.removeEventListener('mouseup', onPaintUp)
	viewport.removeEventListener('touchstart', onPaintDown)
	window.removeEventListener('touchmove', onPaintMove)
	window.removeEventListener('touchend', onPaintUp)

	// Мышь
	viewport.addEventListener('mousedown', onPaintDown)
	window.addEventListener('mousemove', onPaintMove)
	window.addEventListener('mouseup', onPaintUp)

	// Тач-скрин (passive: false обязателен для работы e.preventDefault)
	viewport.addEventListener('touchstart', onPaintDown, { passive: false })
	window.addEventListener('touchmove', onPaintMove, { passive: false })
	window.addEventListener('touchend', onPaintUp, { passive: false })

	// Зум колесиком
	viewport.addEventListener('wheel', e => {
		if (e.ctrlKey) {
			e.preventDefault()
			const delta = e.deltaY > 0 ? -1 : 1
			changeZoom(delta)
		}
	})

	// Импорт
	document
		.getElementById('paint-file-import')
		.addEventListener('change', handleImageImport)
}

function closePaintModal() {
	const modal = document.getElementById('modal-paint')
	modal.classList.remove('active')
	setTimeout(() => modal.classList.add('hidden'), 200)
}

function initPaintSystem(w, h) {
	pState.width = w
	pState.height = h
	pState.layers = []
	pState.activeLayerId = null

	// Умный зум: если картинка большая, зум меньше
	const maxDim = Math.max(w, h)
	if (maxDim <= 32) pState.zoom = 15
	else if (maxDim <= 64) pState.zoom = 10
	else if (maxDim <= 128) pState.zoom = 6
	else pState.zoom = 3

	pState.history = []
	pState.historyStep = -1

	document.getElementById('canvasStack').innerHTML =
		'<div id="paint-grid-overlay"></div>'

	// Создаем первый слой
	addLayer('Background')

	updateCanvasTransform()
	updateGrid()

	// Сбрасываем имя файла при создании нового
	document.getElementById('paint-filename').value = `spr_${Date.now()
		.toString()
		.substr(-4)}`
}

// --- ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА (Добавить в конец или любое удобное место) ---

function openNewSpriteModal() {
    const modal = document.getElementById('modal-paint-new');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeNewSpriteModal() {
    const modal = document.getElementById('modal-paint-new');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

function setPresetSize(w, h) {
    document.getElementById('new-sprite-w').value = w;
    document.getElementById('new-sprite-h').value = h;
    
    // Визуальное переключение кнопок
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(w)) btn.classList.add('active');
    });
}

function confirmNewSprite() {
	const w = parseInt(document.getElementById('new-sprite-w').value)
	const h = parseInt(document.getElementById('new-sprite-h').value)

	if (!w || !h || w < 1 || h < 1) {
		alert('Некорректный размер!')
		return
	}

	// Если слои уже есть, спрашиваем подтверждение
	if (pState.layers.length > 0) {
		// Простая проверка: если нарисовано что-то существенное (не будем усложнять, просто confirm)
		if (!confirm('Текущий рисунок будет удален. Создать новый?')) return
	}

	initPaintSystem(w, h)
	closeNewSpriteModal()
}

function resizePaintCanvas() {
	const newSize = parseInt(document.getElementById('paint-canvas-size').value)
	if (confirm('Изменение размера очистит все слои. Продолжить?')) {
		initPaintSystem(newSize)
	}
}

function updateBrushPreview() {
	pState.brushSize = parseInt(document.getElementById('paint-brush-size').value)
	document.getElementById('brush-size-val').innerText = pState.brushSize + 'px'
}

function toggleGrid() {
	const grid = document.getElementById('paint-grid-overlay')
	grid.classList.toggle('hidden', !document.getElementById('chk-grid').checked)
}

function setBrushMode(mode) {
	pState.brushMode = mode
	// Визуальное переключение кнопок (если они есть в HTML)
	const btnPixel = document.getElementById('mode-pixel')
	const btnSmooth = document.getElementById('mode-smooth')
	if (btnPixel && btnSmooth) {
		btnPixel.classList.toggle('active', mode === 'pixel')
		btnSmooth.classList.toggle('active', mode === 'smooth')
	}
}

// ==========================================
// --- СИСТЕМА UNDO / ИСТОРИЯ ---
// ==========================================

function saveState() {
	const activeCtx = getActiveCtx()
	if (!activeCtx) return

	// Удаляем всё, что было после текущего шага (если мы делали Undo, а потом начали рисовать)
	if (pState.historyStep < pState.history.length - 1) {
		pState.history = pState.history.slice(0, pState.historyStep + 1)
	}

	// Сохраняем текущий активный слой
	const layer = pState.layers.find(l => l.id === pState.activeLayerId)

	pState.history.push({
		layerId: pState.activeLayerId,
		data: layer.canvas.toDataURL(),
	})

	// Лимит истории (20 шагов)
	if (pState.history.length > 20) {
		pState.history.shift()
	} else {
		pState.historyStep++
	}
}

function undoPaint() {
	if (pState.historyStep < 0) return

	const state = pState.history[pState.historyStep]
	const layer = pState.layers.find(l => l.id === state.layerId)

	// Откат назад
	pState.historyStep--

	if (layer) {
		// Очищаем текущее состояние
		layer.ctx.clearRect(0, 0, pState.width, pState.height)

		if (pState.historyStep >= 0) {
			// Восстанавливаем предыдущее состояние
			const prevState = pState.history[pState.historyStep]
			// Внимание: если слой переключался, undo может быть сложнее,
			// но для простоты восстанавливаем историю линейно.
			// Лучше проверить, совпадает ли слой.
			if (prevState.layerId === layer.id) {
				const img = new Image()
				img.src = prevState.data
				img.onload = () => {
					layer.ctx.drawImage(img, 0, 0)
				}
			}
		}
	}
}

// ==========================================
// --- СИСТЕМА СЛОЕВ ---
// ==========================================

function addLayer(name) {
	const id = Date.now()
	const canvas = document.createElement('canvas')
	canvas.width = pState.width
	canvas.height = pState.height
	canvas.className = 'paint-layer-canvas'
	canvas.id = 'layer_' + id

	// Вставляем ДО сетки (сетка всегда последняя)
	const stack = document.getElementById('canvasStack')
	const grid = document.getElementById('paint-grid-overlay')
	stack.insertBefore(canvas, grid)

	const layerObj = {
		id: id,
		canvas: canvas,
		ctx: canvas.getContext('2d'),
		visible: true,
		name: name || `Layer ${pState.layers.length + 1}`,
	}
	layerObj.ctx.imageSmoothingEnabled = false // Важно для пикселей

	pState.layers.push(layerObj)
	setActiveLayer(id)
	renderLayerList()
}

function setActiveLayer(id) {
	pState.activeLayerId = id
	renderLayerList()
}

function renderLayerList() {
	const list = document.getElementById('layersList')
	list.innerHTML = ''

	// Рендерим в обратном порядке (верхние слои вверху списка)
	const layersReversed = [...pState.layers].reverse()

	layersReversed.forEach(l => {
		const item = document.createElement('div')
		item.className = `layer-item ${
			l.id === pState.activeLayerId ? 'selected' : ''
		}`
		item.onclick = () => setActiveLayer(l.id)

		item.innerHTML = `
            <i class="ri-eye-${l.visible ? 'fill' : 'off-line'} layer-vis-btn ${
			l.visible ? 'active' : ''
		}" 
               onclick="toggleLayerVis(event, ${l.id})"></i>
            <div class="layer-preview"></div> 
            <div class="layer-name">${l.name}</div>
            <i class="ri-delete-bin-line layer-vis-btn" onclick="deleteLayer(event, ${
							l.id
						})"></i>
        `
		list.appendChild(item)
	})
}

function toggleLayerVis(e, id) {
	e.stopPropagation()
	const l = pState.layers.find(x => x.id === id)
	if (l) {
		l.visible = !l.visible
		l.canvas.style.display = l.visible ? 'block' : 'none'
		renderLayerList()
	}
}

function deleteLayer(e, id) {
	e.stopPropagation()
	if (pState.layers.length <= 1) return // Нельзя удалить последний

	pState.layers = pState.layers.filter(l => {
		if (l.id === id) {
			l.canvas.remove()
			return false
		}
		return true
	})

	// Если удалили активный, переключаемся на последний
	if (pState.activeLayerId === id) {
		setActiveLayer(pState.layers[pState.layers.length - 1].id)
	} else {
		renderLayerList()
	}
}

function getActiveCtx() {
	const l = pState.layers.find(x => x.id === pState.activeLayerId)
	return l ? l.ctx : null
}

// ==========================================
// --- ИНСТРУМЕНТЫ ---
// ==========================================

function setPaintTool(t) {
	pState.tool = t
	document
		.querySelectorAll('.paint-sidebar-left .tool-btn')
		.forEach(b => b.classList.remove('active'))

	// Ищем кнопку по id (если она есть) или по классу
	const btn = document.getElementById(`t-${t}`)
	if (btn) btn.classList.add('active')
}

function changeZoom(delta) {
	pState.zoom += delta
	if (pState.zoom < 1) pState.zoom = 1
	if (pState.zoom > 50) pState.zoom = 50
	updateCanvasTransform()
}

function updateCanvasTransform() {
	const stack = document.getElementById('canvasStack')
	const w = pState.width * pState.zoom
	const h = pState.height * pState.zoom

	stack.style.width = w + 'px'
	stack.style.height = h + 'px'

	updateGrid()
}

function updateGrid() {
	const grid = document.getElementById('paint-grid-overlay')
	const size = pState.zoom
	grid.style.backgroundSize = `${size}px ${size}px`
}

// --- КООРДИНАТЫ (С поддержкой Touch) ---
function getLocalCoords(e) {
	const stack = document.getElementById('canvasStack')
	const rect = stack.getBoundingClientRect()

	let clientX = e.clientX
	let clientY = e.clientY

	// Проверяем, это тач или мышь
	if (e.touches && e.touches.length > 0) {
		clientX = e.touches[0].clientX
		clientY = e.touches[0].clientY
	} else if (e.changedTouches && e.changedTouches.length > 0) {
		clientX = e.changedTouches[0].clientX
		clientY = e.changedTouches[0].clientY
	}

	// Точные координаты (для гладкой кисти)
	const rawX = (clientX - rect.left) / pState.zoom
	const rawY = (clientY - rect.top) / pState.zoom

	return {
		x: Math.floor(rawX), // Целые (для пикселей)
		y: Math.floor(rawY), // Целые (для пикселей)
		exactX: rawX, // Дробные (для Smooth)
		exactY: rawY, // Дробные (для Smooth)
	}
}

// --- СОБЫТИЯ РИСОВАНИЯ ---

function onPaintDown(e) {
	// Разрешаем только ЛКМ для мыши, но пропускаем тач события
	if (e.type === 'mousedown' && e.button !== 0) return

	// Блокируем скролл и зум браузера на телефоне
	if (e.type === 'touchstart') {
		// e.preventDefault(); // Можно включить, но иногда мешает
	}

	const ctx = getActiveCtx()
	if (!ctx) return

	saveState() // Сохраняем состояние ДО начала рисования

	pState.isDrawing = true
	const pos = getLocalCoords(e)
	pState.startPos = pos
	pState.lastPos = { x: pos.exactX, y: pos.exactY } // Запоминаем для линии
	pState.color = document.getElementById('paint-color').value

	if (pState.tool === 'pencil') {
		if (pState.brushMode === 'smooth') {
			drawSmoothCircle(ctx, pos.exactX, pos.exactY)
		} else {
			drawPixel(ctx, pos.x, pos.y)
		}
	}
	if (pState.tool === 'eraser') erasePixel(ctx, pos.x, pos.y)
	if (pState.tool === 'fill')
		floodFill(ctx, pos.x, pos.y, hexToRgba(pState.color))
	if (pState.tool === 'picker') pickColor(ctx, pos.x, pos.y)
}

function onPaintMove(e) {
	if (!pState.isDrawing) return

	// Блокируем скролл при движении (ВАЖНО для телефонов)
	if (e.type === 'touchmove') {
		e.preventDefault()
	}

	const ctx = getActiveCtx()
	const pos = getLocalCoords(e)

	if (pState.tool === 'pencil') {
		if (pState.brushMode === 'smooth') {
			// Рисуем линию от прошлой точки до текущей
			drawSmoothLine(
				ctx,
				pState.lastPos.x,
				pState.lastPos.y,
				pos.exactX,
				pos.exactY
			)
			pState.lastPos = { x: pos.exactX, y: pos.exactY }
		} else {
			drawPixel(ctx, pos.x, pos.y)
		}
	}
	if (pState.tool === 'eraser') erasePixel(ctx, pos.x, pos.y)
}

function onPaintUp(e) {
	if (!pState.isDrawing) return
	pState.isDrawing = false

	const ctx = getActiveCtx()
	const pos = getLocalCoords(e)

	if (pState.tool === 'line')
		drawLine(ctx, pState.startPos.x, pState.startPos.y, pos.x, pos.y)
	if (pState.tool === 'rect')
		drawRect(ctx, pState.startPos.x, pState.startPos.y, pos.x, pos.y)
}

// --- ЛОГИКА ИНСТРУМЕНТОВ ---

function drawPixel(ctx, x, y) {
	ctx.fillStyle = pState.color
	const s = pState.brushSize
	// Сдвиг +0.5 иногда нужен для четкости линий в Canvas, но fillRect работает от целых
	ctx.fillRect(Math.floor(x - s / 2 + 0.5), Math.floor(y - s / 2 + 0.5), s, s)
}

// --- НОВЫЕ ФУНКЦИИ ГЛАДКОЙ КИСТИ ---
function drawSmoothCircle(ctx, x, y) {
	ctx.fillStyle = pState.color
	ctx.beginPath()
	ctx.arc(x, y, pState.brushSize / 2, 0, Math.PI * 2)
	ctx.fill()
}

function drawSmoothLine(ctx, x0, y0, x1, y1) {
	ctx.strokeStyle = pState.color
	ctx.lineWidth = pState.brushSize
	ctx.lineCap = 'round' // Круглые края
	ctx.lineJoin = 'round' // Круглые стыки

	ctx.beginPath()
	ctx.moveTo(x0, y0)
	ctx.lineTo(x1, y1)
	ctx.stroke()
}
// ------------------------------------

function erasePixel(ctx, x, y) {
	const s = pState.brushSize
	ctx.clearRect(Math.floor(x - s / 2 + 0.5), Math.floor(y - s / 2 + 0.5), s, s)
}

function drawLine(ctx, x0, y0, x1, y1) {
	// Алгоритм Брезенхэма (для пиксельного режима линий)
	const dx = Math.abs(x1 - x0)
	const dy = Math.abs(y1 - y0)
	const sx = x0 < x1 ? 1 : -1
	const sy = y0 < y1 ? 1 : -1
	let err = dx - dy

	ctx.fillStyle = pState.color

	while (true) {
		drawPixel(ctx, x0, y0)
		if (x0 === x1 && y0 === y1) break
		const e2 = 2 * err
		if (e2 > -dy) {
			err -= dy
			x0 += sx
		}
		if (e2 < dx) {
			err += dx
			y0 += sy
		}
	}
}

function drawRect(ctx, x0, y0, x1, y1) {
	const w = x1 - x0
	const h = y1 - y0
	ctx.fillStyle = pState.color
	const s = pState.brushSize

	// Рисуем 4 прямоугольника как рамку
	ctx.fillRect(x0, y0, w, s) // Верх
	ctx.fillRect(x0, y1, w + s, s) // Низ (+s фикс угла)
	ctx.fillRect(x0, y0, s, h) // Лево
	ctx.fillRect(x1, y0, s, h) // Право
}

function pickColor(ctx, x, y) {
	const p = ctx.getImageData(x, y, 1, 1).data
	if (p[3] > 0) {
		const hex = rgbToHex(p[0], p[1], p[2])
		pState.color = hex
		document.getElementById('paint-color').value = hex
		setPaintTool('pencil') // Авто переключение на карандаш
	}
}

function floodFill(ctx, startX, startY, fillColor) {
	const width = pState.width
	const height = pState.height
	const imgData = ctx.getImageData(0, 0, width, height)
	const data = imgData.data

	const startPos = (startY * width + startX) * 4
	const startR = data[startPos]
	const startG = data[startPos + 1]
	const startB = data[startPos + 2]
	const startA = data[startPos + 3]

	if (
		startR === fillColor[0] &&
		startG === fillColor[1] &&
		startB === fillColor[2] &&
		startA === fillColor[3]
	)
		return

	const matchStartColor = pos => {
		return (
			data[pos] === startR &&
			data[pos + 1] === startG &&
			data[pos + 2] === startB &&
			data[pos + 3] === startA
		)
	}

	const colorPixel = pos => {
		data[pos] = fillColor[0]
		data[pos + 1] = fillColor[1]
		data[pos + 2] = fillColor[2]
		data[pos + 3] = fillColor[3]
	}

	const queue = [[startX, startY]]

	while (queue.length > 0) {
		const [x, y] = queue.pop()
		const pos = (y * width + x) * 4

		if (x >= 0 && x < width && y >= 0 && y < height && matchStartColor(pos)) {
			colorPixel(pos)
			queue.push([x + 1, y])
			queue.push([x - 1, y])
			queue.push([x, y + 1])
			queue.push([x, y - 1])
		}
	}

	ctx.putImageData(imgData, 0, 0)
}

// ==========================================
// --- IMPORT & SAVE ---
// ==========================================

function importImageToLayer() {
	document.getElementById('paint-file-import').click()
}

function handleImageImport(e) {
	const file = e.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = evt => {
		const img = new Image()
		img.onload = () => {
			addLayer('Imported Image')
			const ctx = getActiveCtx()

			let w = img.width
			let h = img.height
			const aspect = w / h

			if (w > pState.width || h > pState.height) {
				if (w > h) {
					w = pState.width
					h = w / aspect
				} else {
					h = pState.height
					w = h * aspect
				}
			}

			const x = (pState.width - w) / 2
			const y = (pState.height - h) / 2

			ctx.drawImage(img, x, y, w, h)
		}
		img.src = evt.target.result
	}
	reader.readAsDataURL(file)
	e.target.value = ''
}

function savePaintSprite() {
	const finalCanvas = document.createElement('canvas')
	finalCanvas.width = pState.width
	finalCanvas.height = pState.height
	const fCtx = finalCanvas.getContext('2d')
	fCtx.imageSmoothingEnabled = false

	// Рендерим слои в правильном порядке (от 0 до N)
	pState.layers.forEach(l => {
		if (l.visible) {
			fCtx.drawImage(l.canvas, 0, 0)
		}
	})

	const nameInput = document.getElementById('paint-filename')
	let name = nameInput.value.trim() || 'sprite'
	const dataURL = finalCanvas.toDataURL('image/png')

	const newAsset = {
		id: 'asset_' + Date.now(),
		name: name + '.png',
		type: 'image',
		url: dataURL,
		folder: window.currentAssetFolderId,
	}

	if (!projectData.assets) projectData.assets = []
	projectData.assets.push(newAsset)

	if (typeof renderAssetList === 'function') renderAssetList()

	closePaintModal()
	if (typeof showNotification === 'function')
		showNotification(`Спрайт "${name}" сохранен!`)
}

// Helpers
function hexToRgba(hex) {
	const bigint = parseInt(hex.slice(1), 16)
	const r = (bigint >> 16) & 255
	const g = (bigint >> 8) & 255
	const b = bigint & 255
	return [r, g, b, 255]
}

function rgbToHex(r, g, b) {
	return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

// Экспорт в глобальную область (window)
window.openPaintModal = openPaintModal
window.closePaintModal = closePaintModal
window.resizePaintCanvas = resizePaintCanvas
window.setPaintTool = setPaintTool
window.savePaintSprite = savePaintSprite
window.importImageToLayer = importImageToLayer
window.updateBrushPreview = updateBrushPreview
window.addLayer = addLayer
window.toggleLayerVis = toggleLayerVis
window.deleteLayer = deleteLayer
window.setActiveLayer = setActiveLayer
window.toggleGrid = toggleGrid
window.undoPaint = undoPaint // <-- Теперь функция доступна в HTML
window.setBrushMode = setBrushMode // <-- Для переключения режимов
window.openNewSpriteModal = openNewSpriteModal
window.closeNewSpriteModal = closeNewSpriteModal
window.setPresetSize = setPresetSize
window.confirmNewSprite = confirmNewSprite
