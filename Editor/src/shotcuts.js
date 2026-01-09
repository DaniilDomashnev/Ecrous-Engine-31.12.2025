// ==========================================
// --- МЕНЕДЖЕР ГОРЯЧИХ КЛАВИШ ---
// ==========================================

// 1. Конфигурация по умолчанию
const DEFAULT_HOTKEYS = {
	save: {
		code: 'KeyS',
		ctrl: true,
		shift: false,
		alt: false,
		name: 'Сохранить проект',
	},
	export: {
		code: 'KeyE',
		ctrl: false,
		shift: true,
		alt: false,
		name: 'Экспорт',
	},
	settings: {
		code: 'KeyP',
		ctrl: true,
		shift: true,
		alt: false,
		name: 'Настройки проекта',
	},
	undo: {
		code: 'KeyZ',
		ctrl: true,
		shift: false,
		alt: false,
		name: 'Отменить',
	},
	redo: {
		code: 'KeyY',
		ctrl: true,
		shift: false,
		alt: false,
		name: 'Повторить',
	},
	copy: {
		code: 'KeyC',
		ctrl: true,
		shift: false,
		alt: false,
		name: 'Копировать',
	},
	cut: { code: 'KeyX', ctrl: true, shift: false, alt: false, name: 'Вырезать' },
	paste: {
		code: 'KeyV',
		ctrl: true,
		shift: false,
		alt: false,
		name: 'Вставить',
	},
	duplicate: {
		code: 'KeyD',
		ctrl: true,
		shift: false,
		alt: false,
		name: 'Дублировать',
	},
	delete: {
		code: 'Delete',
		ctrl: false,
		shift: false,
		alt: false,
		name: 'Удалить',
	},
	selectAll: {
		code: 'KeyA',
		ctrl: true,
		shift: false,
		alt: false,
		name: 'Выделить всё',
	},
	run: {
		code: 'F5',
		ctrl: false,
		shift: false,
		alt: false,
		name: 'Запуск игры',
	},
	stop: {
		code: 'Escape',
		ctrl: false,
		shift: false,
		alt: false,
		name: 'Стоп / Закрыть',
	},
}

// Текущие настройки (загружаются из LocalStorage)
let activeHotkeys = JSON.parse(JSON.stringify(DEFAULT_HOTKEYS))

// Загрузка при старте
function loadHotkeys() {
	const saved = localStorage.getItem('ecrous_hotkeys')
	if (saved) {
		try {
			// Объединяем с дефолтными, чтобы если добавились новые функции, они не пропали
			const parsed = JSON.parse(saved)
			activeHotkeys = { ...DEFAULT_HOTKEYS, ...parsed }
		} catch (e) {
			console.error('Ошибка загрузки хоткеев', e)
		}
	}
}
loadHotkeys()

// ==========================================
// --- ОБРАБОТЧИК НАЖАТИЙ (MAIN LISTENER) ---
// ==========================================

window.addEventListener('keydown', e => {
	// Игнорируем ввод текста (кроме спец. команд типа Ctrl+S)
	// Разрешаем выполнение команд, если зажат Ctrl, даже внутри input
	const inInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName)

	// Функция проверки совпадения
	const isAction = actionId => {
		const cfg = activeHotkeys[actionId]
		if (!cfg) return false

		// Спец-условие: если мы в Input, то разрешаем только комбинации с Ctrl или F-клавиши
		if (inInput) {
			if (!e.ctrlKey && !e.altKey && !e.code.startsWith('F')) return false
		}

		return (
			e.code === cfg.code &&
			e.ctrlKey === !!cfg.ctrl &&
			e.shiftKey === !!cfg.shift &&
			e.altKey === !!cfg.alt
		)
	}

	// --- ПРОВЕРКИ ---

	if (isAction('save')) {
		e.preventDefault()
		if (typeof saveProjectToLocal === 'function') saveProjectToLocal()
	} else if (isAction('export')) {
		e.preventDefault()
		if (typeof openExportModal === 'function') openExportModal()
	} else if (isAction('settings')) {
		e.preventDefault()
		if (typeof openProjectSettings === 'function') openProjectSettings()
	} else if (isAction('undo')) {
		e.preventDefault()
		if (typeof undoAction === 'function') undoAction()
	} else if (isAction('redo')) {
		e.preventDefault()
		if (typeof redoAction === 'function') redoAction()
	} else if (isAction('copy')) {
		e.preventDefault()
		if (typeof copySelected === 'function') copySelected()
	} else if (isAction('cut')) {
		e.preventDefault()
		if (typeof cutSelected === 'function') cutSelected()
	} else if (isAction('paste')) {
		e.preventDefault() // Тут осторожно, в input это может сломать нативную вставку
		if (!inInput && typeof pasteClipboard === 'function') pasteClipboard()
	} else if (isAction('duplicate')) {
		e.preventDefault()
		if (typeof duplicateSelected === 'function') duplicateSelected()
	} else if (isAction('delete')) {
		// Delete в input удаляет текст, не блокируем
		if (!inInput) {
			e.preventDefault()
			if (typeof deleteSelected === 'function') deleteSelected()
		}
	} else if (isAction('selectAll')) {
		if (!inInput) {
			e.preventDefault()
			if (typeof selectAllObjects === 'function') selectAllObjects()
		}
	} else if (isAction('run')) {
		e.preventDefault()
		if (typeof runProject === 'function') runProject()
	} else if (isAction('stop')) {
		// Escape не блокируем полностью (нужен браузеру иногда)
		if (typeof isRunning !== 'undefined' && isRunning) {
			e.preventDefault()
			stopGame()
		} else {
			// Закрытие модалок
			const modals = document.querySelectorAll('.modal-overlay:not(.hidden)')
			if (modals.length > 0) {
				modals.forEach(m => m.classList.add('hidden'))
				// Снимаем фокус с инпутов
				if (document.activeElement) document.activeElement.blur()
			}
		}
	}
})

