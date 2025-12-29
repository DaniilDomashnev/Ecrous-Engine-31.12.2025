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
	initMobileLibrary()
	initCanvasEvents()
	initContextMenu()
	initGameWindowDrag()

	// 6. Загрузка проекта
	loadProjectFromLocal()

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
		}
		activeSceneId = 'scene_1'
		activeObjectId = 'obj_1'
		saveProjectToLocal()
	}

	// Имя проекта в шапке
	const brandTitle = document.querySelector('.brand')
	if (brandTitle) {
		brandTitle.innerHTML = `<i class="ri-settings-3-line" style="font-size:20px; color:var(--accent);"></i> ${currentProjectName}`
	}

	// 7. Отрисовка интерфейса
	renderSidebar()
	loadWorkspace()

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

function renderSidebar() {
	sceneListEl.innerHTML = ''
	objectListEl.innerHTML = ''

	// --- РЕНДЕР СЦЕН ---
	projectData.scenes.forEach(scene => {
		const el = document.createElement('div')
		el.className = `list-item ${scene.id === activeSceneId ? 'active' : ''}`

		// Используем Flexbox для размещения иконок справа
		el.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; flex:1; overflow:hidden;">
                <i class="ri-movie-line"></i> 
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${scene.name}</span>
            </div>
            <div class="item-actions" style="display:flex; gap:5px; padding-left:5px;">
                <i class="ri-edit-line action-icon rename-btn" title="Переименовать"></i>
                <i class="ri-delete-bin-line action-icon delete-btn" style="color:var(--danger)" title="Удалить"></i>
            </div>
        `

		// Клик по всей строке - выбор сцены
		el.onclick = e => switchScene(scene.id)

		// Кнопка переименования
		el.querySelector('.rename-btn').onclick = e => {
			e.stopPropagation() // Чтобы не срабатывал выбор сцены
			renameScene(scene.id)
		}

		// Кнопка удаления
		el.querySelector('.delete-btn').onclick = e => {
			e.stopPropagation()
			deleteScene(scene.id)
		}

		sceneListEl.appendChild(el)
	})

	// --- РЕНДЕР ОБЪЕКТОВ ---
	const currentScene = getActiveScene()
	if (currentScene) {
		currentScene.objects.forEach(obj => {
			const el = document.createElement('div')
			el.className = `list-item ${obj.id === activeObjectId ? 'active' : ''}`

			el.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; flex:1; overflow:hidden;">
                    <i class="ri-cube-line"></i> 
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${obj.name}</span>
                </div>
                <div class="item-actions" style="display:flex; gap:5px; padding-left:5px;">
                    <i class="ri-edit-line action-icon rename-btn" title="Переименовать"></i>
                    <i class="ri-delete-bin-line action-icon delete-btn" style="color:var(--danger)" title="Удалить"></i>
                </div>
            `

			// Клик по всей строке - выбор объекта
			el.onclick = () => switchObject(obj.id)

			// Кнопка переименования
			el.querySelector('.rename-btn').onclick = e => {
				e.stopPropagation()
				renameObject(obj.id)
			}

			// Кнопка удаления
			el.querySelector('.delete-btn').onclick = e => {
				e.stopPropagation()
				deleteObject(obj.id)
			}

			objectListEl.appendChild(el)
		})
	}

	// Обновляем "хлебные крошки" внизу панели
	const objName = getActiveObject() ? getActiveObject().name : '---'
	const ctx = document.getElementById('current-context')
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
function showConfirmDialog(title, message, yesLabel = "Удалить") {
    return new Promise((resolve) => {
        const overlay = document.getElementById('modal-general-confirm');
        const titleEl = document.getElementById('confirm-gen-title');
        const msgEl = document.getElementById('confirm-gen-message');
        const btnYes = document.getElementById('btn-confirm-yes');
        const btnNo = document.getElementById('btn-confirm-no');

        // Настраиваем тексты
        titleEl.innerHTML = `<i class="ri-delete-bin-line" style="color:var(--danger)"></i> ${title}`;
        msgEl.innerText = message;
        btnYes.innerText = yesLabel;

        // Показываем окно
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('active'), 10);

        // Функция закрытия
        const close = (result) => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.classList.add('hidden'), 200);
            
            // Очищаем события, чтобы не дублировались
            btnYes.onclick = null;
            btnNo.onclick = null;
            resolve(result);
        };

        btnYes.onclick = () => close(true);
        btnNo.onclick = () => close(false);
    });
}

