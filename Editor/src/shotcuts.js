// ==========================================
// --- ГОРЯЧИЕ КЛАВИШИ (Shortcuts) ---
// ==========================================

window.addEventListener('keydown', e => {
	// Игнорируем шорткаты, если фокус в поле ввода (кроме некоторых, типа Ctrl+S)
	const inInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName)

	// --- ФАЙЛОВЫЕ ОПЕРАЦИИ ---

	// Ctrl + S (Сохранить)
	if (e.ctrlKey && e.code === 'KeyS') {
		e.preventDefault()
		if (typeof saveProjectToLocal === 'function') {
			saveProjectToLocal()
		}
	}

	// Shift + E (Экспорт)
	if (e.shiftKey && e.code === 'KeyE' && !inInput) {
		e.preventDefault()
		if (typeof openExportModal === 'function') openExportModal()
	}

	// Ctrl + Shift + P (Настройки)
	if (e.ctrlKey && e.shiftKey && e.code === 'KeyP' && !inInput) {
		e.preventDefault()
		if (typeof openProjectSettings === 'function') openProjectSettings()
	}

	// --- ПРАВКА (EDIT) ---
	// Работает, только если подключен editor.js

	// Ctrl + Z (Отменить)
	if (e.ctrlKey && e.code === 'KeyZ' && !e.shiftKey) {
		e.preventDefault()
		if (typeof undoAction === 'function') undoAction()
	}

	// Ctrl + Y или Ctrl + Shift + Z (Повторить)
	if (
		(e.ctrlKey && e.code === 'KeyY') ||
		(e.ctrlKey && e.shiftKey && e.code === 'KeyZ')
	) {
		e.preventDefault()
		if (typeof redoAction === 'function') redoAction()
	}

	// Ctrl + C (Копировать)
	if (e.ctrlKey && e.code === 'KeyC' && !inInput) {
		e.preventDefault()
		if (typeof copySelected === 'function') copySelected()
	}

	// Ctrl + X (Вырезать)
	if (e.ctrlKey && e.code === 'KeyX' && !inInput) {
		e.preventDefault()
		if (typeof cutSelected === 'function') cutSelected()
	}

	// Ctrl + V (Вставить)
	if (e.ctrlKey && e.code === 'KeyV' && !inInput) {
		e.preventDefault()
		if (typeof pasteClipboard === 'function') pasteClipboard()
	}

	// Ctrl + D (Дублировать)
	if (e.ctrlKey && e.code === 'KeyD' && !inInput) {
		e.preventDefault()
		if (typeof duplicateSelected === 'function') duplicateSelected()
	}

	// Delete (Удалить)
	if (e.code === 'Delete' && !inInput) {
		e.preventDefault()
		if (typeof deleteSelected === 'function') deleteSelected()
	}

	// Ctrl + A (Выделить всё)
	if (e.ctrlKey && e.code === 'KeyA' && !inInput) {
		e.preventDefault()
		if (typeof selectAllObjects === 'function') selectAllObjects()
	}

	// F5 (Запуск игры)
	if (e.code === 'F5') {
		e.preventDefault()
		if (typeof runProject === 'function') runProject()
	}

	// Esc (Остановка игры / Закрытие окон)
	if (e.code === 'Escape') {
		// Если запущена игра
		if (typeof isRunning !== 'undefined' && isRunning) {
			stopGame()
			return
		}
		// Закрытие модалок
		const modals = document.querySelectorAll('.modal-overlay:not(.hidden)')
		modals.forEach(m => m.classList.add('hidden'))
	}
})
