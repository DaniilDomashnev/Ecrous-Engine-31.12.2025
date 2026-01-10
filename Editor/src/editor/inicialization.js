// ==========================================
// --- ИНИЦИАЛИЗАЦИЯ (src/editor/inicialization.js) ---
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
	// 1. Вставка CSS для проводов и портов
	const style = document.createElement('style')
	style.innerHTML = `
        .connection-wire {
            fill: none;
            stroke: #ffffff;
            stroke-width: 3px;
            stroke-linecap: round;
            pointer-events: all;
            cursor: pointer;
            transition: stroke 0.2s;
            opacity: 0.8;
        }
        .connection-wire:hover {
            stroke: #2979FF;
            stroke-width: 5px;
        }
        #connections-layer {
            overflow: visible;
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 0;
            pointer-events: none;
        }
        /* Скрываем провода и порты, если не режим Нод */
        body:not(.mode-nodes) .connection-wire,
        body:not(.mode-nodes) .node-port {
            display: none !important;
        }
    `
	document.head.appendChild(style)

	// 2. Инициализация ссылок на элементы
	canvas = document.getElementById('mainCanvas')
	container = document.getElementById('canvas-container')
	toolbox = document.getElementById('toolboxContent')
	sceneListEl = document.getElementById('sceneList')
	objectListEl = document.getElementById('objectList')

	// 3. Логика переключения панели инструментов (Toolbox Toggle)
	const btnToggleToolbox = document.getElementById('btnToggleToolbox')
	const toolboxEl = document.querySelector('.toolbox')

	if (btnToggleToolbox && toolboxEl) {
		const isClosed = localStorage.getItem('ecrous_ui_toolbox_closed') === 'true'
		if (isClosed) {
			toolboxEl.classList.add('closed')
			btnToggleToolbox.classList.add('active')
		}

		btnToggleToolbox.onclick = () => {
			toolboxEl.classList.toggle('closed')
			btnToggleToolbox.classList.toggle('active')
			localStorage.setItem(
				'ecrous_ui_toolbox_closed',
				toolboxEl.classList.contains('closed')
			)

			// Перерисовка проводов при изменении размера области
			if (
				editorMode === 'nodes' &&
				typeof updateAllConnections === 'function'
			) {
				setTimeout(updateAllConnections, 300)
			}
		}
	}

	// 4. Мобильная инициализация
	if (window.innerWidth <= 768) {
		const pcToggle = document.getElementById('btnToggleToolbox')
		if (pcToggle) pcToggle.style.display = 'none'

		if (typeof setMobileTab === 'function') {
			setMobileTab('canvas')
		}
	}

	// 5. Загрузка библиотек и событий
	loadCustomTemplates()
	initToolbox()
	initResizableLayout()
	initMobileLibrary()
	initCanvasEvents()
	initContextMenu()
	initGameWindowDrag()

	// 6. Загрузка проекта (Добавляем await)
	loadProjectFromLocal()
	// -----------------------

	if (!projectData) {
		// Создаем новый проект, если нет сохраненного
		projectData = {
			meta: { name: currentProjectName, created: Date.now() },
			scenes: [
				{
					id: 'scene_1',
					name: 'Главная сцена',
					objects: [
						{ id: 'obj_1', name: 'GameManager', scripts: [], connections: [] },
					],
				},
			],
			assets: [], // Инициализируем массив ассетов
		}
		activeSceneId = 'scene_1'
		activeObjectId = 'obj_1'

		// Сохраняем новый проект (тоже async, но тут await не критичен)
		saveProjectToLocal()
	} else {
		// Если проект загружен, убедимся что assets существует
		if (!projectData.assets) projectData.assets = []
	}

	// Имя проекта в шапке
	const brandTitle = document.querySelector('.brand')
	if (brandTitle) {
		brandTitle.innerHTML = `<i class="ri-settings-3-line" style="font-size:20px; color:var(--accent);"></i> ${currentProjectName}`
	}

	// 7. Отрисовка интерфейса (Теперь вызывается когда данные точно готовы)
	renderSidebar()
	loadWorkspace()

	// Принудительно рендерим ассеты, так как они загрузились асинхронно
	if (typeof renderAssetList === 'function') renderAssetList()

	// 8. Обработчики кнопок
	window.addEventListener('keydown', e => (activeKeys[e.code] = true))
	window.addEventListener('keyup', e => (activeKeys[e.code] = false))

	document.getElementById('btnRun').onclick = runProject
	document.getElementById('btnCloseGame').onclick = stopGame
	document.getElementById('btnAddScene').onclick = addScene
	document.getElementById('btnAddObject').onclick = addObject
	document.getElementById('btnSave').onclick = saveProjectToLocal

	document.getElementById('resetView').onclick = () => {
		panX = 0
		panY = 0
		zoomLevel = 1
		updateTransform()
		saveEditorState() // Сохраняем сброс
	}

	// 9. Кнопки переключения режимов (Stack / Nodes)
	const btnStack = document.getElementById('btnModeStack')
	const btnNodes = document.getElementById('btnModeNodes')
	if (btnStack) btnStack.onclick = () => setEditorMode('stack')
	if (btnNodes) btnNodes.onclick = () => setEditorMode('nodes')

	// === ВАЖНО: ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ ПРИ ЗАГРУЗКЕ ===
	restoreEditorState()
})

