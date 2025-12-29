// ==========================================
// --- ЛОГИКА ГРУППИРОВКИ ---
// ==========================================
function toggleGroupState(groupBlock, btn) {
	const isCollapsed = groupBlock.classList.contains('collapsed')

	// Меняем состояние
	if (isCollapsed) {
		groupBlock.classList.remove('collapsed')
		btn.innerHTML = '<i class="ri-arrow-down-s-line"></i>'
	} else {
		groupBlock.classList.add('collapsed')
		btn.innerHTML = '<i class="ri-arrow-right-s-line"></i>'
	}

	// Рекурсивно скрываем/показываем цепочку
	const nextBlock = findNextBlock(groupBlock.id)
	setChainVisibility(nextBlock, !isCollapsed) // !isCollapsed = показать

	if (typeof updateAllConnections === 'function') updateAllConnections()
}

function setChainVisibility(blockId, visible) {
	if (!blockId) return
	const el = document.getElementById(blockId)
	if (!el) return

	// Скрываем/показываем блок
	el.style.display = visible ? 'block' : 'none'

	// Если этот блок сам является группой и он СВЕРНУТ, то мы его показываем,
	// но его детей НЕ показываем (они должны остаться скрытыми внутри него)
	if (
		el.dataset.type === 'sys_group' &&
		el.classList.contains('collapsed') &&
		visible
	) {
		return // Прерываем цепочку, не открываем внутренности закрытой группы
	}

	// Идем к следующему
	const next = findNextBlock(blockId)
	if (next) setChainVisibility(next, visible)
}

function findNextBlock(currentId) {
	// Ищем связь, где 'from' == currentId
	const conn = connections.find(c => c.from === currentId)
	return conn ? conn.to : null
}

// ==========================================
// --- КОНТЕКСТНОЕ МЕНЮ (ПКМ) ---
// ==========================================
let ctxMenuTargetBlockId = null

function initContextMenu() {
	const menu = document.getElementById('context-menu')

	// Обработка ПКМ на сцене
	document.addEventListener('contextmenu', e => {
		const block = e.target.closest('.node-block')
		if (block) {
			e.preventDefault()
			ctxMenuTargetBlockId = block.id

			// Позиция
			menu.style.left = e.clientX + 'px'
			menu.style.top = e.clientY + 'px'
			menu.classList.remove('hidden')
		} else {
			menu.classList.add('hidden')
		}
	})

	// Клик вне меню - закрыть
	document.addEventListener('click', () => menu.classList.add('hidden'))

	// --- ДЕЙСТВИЯ ---

	// 1. УДАЛИТЬ
	document.getElementById('ctx-delete').onclick = () => {
		if (ctxMenuTargetBlockId) {
			deleteBlockRecursive(ctxMenuTargetBlockId)
			if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace()
		}
	}

	// 2. ОТКЛЮЧИТЬ СВЯЗИ
	document.getElementById('ctx-disconnect').onclick = () => {
		if (ctxMenuTargetBlockId) {
			connections = connections.filter(
				c => c.from !== ctxMenuTargetBlockId && c.to !== ctxMenuTargetBlockId
			)
			if (typeof updateAllConnections === 'function') updateAllConnections()
			if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace()
		}
	}

	// 3. ДУБЛИРОВАТЬ
	document.getElementById('ctx-duplicate').onclick = () => {
		if (ctxMenuTargetBlockId) {
			duplicateBlock(ctxMenuTargetBlockId)
		}
	}

	// 4. ВКЛЮЧИТЬ / ОТКЛЮЧИТЬ
	const btnDisable = document.getElementById('ctx-disable')
	if (btnDisable) {
		btnDisable.onclick = () => {
			if (ctxMenuTargetBlockId) {
				const el = document.getElementById(ctxMenuTargetBlockId)
				if (el) {
					el.classList.toggle('disabled')
					// Сохраняем проект
					if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace()
				}
				const menu = document.getElementById('context-menu')
				menu.classList.add('hidden')
			}
		}
	}
}

// Дублирование блока
function duplicateBlock(originalId) {
	const original = document.getElementById(originalId)
	if (!original) return

	const type = original.dataset.type
	// Копируем значения инпутов
	const inputs = Array.from(original.querySelectorAll('input, select')).map(
		i => i.value
	)

	// Создаем чуть правее и ниже
	const rect = original.getBoundingClientRect()
	const x = parseFloat(original.style.left) + 20
	const y = parseFloat(original.style.top) + 20

	// Генерируем новый ID
	const newId = 'blk_' + Date.now() + Math.random().toString(36).substr(2, 4)

	const restoreData = {
		id: newId,
		x: x,
		y: y,
		values: inputs,
	}

	// Вызываем стандартную функцию создания, но с данными
	createBlock(type, 0, 0, restoreData) // Координаты игнорируются, если передан restoreData с x/y

	if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace()
}

function deleteBlockRecursive(id) {
	const el = document.getElementById(id)
	if (el) el.remove()
	// Удаляем связи
	connections = connections.filter(c => c.from !== id && c.to !== id)
	if (typeof updateAllConnections === 'function') updateAllConnections()
}

// !!! ВАЖНО: Вызови initContextMenu() при загрузке страницы (например в inicialization.js) !!!