/**
 * Использует уже существующее в index.html окно #custom-prompt-overlay
 */
function showCustomPrompt(title, message, defaultValue = '') {
    return new Promise(resolve => {
        const overlay = document.getElementById('custom-prompt-overlay');
        const titleEl = document.getElementById('modalTitle');
        const msgEl = document.getElementById('modalMessage');
        const inputEl = document.getElementById('modalInput');
        const btnConfirm = document.getElementById('btnModalConfirm');
        const btnCancel = document.getElementById('btnModalCancel');

        titleEl.innerText = title;
        msgEl.innerText = message;
        inputEl.value = defaultValue;
        inputEl.style.borderColor = '';

        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.add('active');
            inputEl.focus();
            inputEl.select(); // Выделяем текст для удобства
        }, 10);

        const close = (val) => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.classList.add('hidden'), 200);
            btnConfirm.onclick = null;
            btnCancel.onclick = null;
            inputEl.onkeydown = null;
            resolve(val);
        };

        btnConfirm.onclick = () => {
            const val = inputEl.value.trim();
            if (val) close(val);
            else {
                inputEl.style.borderColor = 'var(--danger)';
                inputEl.focus();
            }
        };

        btnCancel.onclick = () => close(null);

        // Enter для подтверждения
        inputEl.onkeydown = (e) => {
            inputEl.style.borderColor = '';
            if (e.key === 'Enter') btnConfirm.click();
            if (e.key === 'Escape') btnCancel.click();
        };
    });
}


// ==========================================
// --- ЛОГИКА УПРАВЛЕНИЯ (ОБНОВЛЕННАЯ) ---
// ==========================================

async function renameObject(id) {
    const scene = getActiveScene();
    const obj = scene.objects.find(o => o.id === id);
    if (!obj) return;

    // Вызываем кастомное окно ввода
    const newName = await showCustomPrompt(
        "Переименование объекта", 
        "Введите новое имя:", 
        obj.name
    );
    
    if (newName) {
        obj.name = newName;
        renderSidebar();      
        saveProjectToLocal(); 
    }
}

async function deleteObject(id) {
    const scene = getActiveScene();
    const index = scene.objects.findIndex(o => o.id === id);
    if (index === -1) return;

    const objName = scene.objects[index].name;

    // Вызываем кастомное окно подтверждения
    const confirmed = await showConfirmDialog(
        "Удаление объекта",
        `Вы уверены, что хотите удалить объект "${objName}"? Это действие нельзя отменить.`
    );

    if (confirmed) {
        scene.objects.splice(index, 1);
        
        if (activeObjectId === id) {
            const nextObj = scene.objects[0];
            activeObjectId = nextObj ? nextObj.id : null;
            if(!activeObjectId) loadWorkspace();
        }
        
        renderSidebar();
        saveProjectToLocal();
    }
}

async function renameScene(id) {
    const scene = projectData.scenes.find(s => s.id === id);
    if (!scene) return;

    const newName = await showCustomPrompt(
        "Переименование сцены", 
        "Новое название сцены:", 
        scene.name
    );
    
    if (newName) {
        scene.name = newName;
        renderSidebar();
        saveProjectToLocal();
    }
}