// === ФУНКЦИИ УПРАВЛЕНИЯ СОСТОЯНИЕМ РЕДАКТОРА ===

function setEditorMode(mode) {
	editorMode = mode

	// Сохраняем в память
	localStorage.setItem('ecrous_editor_mode', mode)

	// Переключаем класс на body для CSS (скрытие/показ портов)
	document.body.classList.toggle('mode-nodes', mode === 'nodes')

	// Обновляем активность кнопок
	const btnStack = document.getElementById('btnModeStack')
	const btnNodes = document.getElementById('btnModeNodes')
	if (btnStack)
		btnStack.className = mode === 'stack' ? 'mode-btn active' : 'mode-btn'
	if (btnNodes)
		btnNodes.className = mode === 'nodes' ? 'mode-btn active' : 'mode-btn'

	// Если включили ноды - нужно перерисовать линии
	if (mode === 'nodes') {
		setTimeout(() => {
			if (typeof updateAllConnections === 'function') updateAllConnections()
		}, 50)
	}
}

function saveEditorState() {
	// Сохраняем режим, зум и позицию камеры
	const state = {
		mode: editorMode,
		panX: panX,
		panY: panY,
		zoom: zoomLevel,
	}
	localStorage.setItem(
		'ecrous_editor_state_' + currentProjectName,
		JSON.stringify(state)
	)
}

function restoreEditorState() {
	// 1. Сначала пробуем загрузить полные настройки (зум + режим) для конкретного проекта
	const rawState = localStorage.getItem(
		'ecrous_editor_state_' + currentProjectName
	)

	let savedMode = 'stack'

	if (rawState) {
		try {
			const state = JSON.parse(rawState)
			savedMode = state.mode || 'stack'

			// Восстанавливаем камеру
			if (state.panX !== undefined) panX = state.panX
			if (state.panY !== undefined) panY = state.panY
			if (state.zoom !== undefined) zoomLevel = state.zoom

			updateTransform() // Применяем зум и позицию
		} catch (e) {
			console.warn('Ошибка загрузки состояния редактора', e)
		}
	} else {
		// Фолбэк: если нет настроек проекта, берем глобальную настройку режима
		savedMode = localStorage.getItem('ecrous_editor_mode') || 'stack'
	}

	// 2. Применяем режим
	setEditorMode(savedMode)
}

// Переопределяем функцию createToolboxItem (она большая, оставляем как была)
function createToolboxItem(id, icon, color, label, isTemplate) {
	const el = document.createElement('div')
	el.className = 'tool-item'
	// ВАЖНО: draggable оставляем true только для ПК
	el.draggable = true
	el.innerHTML = `<i class="${icon}" style="color:${color}"></i> ${label}`

	// Логика удаления пользовательских шаблонов
	if (isTemplate) {
		const delBtn = document.createElement('i')
		delBtn.className = 'ri-delete-bin-line'
		delBtn.style.marginLeft = 'auto'
		delBtn.style.opacity = '0.5'
		delBtn.style.cursor = 'pointer'
		delBtn.onclick = e => {
			e.stopPropagation()
			deleteTemplate(id)
		}
		el.appendChild(delBtn)
	}

	// --- ЛОГИКА ДЛЯ ПК (Drag & Drop) ---
	el.ondragstart = e => {
		e.dataTransfer.setData('text/plain', isTemplate ? `TEMPLATE:${id}` : id)
		// Создаем "призрака" для перетаскивания мышью
		// (Убедитесь, что функция createBlockGhost доступна в коде, обычно она рядом)
		if (typeof createBlockGhost === 'function') {
			const ghost = createBlockGhost(id, label, color, icon)
			e.dataTransfer.setDragImage(ghost, 20, 20)
			setTimeout(() => document.body.removeChild(ghost), 0)
		}
	}

	if (typeof attachMobileDrag === 'function') {
		attachMobileDrag(el, id, isTemplate) //
	}

	toolbox.appendChild(el)
}

function initMobileLibrary() {}

function getActiveScene() {
	return projectData.scenes.find(s => s.id === activeSceneId)
}
function getActiveObject() {
	const scene = getActiveScene()
	return scene ? scene.objects.find(o => o.id === activeObjectId) : null
}

// ==========================================
// --- УПРАВЛЕНИЕ ПАПКАМИ И САЙДБАРОМ ---
// ==========================================

// 1. Функция создания папки
async function addFolder(type) {
	const name = await showCustomPrompt(
		'Новая папка',
		'Введите название папки:',
		'New Folder'
	)
	if (!name) return

	if (type === 'scene') {
		// Инициализируем массив папок проекта, если нет
		if (!projectData.sceneFolders) projectData.sceneFolders = []

		if (!projectData.sceneFolders.includes(name)) {
			projectData.sceneFolders.push(name)
		} else {
			alert('Папка с таким именем уже есть!')
		}
	} else if (type === 'object') {
		const currentScene = getActiveScene()
		if (!currentScene) return

		// Инициализируем массив папок сцены
		if (!currentScene.objectFolders) currentScene.objectFolders = []

		if (!currentScene.objectFolders.includes(name)) {
			currentScene.objectFolders.push(name)
		} else {
			alert('Папка с таким именем уже есть!')
		}
	}

	saveProjectToLocal()
	renderSidebar()
}

