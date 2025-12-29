// ==========================================
// --- МЕНЮ ПРАВКА (EDIT ACTIONS) ---
// ==========================================

// Глобальные переменные для системы правки
let appClipboard = null // Буфер обмена
let actionHistory = [] // История (Undo)
let historyStep = -1 // Текущая позиция в истории
const MAX_HISTORY = 30 // Макс. шагов

// --- 1. СИСТЕМА UNDO / REDO ---

// Вызывать ПЕРЕД любым изменением данных (удаление, создание, перемещение)
function recordHistoryState() {
	// Если мы были "в прошлом", отрезаем "будущее"
	if (historyStep < actionHistory.length - 1) {
		actionHistory = actionHistory.slice(0, historyStep + 1)
	}

	// Сохраняем полную копию projectData
	const state = JSON.stringify(projectData)
	actionHistory.push(state)

	// Ограничение памяти
	if (actionHistory.length > MAX_HISTORY) {
		actionHistory.shift()
	} else {
		historyStep++
	}

	// Активируем/деактивируем кнопки меню (визуально)
	updateUndoRedoButtons()
}

function undoAction() {
	if (historyStep > 0) {
		historyStep--
		const previousState = actionHistory[historyStep]
		if (previousState) {
			projectData = JSON.parse(previousState)
			refreshEditorUI()
			updateUndoRedoButtons()
			showNotification('Отмена действия')
		}
	}
}

function redoAction() {
	if (historyStep < actionHistory.length - 1) {
		historyStep++
		const nextState = actionHistory[historyStep]
		if (nextState) {
			projectData = JSON.parse(nextState)
			refreshEditorUI()
			updateUndoRedoButtons()
			showNotification('Повтор действия')
		}
	}
}

function updateUndoRedoButtons() {
	// Опционально: можно менять прозрачность кнопок в меню, если действия недоступны
	const btnUndo = document.getElementById('btnUndo')
	const btnRedo = document.getElementById('btnRedo')
	if (btnUndo) btnUndo.style.opacity = historyStep > 0 ? '1' : '0.5'
	if (btnRedo)
		btnRedo.style.opacity = historyStep < actionHistory.length - 1 ? '1' : '0.5'
}

// Главная функция обновления интерфейса после Undo/Redo
function refreshEditorUI() {
	// 1. Обновляем списки слева
	if (typeof renderSidebar === 'function') renderSidebar()

	// 2. Обновляем рабочую область (блоки)
	// Проверяем, существует ли активный объект после отмены
	const scene = projectData.scenes.find(s => s.id === activeSceneId)
	if (!scene) {
		// Если сцена удалена, берем первую
		if (projectData.scenes.length > 0) switchScene(projectData.scenes[0].id)
		return
	}

	const obj = scene.objects.find(o => o.id === activeObjectId)
	if (!obj && scene.objects.length > 0) {
		// Если объект удален, берем первый
		switchObject(scene.objects[0].id)
		return
	}

	// Перерисовываем workspace
	if (typeof loadWorkspace === 'function') loadWorkspace()

	// Обновляем связи (если режим нод)
	if (editorMode === 'nodes' && typeof updateAllConnections === 'function') {
		setTimeout(updateAllConnections, 50)
	}
}

// --- 2. БУФЕР ОБМЕНА (COPY / PASTE) ---

function copySelected() {
	// 1. Если выделен блок (draggedBlock или просто активный фокус)
	// (Пока реализуем копирование активного ОБЪЕКТА целиком)

	const scene = projectData.scenes.find(s => s.id === activeSceneId)
	if (!scene) return
	const obj = scene.objects.find(o => o.id === activeObjectId)

	if (obj) {
		appClipboard = {
			type: 'object',
			data: JSON.parse(JSON.stringify(obj)),
		}
		showNotification(`Скопирован объект: ${obj.name}`)
	}
}

function cutSelected() {
	copySelected()
	deleteSelected()
}

function pasteClipboard() {
	if (!appClipboard) return

	if (appClipboard.type === 'object') {
		const scene = projectData.scenes.find(s => s.id === activeSceneId)
		if (!scene) return

		recordHistoryState() // Сохраняем историю

		const newObj = JSON.parse(JSON.stringify(appClipboard.data))

		// Генерируем уникальный ID
		newObj.id = 'obj_' + Date.now() + Math.floor(Math.random() * 1000)
		newObj.name = newObj.name + ' (Copy)'

		// Вставляем
		scene.objects.push(newObj)

		// Обновляем UI и переключаемся на него
		renderSidebar()
		switchObject(newObj.id)
		showNotification('Объект вставлен')
	}
}

function duplicateSelected() {
	// Просто копируем и сразу вставляем
	copySelected()
	pasteClipboard()
}

// --- 3. УДАЛЕНИЕ И ВЫДЕЛЕНИЕ ---

function deleteSelected() {
	const scene = projectData.scenes.find(s => s.id === activeSceneId)
	if (!scene) return

	// Пытаемся удалить активный объект
	const index = scene.objects.findIndex(o => o.id === activeObjectId)
	if (index !== -1) {
		if (!confirm(`Удалить объект "${scene.objects[index].name}"?`)) return

		recordHistoryState()

		scene.objects.splice(index, 1)

		// Переключаемся на другой объект или очищаем
		if (scene.objects.length > 0) {
			activeObjectId = scene.objects[0].id
		} else {
			activeObjectId = null
		}

		refreshEditorUI()
		showNotification('Объект удален')
	}
}

function selectAllObjects() {
	// В данном движке "Выделить всё" может означать выделение всех блоков на канвасе
	// Для этого нужно добавить визуальный класс всем блокам
	const blocks = document.querySelectorAll('.node-block')
	blocks.forEach(b => b.classList.add('selected'))
	showNotification(`Выделено блоков: ${blocks.length}`)
}

// --- 4. ПРИВЯЗКА СОБЫТИЙ МЕНЮ ---

document.addEventListener('DOMContentLoaded', () => {
	// Хелпер для закрытия меню после клика
	const runMenuAction = action => {
		document
			.querySelectorAll('.menu-item')
			.forEach(m => m.classList.remove('open'))
		action()
	}

	// Undo / Redo
	const btnUndo = document.getElementById('btnUndo')
	const btnRedo = document.getElementById('btnRedo')
	if (btnUndo) btnUndo.onclick = () => runMenuAction(undoAction)
	if (btnRedo) btnRedo.onclick = () => runMenuAction(redoAction)

	// Clipboard
	const btnCopy = document.getElementById('btnCopy')
	const btnCut = document.getElementById('btnCut')
	const btnPaste = document.getElementById('btnPaste')
	if (btnCopy) btnCopy.onclick = () => runMenuAction(copySelected)
	if (btnCut) btnCut.onclick = () => runMenuAction(cutSelected)
	if (btnPaste) btnPaste.onclick = () => runMenuAction(pasteClipboard)

	// Actions
	const btnDup = document.getElementById('btnDuplicate')
	const btnDel = document.getElementById('btnDelete')
	const btnSel = document.getElementById('btnSelectAll')
	if (btnDup) btnDup.onclick = () => runMenuAction(duplicateSelected)
	if (btnDel) btnDel.onclick = () => runMenuAction(deleteSelected)
	if (btnSel) btnSel.onclick = () => runMenuAction(selectAllObjects)

	// Инициализация истории при старте
	if (typeof projectData !== 'undefined') {
		recordHistoryState()
	}
})