// ==========================================
// --- ЛОГИКА МОДАЛЬНОГО ОКНА ---
// ==========================================

let tempHotkeys = {} // Временное хранилище при редактировании
let currentRecordingId = null // Какой ID сейчас записываем

function openHotkeysModal() {
	// 1. Копируем текущие настройки во временные
	tempHotkeys = JSON.parse(JSON.stringify(activeHotkeys))
	renderHotkeysList()

	const modal = document.getElementById('modal-hotkeys-settings')

	// 2. Сначала убираем display: none
	modal.classList.remove('hidden')

	// 3. Через мгновение добавляем класс для анимации (opacity: 1)
	// setTimeout нужен, чтобы браузер успел отрисовать блок перед анимацией
	setTimeout(() => {
		modal.classList.add('active')
	}, 10)

	// Сброс скролла внутри окна
	const msgBlock = modal.querySelector('.modal-message')
	if (msgBlock) msgBlock.scrollTop = 0
}

function closeHotkeysModal() {
	currentRecordingId = null
	const modal = document.getElementById('modal-hotkeys-settings')

	// 1. Убираем анимацию (opacity: 0)
	modal.classList.remove('active')

	// 2. Ждем пока пройдет CSS transition (0.2s в вашем файле), потом скрываем блок
	setTimeout(() => {
		modal.classList.add('hidden')
	}, 200) // 200мс совпадает с transition в modals.css
}

function renderHotkeysList() {
	const container = document.getElementById('hotkeys-list-container')
	container.innerHTML = ''

	Object.keys(tempHotkeys).forEach(key => {
		const item = tempHotkeys[key]

		const row = document.createElement('div')
		row.className = 'hk-row'

		const label = document.createElement('div')
		label.className = 'hk-label'
		label.innerText = item.name

		const btn = document.createElement('button')
		btn.className = 'hk-btn'
		btn.innerText = formatKeyString(item)
		btn.onclick = () => startRecordingKey(key, btn)

		row.appendChild(label)
		row.appendChild(btn)
		container.appendChild(row)
	})
}

// Превращает объект клавиши в строку "Ctrl + S"
function formatKeyString(cfg) {
	let parts = []
	if (cfg.ctrl) parts.push('Ctrl')
	if (cfg.shift) parts.push('Shift')
	if (cfg.alt) parts.push('Alt')

	// Очистка кода клавиши (KeyS -> S, Digit5 -> 5)
	let cleanCode = cfg.code
		.replace('Key', '')
		.replace('Digit', '')
		.replace('ControlLeft', 'Ctrl')
		.replace('ShiftLeft', 'Shift')
		.replace('AltLeft', 'Alt')

	if (!['Ctrl', 'Shift', 'Alt'].includes(cleanCode)) {
		parts.push(cleanCode)
	}

	return parts.join(' + ')
}

// Начинаем слушать нажатие для конкретного действия
function startRecordingKey(actionId, btnElement) {
	// Если уже что-то пишем - отменяем предыдущее
	if (currentRecordingId) {
		renderHotkeysList() // Перерисовка сбросит активные кнопки
	}

	currentRecordingId = actionId
	btnElement.innerText = 'Нажмите клавиши...'
	btnElement.classList.add('recording')

	// Добавляем одноразовый слушатель на весь документ
	document.addEventListener('keydown', handleKeyRecording, {
		capture: true,
		once: true,
	})
}

function handleKeyRecording(e) {
	e.preventDefault()
	e.stopPropagation()

	// Игнорируем одиночные нажатия Ctrl/Shift/Alt (ждем основную клавишу)
	if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
		// Перезапускаем слушатель, так как это была только модификация
		document.addEventListener('keydown', handleKeyRecording, {
			capture: true,
			once: true,
		})
		return
	}

	if (currentRecordingId && tempHotkeys[currentRecordingId]) {
		// Сохраняем новую комбинацию
		tempHotkeys[currentRecordingId].code = e.code
		tempHotkeys[currentRecordingId].ctrl = e.ctrlKey
		tempHotkeys[currentRecordingId].shift = e.shiftKey
		tempHotkeys[currentRecordingId].alt = e.altKey
	}

	currentRecordingId = null
	renderHotkeysList() // Обновляем UI
}

function saveHotkeysSettings() {
	activeHotkeys = JSON.parse(JSON.stringify(tempHotkeys))
	localStorage.setItem('ecrous_hotkeys', JSON.stringify(activeHotkeys))
	closeHotkeysModal()
	if (typeof showNotification === 'function')
		showNotification('Настройки клавиш сохранены')
}

function resetDefaultHotkeys() {
	if (confirm('Сбросить все клавиши по умолчанию?')) {
		tempHotkeys = JSON.parse(JSON.stringify(DEFAULT_HOTKEYS))
		renderHotkeysList()
	}
}