// 2. Функция удаления папки (Только если пустая или с подтверждением)
async function deleteFolder(type, folderName) {
	const confirmed = await showConfirmDialog(
		'Удаление папки',
		`Удалить папку "${folderName}"? Объекты внутри станут "без папки".`
	)
	if (!confirmed) return

	if (type === 'scene') {
		// Убираем папку из списка
		projectData.sceneFolders = projectData.sceneFolders.filter(
			f => f !== folderName
		)
		// Сбрасываем привязку у сцен внутри этой папки
		projectData.scenes.forEach(s => {
			if (s.folder === folderName) delete s.folder
		})
	} else {
		const scene = getActiveScene()
		if (scene) {
			scene.objectFolders = scene.objectFolders.filter(f => f !== folderName)
			// Сбрасываем привязку у объектов
			scene.objects.forEach(o => {
				if (o.folder === folderName) delete o.folder
			})
		}
	}
	saveProjectToLocal()
	renderSidebar()
}

// 3. Контекстное меню для элементов (Добавляем "Переместить в папку")
// ВАЖНО: Вызывайте эту функцию при клике ПКМ на элемент в рендере
function showMoveContextMenu(e, id, type) {
	if (e) e.preventDefault()
	if (e) e.stopPropagation()

	// 1. Определяем список папок
	const folders =
		type === 'scene'
			? projectData.sceneFolders || []
			: getActiveScene().objectFolders || []

	// 2. Ищем текущую папку объекта
	let currentFolder = undefined
	if (type === 'scene') {
		const s = projectData.scenes.find(x => x.id === id)
		if (s) currentFolder = s.folder
	} else {
		const o = getActiveScene().objects.find(x => x.id === id)
		if (o) currentFolder = o.folder
	}

	// 3. Определяем, что делать при выборе (Callback)
	const onSelect = selectedFolder => {
		if (type === 'scene') {
			const scene = projectData.scenes.find(s => s.id === id)
			if (scene) scene.folder = selectedFolder
		} else {
			const obj = getActiveScene().objects.find(o => o.id === id)
			if (obj) obj.folder = selectedFolder
		}
		saveProjectToLocal()
		renderSidebar()
	}

	// 4. Вызываем модальное окно с ПРАВИЛЬНЫМИ аргументами
	showFolderSelectModal('Переместить в...', folders, currentFolder, onSelect)
}

function showFolderSelectModal(title, folders, currentFolder, onSelect) {
	// 1. Создаем фон
	const overlay = document.createElement('div')
	overlay.className = 'modal-overlay active'
	overlay.style.zIndex = '10000' // Поверх всего

	// 2. Создаем окно
	const win = document.createElement('div')
	win.className = 'modal-window'
	win.style.width = '300px'

	// Заголовок
	const header = document.createElement('div')
	header.className = 'modal-title'
	header.innerHTML = `<i class="ri-folder-shared-line"></i> ${title}`
	win.appendChild(header)

	// Контейнер списка
	const list = document.createElement('div')
	list.style.display = 'flex'
	list.style.flexDirection = 'column'
	list.style.gap = '8px'
	list.style.marginTop = '15px'
	list.style.maxHeight = '300px'
	list.style.overflowY = 'auto'

	// Функция создания кнопки-варианта
	const createOption = (name, icon, isSpecial = false) => {
		const btn = document.createElement('button')
		btn.className = 'modal-btn'
		// Если это текущая папка - подсветим или выключим
		if (name === currentFolder) {
			btn.style.opacity = '0.5'
			btn.style.border = '1px solid var(--accent)'
		} else {
			btn.className = 'modal-btn secondary'
		}

		btn.style.justifyContent = 'flex-start'
		btn.style.textAlign = 'left'

		const label = name === undefined ? 'Без папки (Корень)' : name
		btn.innerHTML = `<i class="${icon}"></i> ${label}`

		btn.onclick = () => {
			onSelect(name) // Возвращаем имя папки (или undefined)
			document.body.removeChild(overlay)
		}
		list.appendChild(btn)
	}

	// 3. Добавляем вариант "В корень" (убрать из папки)
	createOption(undefined, 'ri-home-4-line', true)

	// 4. Добавляем существующие папки
	if (folders.length > 0) {
		const divider = document.createElement('div')
		divider.innerText = 'Папки:'
		divider.style.fontSize = '11px'
		divider.style.opacity = '0.5'
		divider.style.marginTop = '5px'
		list.appendChild(divider)

		folders.forEach(fName => {
			createOption(fName, 'ri-folder-fill')
		})
	} else {
		const empty = document.createElement('div')
		empty.innerText = 'Нет созданных папок'
		empty.style.fontSize = '12px'
		empty.style.opacity = '0.5'
		empty.style.textAlign = 'center'
		empty.style.padding = '10px'
		list.appendChild(empty)
	}

	win.appendChild(list)

	// Кнопка Отмена
	const footer = document.createElement('div')
	footer.className = 'modal-buttons'
	footer.style.marginTop = '20px'
	const cancelBtn = document.createElement('button')
	cancelBtn.className = 'modal-btn danger'
	cancelBtn.innerText = 'Отмена'
	cancelBtn.onclick = () => document.body.removeChild(overlay)
	footer.appendChild(cancelBtn)
	win.appendChild(footer)

	overlay.appendChild(win)
	document.body.appendChild(overlay)
}