async function deleteScene(id) {
    if (projectData.scenes.length <= 1) {
        // Тут можно тоже сделать красивый alert, если хотите
        alert("Нельзя удалить единственную сцену!"); 
        return;
    }

    const index = projectData.scenes.findIndex(s => s.id === id);
    if (index === -1) return;
    
    const sceneName = projectData.scenes[index].name;

    const confirmed = await showConfirmDialog(
        "Удаление сцены",
        `Удалить сцену "${sceneName}" и все объекты внутри неё?`
    );

    if (confirmed) {
        projectData.scenes.splice(index, 1);
        
        if (activeSceneId === id) {
            switchScene(projectData.scenes[0].id);
        } else {
            renderSidebar();
        }
        saveProjectToLocal();
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
	const toolbox = document.querySelector('#toolboxContent') // Убедись, что селектор верный
	if (!toolbox) return
	toolbox.innerHTML = ''

	// --- 1. СПЕЦИАЛЬНЫЙ РАЗДЕЛ: ПЕРЕМЕННЫЕ ---
	const varTitle = document.createElement('div')
	varTitle.className = 'category-title'
	varTitle.innerText = 'ПЕРЕМЕННЫЕ'
	toolbox.appendChild(varTitle)

	// Кнопка "Создать переменную"
	const btnCreateVar = document.createElement('button')
	btnCreateVar.className = 'btn-create-var' // Стилизуем ниже
	btnCreateVar.innerHTML = '<i class="ri-add-line"></i> Создать переменную'
	btnCreateVar.onclick = createNewVariable
	toolbox.appendChild(btnCreateVar)

	// Список переменных (Пилюли)
	if (!projectData.variables) projectData.variables = [] // Инициализация списка

	const varList = document.createElement('div')
	varList.id = 'toolbox-vars'
	projectData.variables.forEach(varName => {
		const pill = createVariablePill(varName)
		varList.appendChild(pill)
	})
	toolbox.appendChild(varList)

	// --- 2. ОСТАЛЬНЫЕ БЛОКИ ---
	const categories = {}
	BLOCK_DEFINITIONS.forEach(b => {
		if (!categories[b.category]) categories[b.category] = []
		categories[b.category].push(b)
	})

	const order = [
		'События', // Точки входа: On start, On tick, триггеры, функции
		'Сцены', // Переходы между лэйаутами, загрузка/выгрузка сцен
		'Данные', // Загрузка/сохранение (AJAX, Local Storage, Array и т.д.)
		'Переменные', // Инициализация глобальных/локальных переменных и состояний
		'Логика', // Основные условия, ветвления, циклы, математика
		'Ввод', // Клавиатура, мышь, тач, геймпад — обработка ввода
		'Группы', // Организация событий по модулям/сущностям
		'Объекты', // Создание, уничтожение, спавн, семьи объектов
		'Движение', // Перемещение (платформер, pathfinding, bullet и т.д.)
		'Физика', // Коллизии, силы, Physics behavior
		'Камера', // Скроллинг, следование, zoom, shake
		'Инвентарь', // Система предметов, экипировка
		'Задания', // Квесты, миссии, прогресс
		'Интерфейс', // HUD, кнопки, меню, панели
		'Текст', // Текстовые объекты, счёт, диалоги
		'Анимация', // Анимации спрайтов, частицы
		'Графика', // Эффекты, шейдеры, parallax, пост-обработка
		'Звук', // Музыка, звуковые эффекты, громкость
		'Компоненты', // Кастомные поведения и модули
		'Окно', // Fullscreen, resize, ориентация окна
		'Система', // Таймеры, браузер API, реклама, достижения
		'Отладка', // Логи, дебаг-информация, тестовые события
	]

	order.forEach(cat => {
		if (categories[cat]) {
			const title = document.createElement('div')
			title.className = 'category-title'
			title.innerText = cat
			toolbox.appendChild(title)
			categories[cat].forEach(def => {
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
	if(typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace();
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