// Функция хелпер для назначения событий на контейнер списка
function attachDropToContainer(container, targetType) {
	container.ondragover = e => {
		e.preventDefault()
		// Подсвечиваем только если тащим над самим контейнером, а не над папкой внутри
		if (e.target === container) {
			container.classList.add('drag-over')
		}
	}
	container.ondragleave = () => container.classList.remove('drag-over')

	container.ondrop = e => {
		e.preventDefault()
		container.classList.remove('drag-over')

		// Если бросили прямо в контейнер (а не в папку) -> Перемещаем в КОРЕНЬ
		if (e.target === container || e.target.classList.contains('list-item')) {
			const draggedId = e.dataTransfer.getData('id')
			const draggedType = e.dataTransfer.getData('type')

			if (draggedType !== targetType) return

			if (targetType === 'scene') {
				const scene = projectData.scenes.find(s => s.id === draggedId)
				if (scene) delete scene.folder // Удаляем папку
			} else {
				const obj = getActiveScene().objects.find(o => o.id === draggedId)
				if (obj) delete obj.folder // Удаляем папку
			}

			saveProjectToLocal()
			renderSidebar()
		}
	}
}

function renderSidebar() {
	sceneListEl.innerHTML = ''
	objectListEl.innerHTML = ''

	// --- ПОДКЛЮЧАЕМ DROP В КОРЕНЬ ---
	attachDropToContainer(sceneListEl, 'scene')
	attachDropToContainer(objectListEl, 'object')
	// --------------------------------

	// ... (Дальше стандартный код рендера, как был раньше) ...

	// 1. РЕНДЕР СЦЕН
	const sceneFolders = projectData.sceneFolders || []
	const scenesWithoutFolder = []
	const scenesByFolder = {}

	projectData.scenes.forEach(scene => {
		if (scene.folder && sceneFolders.includes(scene.folder)) {
			if (!scenesByFolder[scene.folder]) scenesByFolder[scene.folder] = []
			scenesByFolder[scene.folder].push(scene)
		} else {
			scenesWithoutFolder.push(scene)
		}
	})

	sceneFolders.forEach(folderName => {
		renderFolderGroup(
			sceneListEl,
			folderName,
			scenesByFolder[folderName] || [],
			'scene'
		)
	})

	scenesWithoutFolder.forEach(scene => {
		sceneListEl.appendChild(createSceneElement(scene))
	})

	// 2. РЕНДЕР ОБЪЕКТОВ
	const currentScene = getActiveScene()
	if (currentScene) {
		const objectFolders = currentScene.objectFolders || []
		const objectsWithoutFolder = []
		const objectsByFolder = {}

		currentScene.objects.forEach(obj => {
			if (obj.folder && objectFolders.includes(obj.folder)) {
				if (!objectsByFolder[obj.folder]) objectsByFolder[obj.folder] = []
				objectsByFolder[obj.folder].push(obj)
			} else {
				objectsWithoutFolder.push(obj)
			}
		})

		objectFolders.forEach(folderName => {
			renderFolderGroup(
				objectListEl,
				folderName,
				objectsByFolder[folderName] || [],
				'object'
			)
		})

		objectsWithoutFolder.forEach(obj => {
			objectListEl.appendChild(createObjectElement(obj))
		})
	}

	updateBreadcrumbs()
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ РЕНДЕРА ---

function renderFolderGroup(container, name, items, type) {
	// 1. Заголовок папки
	const folderEl = document.createElement('div')
	folderEl.className = 'sidebar-folder open'

	// Восстановление состояния (открыта/закрыта)
	const isClosed =
		localStorage.getItem(`folder_closed_${type}_${name}`) === 'true'
	if (isClosed) folderEl.classList.remove('open')

	folderEl.innerHTML = `
        <i class="ri-arrow-right-s-line folder-arrow"></i>
        <i class="ri-folder-fill folder-icon"></i>
        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; pointer-events:none;">${name}</span>
        <i class="ri-delete-bin-line action-icon" style="font-size:12px; opacity:0.5;" title="Удалить папку"></i>
    `

	// 2. Контейнер контента
	const contentEl = document.createElement('div')
	contentEl.className = 'folder-content'

	// --- ЛОГИКА DRAG & DROP (ПРИЕМ ЭЛЕМЕНТОВ) ---
	folderEl.ondragover = e => {
		e.preventDefault() // Разрешаем сброс
		e.stopPropagation()
		folderEl.classList.add('drag-over')
	}

	folderEl.ondragleave = e => {
		e.preventDefault()
		e.stopPropagation()
		folderEl.classList.remove('drag-over')
	}

	folderEl.ondrop = e => {
		e.preventDefault()
		e.stopPropagation()
		folderEl.classList.remove('drag-over')

		const draggedId = e.dataTransfer.getData('id')
		const draggedType = e.dataTransfer.getData('type')

		// Проверка: Сцены только в папки сцен, Объекты к объектам
		if (draggedType !== type) return

		// Логика перемещения
		if (type === 'scene') {
			const scene = projectData.scenes.find(s => s.id === draggedId)
			if (scene) scene.folder = name
		} else {
			const obj = getActiveScene().objects.find(o => o.id === draggedId)
			if (obj) obj.folder = name
		}

		saveProjectToLocal()
		renderSidebar()
	}
	// ---------------------------------------------

	// Клик (свернуть/развернуть или удалить)
	folderEl.onclick = e => {
		if (e.target.classList.contains('ri-delete-bin-line')) {
			deleteFolder(type, name)
			return
		}
		folderEl.classList.toggle('open')
		localStorage.setItem(
			`folder_closed_${type}_${name}`,
			!folderEl.classList.contains('open')
		)
	}

	// Рендер элементов внутри
	items.forEach(item => {
		if (type === 'scene') contentEl.appendChild(createSceneElement(item))
		else contentEl.appendChild(createObjectElement(item))
	})

	container.appendChild(folderEl)
	container.appendChild(contentEl)
}

function createSceneElement(scene) {
	const el = document.createElement('div')
	el.className = `list-item ${scene.id === activeSceneId ? 'active' : ''}`

	// --- DRAGGABLE ---
	el.draggable = true
	el.ondragstart = e => {
		e.dataTransfer.setData('id', scene.id)
		e.dataTransfer.setData('type', 'scene')
		e.dataTransfer.effectAllowed = 'move'
	}
	// -----------------

	el.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; flex:1; overflow:hidden; pointer-events:none;">
            <i class="ri-movie-line"></i> 
            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${scene.name}</span>
        </div>
        <div class="item-actions" style="display:flex; gap:5px; padding-left:5px;">
            <i class="ri-folder-shared-line action-icon move-btn" title="В папку"></i>
            <i class="ri-edit-line action-icon rename-btn"></i>
            <i class="ri-delete-bin-line action-icon delete-btn" style="color:var(--danger)"></i>
        </div>
    `

	el.onclick = () => switchScene(scene.id)
	el.querySelector('.rename-btn').onclick = e => {
		e.stopPropagation()
		renameScene(scene.id)
	}
	el.querySelector('.delete-btn').onclick = e => {
		e.stopPropagation()
		deleteScene(scene.id)
	}
	el.querySelector('.move-btn').onclick = e => {
		showMoveContextMenu(e, scene.id, 'scene')
	}
	el.oncontextmenu = e => {
		showMoveContextMenu(e, scene.id, 'scene')
	}

	return el
}

function createObjectElement(obj) {
	const el = document.createElement('div')
	el.className = `list-item ${obj.id === activeObjectId ? 'active' : ''}`

	// --- DRAGGABLE ---
	el.draggable = true
	el.ondragstart = e => {
		e.dataTransfer.setData('id', obj.id)
		e.dataTransfer.setData('type', 'object')
		e.dataTransfer.effectAllowed = 'move'
	}
	// -----------------

	el.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; flex:1; overflow:hidden; pointer-events:none;">
            <i class="ri-cube-line"></i> 
            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${obj.name}</span>
        </div>
        <div class="item-actions" style="display:flex; gap:5px; padding-left:5px;">
            <i class="ri-folder-shared-line action-icon move-btn" title="В папку"></i>
            <i class="ri-edit-line action-icon rename-btn"></i>
            <i class="ri-delete-bin-line action-icon delete-btn" style="color:var(--danger)"></i>
        </div>
    `

	el.onclick = () => switchObject(obj.id)
	el.querySelector('.rename-btn').onclick = e => {
		e.stopPropagation()
		renameObject(obj.id)
	}
	el.querySelector('.delete-btn').onclick = e => {
		e.stopPropagation()
		deleteObject(obj.id)
	}
	el.querySelector('.move-btn').onclick = e => {
		showMoveContextMenu(e, obj.id, 'object')
	}
	el.oncontextmenu = e => {
		showMoveContextMenu(e, obj.id, 'object')
	}

	return el
}

function updateBreadcrumbs() {
	const objName = getActiveObject() ? getActiveObject().name : '---'
	const ctx = document.getElementById('current-context')
	const currentScene = getActiveScene()
	if (ctx) {
		ctx.innerText = `${currentScene ? currentScene.name : ''} > ${objName}`
	}
}

// ==========================================
// --- ФУНКЦИИ ДЛЯ МОДАЛЬНЫХ ОКОН ---
// ==========================================

/**
 * Показывает окно подтверждения (Да/Нет)
 * Возвращает Promise<boolean>: true если нажали "Удалить", false если "Отмена"
 */
function showConfirmDialog(title, message, yesLabel = 'Удалить') {
	return new Promise(resolve => {
		const overlay = document.getElementById('modal-general-confirm')
		const titleEl = document.getElementById('confirm-gen-title')
		const msgEl = document.getElementById('confirm-gen-message')
		const btnYes = document.getElementById('btn-confirm-yes')
		const btnNo = document.getElementById('btn-confirm-no')

		// Настраиваем тексты
		titleEl.innerHTML = `<i class="ri-delete-bin-line" style="color:var(--danger)"></i> ${title}`
		msgEl.innerText = message
		btnYes.innerText = yesLabel

		// Показываем окно
		overlay.classList.remove('hidden')
		setTimeout(() => overlay.classList.add('active'), 10)

		// Функция закрытия
		const close = result => {
			overlay.classList.remove('active')
			setTimeout(() => overlay.classList.add('hidden'), 200)

			// Очищаем события, чтобы не дублировались
			btnYes.onclick = null
			btnNo.onclick = null
			resolve(result)
		}

		btnYes.onclick = () => close(true)
		btnNo.onclick = () => close(false)
	})
}

/**
 * Использует уже существующее в index.html окно #custom-prompt-overlay
 */
function showCustomPrompt(title, message, defaultValue = '') {
	return new Promise(resolve => {
		const overlay = document.getElementById('custom-prompt-overlay')
		const titleEl = document.getElementById('modalTitle')
		const msgEl = document.getElementById('modalMessage')
		const inputEl = document.getElementById('modalInput')
		const btnConfirm = document.getElementById('btnModalConfirm')
		const btnCancel = document.getElementById('btnModalCancel')

		titleEl.innerText = title
		msgEl.innerText = message
		inputEl.value = defaultValue
		inputEl.style.borderColor = ''

		overlay.classList.remove('hidden')
		setTimeout(() => {
			overlay.classList.add('active')
			inputEl.focus()
			inputEl.select() // Выделяем текст для удобства
		}, 10)

		const close = val => {
			overlay.classList.remove('active')
			setTimeout(() => overlay.classList.add('hidden'), 200)
			btnConfirm.onclick = null
			btnCancel.onclick = null
			inputEl.onkeydown = null
			resolve(val)
		}

		btnConfirm.onclick = () => {
			const val = inputEl.value.trim()
			if (val) close(val)
			else {
				inputEl.style.borderColor = 'var(--danger)'
				inputEl.focus()
			}
		}

		btnCancel.onclick = () => close(null)

		// Enter для подтверждения
		inputEl.onkeydown = e => {
			inputEl.style.borderColor = ''
			if (e.key === 'Enter') btnConfirm.click()
			if (e.key === 'Escape') btnCancel.click()
		}
	})
}

// ==========================================
// --- ЛОГИКА УПРАВЛЕНИЯ (ОБНОВЛЕННАЯ) ---
// ==========================================

async function renameObject(id) {
	const scene = getActiveScene()
	const obj = scene.objects.find(o => o.id === id)
	if (!obj) return

	// Вызываем кастомное окно ввода
	const newName = await showCustomPrompt(
		'Переименование объекта',
		'Введите новое имя:',
		obj.name
	)

	if (newName) {
		obj.name = newName
		renderSidebar()
		saveProjectToLocal()
	}
}

async function deleteObject(id) {
	const scene = getActiveScene()
	const index = scene.objects.findIndex(o => o.id === id)
	if (index === -1) return

	const objName = scene.objects[index].name

	// Вызываем кастомное окно подтверждения
	const confirmed = await showConfirmDialog(
		'Удаление объекта',
		`Вы уверены, что хотите удалить объект "${objName}"? Это действие нельзя отменить.`
	)

	if (confirmed) {
		scene.objects.splice(index, 1)

		if (activeObjectId === id) {
			const nextObj = scene.objects[0]
			activeObjectId = nextObj ? nextObj.id : null
			if (!activeObjectId) loadWorkspace()
		}

		renderSidebar()
		saveProjectToLocal()
	}
}

async function renameScene(id) {
	const scene = projectData.scenes.find(s => s.id === id)
	if (!scene) return

	const newName = await showCustomPrompt(
		'Переименование сцены',
		'Новое название сцены:',
		scene.name
	)

	if (newName) {
		scene.name = newName
		renderSidebar()
		saveProjectToLocal()
	}
}

async function deleteScene(id) {
	if (projectData.scenes.length <= 1) {
		// Тут можно тоже сделать красивый alert, если хотите
		alert('Нельзя удалить единственную сцену!')
		return
	}

	const index = projectData.scenes.findIndex(s => s.id === id)
	if (index === -1) return

	const sceneName = projectData.scenes[index].name

	const confirmed = await showConfirmDialog(
		'Удаление сцены',
		`Удалить сцену "${sceneName}" и все объекты внутри неё?`
	)

	if (confirmed) {
		projectData.scenes.splice(index, 1)

		if (activeSceneId === id) {
			switchScene(projectData.scenes[0].id)
		} else {
			renderSidebar()
		}
		saveProjectToLocal()
	}
}

function switchScene(id) {
	saveCurrentWorkspace()
	activeSceneId = id
	activeObjectId = getActiveScene().objects[0]?.id
	renderSidebar()
	loadWorkspace()
}
function switchObject(id) {
	saveCurrentWorkspace()
	activeObjectId = id
	renderSidebar()
	loadWorkspace()
}
async function addScene() {
	const defaultName = `Сцена ${projectData.scenes.length + 1}`
	const name = await showCustomPrompt(
		'Новая сцена',
		'Придумайте название для сцены:',
		defaultName
	)
	if (!name) return
	const id = 'scene_' + Date.now()
	projectData.scenes.push({ id, name, objects: [] })
	switchScene(id)
	addDefaultObject()
}

async function addObject() {
	const s = getActiveScene()
	if (!s) return
	const defaultName = `Объект ${s.objects.length + 1}`
	const name = await showCustomPrompt(
		'Новый объект',
		'Название объекта:',
		defaultName
	)
	if (!name) return
	createObjectInternal(s, name)
}

function createObjectInternal(scene, name) {
	const id = 'obj_' + Date.now()
	scene.objects.push({ id, name, scripts: [], connections: [] })
	switchObject(id)
}

function addDefaultObject() {
	const s = getActiveScene()
	if (s) createObjectInternal(s, 'GameManager')
}

function showCustomPrompt(title, message, defaultValue = '') {
	return new Promise(resolve => {
		const overlay = document.getElementById('custom-prompt-overlay')
		const titleEl = document.getElementById('modalTitle')
		const msgEl = document.getElementById('modalMessage')
		const inputEl = document.getElementById('modalInput')
		const btnConfirm = document.getElementById('btnModalConfirm')
		const btnCancel = document.getElementById('btnModalCancel')

		titleEl.innerText = title
		msgEl.innerText = message
		inputEl.value = defaultValue
		inputEl.style.borderColor = ''

		overlay.classList.remove('hidden')
		setTimeout(() => {
			overlay.classList.add('active')
			inputEl.focus()
			inputEl.select()
		}, 10)

		const cleanup = () => {
			overlay.classList.remove('active')
			setTimeout(() => overlay.classList.add('hidden'), 200)
			btnConfirm.onclick = null
			btnCancel.onclick = null
			inputEl.onkeydown = null
		}

		btnConfirm.onclick = () => {
			const val = inputEl.value.trim()
			if (val) {
				cleanup()
				resolve(val)
			} else {
				inputEl.style.borderColor = 'var(--danger)'
				inputEl.focus()
			}
		}

		btnCancel.onclick = () => {
			cleanup()
			resolve(null)
		}

		inputEl.onkeydown = e => {
			inputEl.style.borderColor = ''
			if (e.key === 'Enter') btnConfirm.click()
			if (e.key === 'Escape') btnCancel.click()
		}
	})
}

function loadCustomTemplates() {
	try {
		const raw = localStorage.getItem('ecrous_custom_templates')
		customTemplates = raw ? JSON.parse(raw) : {}
	} catch (e) {
		customTemplates = {}
	}
}

function initToolbox() {
	const toolbox = document.querySelector('#toolboxContent')
	if (!toolbox) return
	toolbox.innerHTML = ''

	// Группируем блоки: Категория -> [Блоки]
	const categories = {}

	const order = [
		'События',
		'Данные',
		'Переменные',
		'Логика',
		'Ввод',
		'Группы',
		'Объекты',
		'Таблицы',
		'Движение',
		'Физика',
		'Камера',
		'Инвентарь',
		'Задания',
		'Интерфейс',
		'Устройство',
		'Текст',
		'Видео',
		'Анимация',
		'Тайлмап',
		'Графика',
		'Звук',
		'Компоненты',
		'Сцена',
		'Система',
		'3D',
		'Пост-процесс',
		'Отладка',
	]

	BLOCK_DEFINITIONS.forEach(b => {
		if (!categories[b.category]) categories[b.category] = []
		categories[b.category].push(b)
	})

	order.forEach(cat => {
		if (categories[cat]) {
			// 1. Рисуем Главный Заголовок Категории
			const title = document.createElement('div')
			title.className = 'category-title'
			title.innerText = cat
			toolbox.appendChild(title)

			// 2. Группируем внутри категории по subcategory
			let currentSub = null

			// Сортируем блоки, чтобы подкатегории шли вместе
			categories[cat].sort((a, b) => {
				const subA = a.subcategory || ''
				const subB = b.subcategory || ''
				return subA.localeCompare(subB)
			})

			categories[cat].forEach(def => {
				// Если у блока есть подкатегория и она отличается от предыдущей
				if (def.subcategory && def.subcategory !== currentSub) {
					currentSub = def.subcategory

					const subHeader = document.createElement('div')
					subHeader.className = 'toolbox-subheader' // CSS класс ниже
					subHeader.innerHTML = `<i class="ri-arrow-down-s-line"></i> ${currentSub}`
					toolbox.appendChild(subHeader)
				}
				// Если подкатегории нет, но предыдущая была (сброс)
				else if (!def.subcategory && currentSub !== null) {
					currentSub = null
					const divider = document.createElement('div')
					divider.className = 'toolbox-divider'
					toolbox.appendChild(divider)
				}

				createToolboxItem(def.id, def.icon, def.color, def.label, false)
			})
		}
	})
}

// Новая функция: Создание переменной
function createNewVariable() {
	// --- ИСПРАВЛЕНИЕ: Гарантируем, что массив существует ---
	if (!projectData.variables) projectData.variables = []
	// -------------------------------------------------------

	const name = prompt('Имя новой переменной:')
	if (!name) return

	// Проверка на дубликаты
	if (projectData.variables.includes(name)) {
		alert('Такая переменная уже есть!')
		return
	}

	projectData.variables.push(name)
	initToolbox() // Перерисовать тулбокс
	if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace()
}

// Новая функция: Создание "пилюли" (Scratch style)
function createVariablePill(name) {
	const el = document.createElement('div')
	el.className = 'variable-pill'
	el.draggable = true
	el.innerText = name

	// DRAG START: Мы передаем специальный формат
	el.ondragstart = e => {
		// Передаем текст в формате {name}, чтобы движок понял, что это переменная
		e.dataTransfer.setData('text/plain', `{${name}}`)
		e.dataTransfer.setData('type', 'variable')
	}

	// Контекстное меню для удаления
	el.oncontextmenu = e => {
		e.preventDefault()
		if (confirm(`Удалить переменную "${name}"?`)) {
			projectData.variables = projectData.variables.filter(v => v !== name)
			initToolbox()
		}
	}

	return el
}

// ==========================================
// --- ПОИСК ПО БЛОКАМ (FIX) ---
// ==========================================

// Навешиваем событие на инпут поиска
const searchInput = document.getElementById('blockSearchInput')
if (searchInput) {
	searchInput.addEventListener('input', e => {
		filterToolbox(e.target.value)
	})
}

function filterToolbox(text) {
	const query = text.toLowerCase().trim()
	const container = document.getElementById('toolboxContent')
	if (!container) return

	// Получаем все элементы (заголовки, подзаголовки, инструменты)
	const items = Array.from(container.children)

	// Сбрасываем видимость если поиск пустой
	if (!query) {
		items.forEach(el => (el.style.display = ''))
		return
	}

	// 1. Сначала скрываем всё
	items.forEach(el => (el.style.display = 'none'))

	// 2. Проходимся и ищем совпадения в блоках
	for (let i = 0; i < items.length; i++) {
		const el = items[i]

		// Нас интересуют только сами блоки (tool-item)
		if (el.classList.contains('tool-item')) {
			const label = el.innerText.toLowerCase()

			// Если нашли совпадение
			if (label.includes(query)) {
				// Показываем сам блок
				el.style.display = 'flex' // или 'block', в зависимости от CSS. Flex для .tool-item

				// 3. (Опционально) Показываем заголовок категории над этим блоком
				// Идем вверх от текущего элемента и ищем ближайший заголовок
				for (let j = i - 1; j >= 0; j--) {
					const prev = items[j]
					// Если наткнулись на заголовок категории или подкатегории
					if (
						prev.classList.contains('category-title') ||
						prev.classList.contains('toolbox-subheader')
					) {
						prev.style.display = 'block'
						// Если это подкатегория, ищем еще выше Главную категорию
						if (prev.classList.contains('toolbox-subheader')) {
							// Продолжаем цикл j вниз, пока не найдем category-title
							// (Для простоты в этой версии можно показывать просто ближайший заголовок)
						} else {
							// Если это главный заголовок - останавливаемся, мы его нашли
							break
						}
					}
					// Если наткнулись на другой блок - значит заголовки кончились (или мы внутри группы),
					// просто продолжаем искать вверх, пока не упремся в заголовок.
					if (prev.classList.contains('tool-item')) continue
				}
			}
		}
	}
}

// ==========================================
// --- ГЕНЕРАЦИЯ НАВИГАЦИИ ---
// ==========================================
function initToolboxNavigation() {
    const navContainer = document.querySelector('.toolbox-nav');
    const contentContainer = document.getElementById('toolboxContent');
    
    // Проверка наличия элементов и определений блоков
    if (!navContainer || !contentContainer || typeof BLOCK_DEFINITIONS === 'undefined') return;

    navContainer.innerHTML = ''; // Очистка

    // 1. Собираем уникальные категории и их цвета
    const categories = {};
    // Порядок категорий важен, берем его по мере встречи в массиве
    const categoryOrder = [];

    BLOCK_DEFINITIONS.forEach(block => {
        if (!categories[block.category]) {
            categories[block.category] = block.color; // Запоминаем цвет первой встречи
            categoryOrder.push(block.category);
        }
    });

    // 2. Создаем кнопки
    categoryOrder.forEach(catName => {
        const color = categories[catName];
        
        const btn = document.createElement('div');
        btn.className = 'nav-item';
        // Используем data-атрибут для связи
        btn.dataset.target = catName.toLowerCase();
        
        btn.innerHTML = `
            <div class="nav-circle" style="background-color: ${color}; box-shadow: 0 2px 5px ${color}66;"></div>
            <span class="nav-label">${catName}</span>
        `;

        // 3. Клик - скролл к заголовку категории
        btn.addEventListener('click', () => {
            // Ищем заголовок в тулбоксе
            // Предлагаю добавить атрибут data-category к заголовкам при их генерации, 
            // но если они просто текст, ищем по тексту:
            const headers = Array.from(contentContainer.querySelectorAll('.category-title'));
            const targetHeader = headers.find(h => h.innerText.trim().toLowerCase() === catName.toLowerCase());

            if (targetHeader) {
                // Скроллим с отступом для поиска
                const offset = 50; // Высота поиска примерно
                const elementPosition = targetHeader.getBoundingClientRect().top;
                const offsetPosition = elementPosition + contentContainer.scrollTop - contentContainer.getBoundingClientRect().top - offset;

                contentContainer.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });

        navContainer.appendChild(btn);
    });
}

// Вызываем функцию после загрузки (добавьте это в конец DOMContentLoaded)
initToolboxNavigation();
