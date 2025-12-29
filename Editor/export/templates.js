// ==========================================
// --- МЕНЕДЖЕР ШАБЛОНОВ (templates.js) ---
// ==========================================

// --- 1. Открытие модалки СОЗДАНИЯ ---
function createTemplateFromCurrent() {
	const blocks = document.querySelectorAll('.node-block')
	if (blocks.length === 0) {
		if (typeof showNotification === 'function')
			showNotification('Сцена пуста!', 'error')
		else alert('Сцена пуста!')
		return
	}

	const modal = document.getElementById('modal-tpl-create')
	const input = document.getElementById('tpl-create-input')
	const error = document.getElementById('tpl-create-error')

	input.value = ''
	error.classList.add('hidden')
	modal.classList.remove('hidden')
	setTimeout(() => modal.classList.add('active'), 10)
	input.focus()

	const btnSave = document.getElementById('btn-confirm-create-tpl')
	btnSave.onclick = () => saveTemplateProcess(input.value)

	input.onkeydown = e => {
		if (e.key === 'Enter') saveTemplateProcess(input.value)
	}
}

// --- ПРОЦЕСС СОХРАНЕНИЯ (Связи + Блоки) ---
function saveTemplateProcess(name) {
	const error = document.getElementById('tpl-create-error')

	if (!name.trim()) {
		error.textContent = 'Введите название шаблона!'
		error.classList.remove('hidden')
		return
	}

	// Собираем блоки
	const blocksEl = document.querySelectorAll('.node-block')
	let minX = Infinity,
		minY = Infinity

	// 1. Ищем ID всех сохраняемых блоков
	const savedIds = []
	blocksEl.forEach(el => {
		savedIds.push(el.id)
		const x = parseFloat(el.style.left)
		const y = parseFloat(el.style.top)
		if (x < minX) minX = x
		if (y < minY) minY = y
	})

	// 2. Формируем данные блоков
	const blocksData = []
	blocksEl.forEach(el => {
		const inputs = Array.from(el.querySelectorAll('input')).map(i => i.value)
		blocksData.push({
			id: el.id, // Сохраняем исходный ID для маппинга связей
			type: el.dataset.type,
			relX: parseFloat(el.style.left) - minX,
			relY: parseFloat(el.style.top) - minY,
			values: inputs,
		})
	})

	// 3. Сохраняем ТОЛЬКО те связи, где оба блока есть в шаблоне
	const wiresData = []
	if (typeof connections !== 'undefined') {
		connections.forEach(conn => {
			if (savedIds.includes(conn.from) && savedIds.includes(conn.to)) {
				wiresData.push({ from: conn.from, to: conn.to })
			}
		})
	}

	// 4. Записываем объект (Новая структура: { blocks: [], wires: [] })
	customTemplates[name] = {
		blocks: blocksData,
		wires: wiresData,
	}

	localStorage.setItem(
		'ecrous_custom_templates',
		JSON.stringify(customTemplates)
	)

	initToolbox()
	closeTemplateModal('modal-tpl-create')
}

// --- 2. СОЗДАНИЕ ИЗ ШАБЛОНА (Восстановление связей) ---
function instantiateTemplate(name, clientX, clientY) {
	const tpl = customTemplates[name]
	if (!tpl) return

	// Поддержка старого формата (если это просто массив) и нового (объект)
	let blocks = []
	let wires = []

	if (Array.isArray(tpl)) {
		blocks = tpl // Старый формат без связей
	} else {
		blocks = tpl.blocks || []
		wires = tpl.wires || []
	}

	const rect = canvas.getBoundingClientRect()
	const baseX = (clientX - rect.left - panX) / zoomLevel
	const baseY = (clientY - rect.top - panY) / zoomLevel

	// Маппинг: Старый ID (из шаблона) -> Новый ID (на сцене)
	const idMap = {}

	// 1. Создаем блоки и запоминаем новые ID
	blocks.forEach(blockData => {
		// Генерируем уникальный ID для новой копии
		const newId = 'blk_' + Date.now() + Math.random().toString(36).substr(2, 5)

		// Записываем в карту соответствий
		if (blockData.id) {
			idMap[blockData.id] = newId
		}

		const restoreItem = {
			id: newId,
			values: blockData.values,
			x: baseX + (blockData.relX || 0),
			y: baseY + (blockData.relY || 0),
		}
		createBlock(blockData.type, 0, 0, restoreItem)
	})

	// 2. Восстанавливаем связи, используя новые ID
	if (wires.length > 0 && typeof connections !== 'undefined') {
		wires.forEach(w => {
			const newFrom = idMap[w.from]
			const newTo = idMap[w.to]

			// Если оба блока успешно созданы
			if (newFrom && newTo) {
				connections.push({ from: newFrom, to: newTo })
			}
		})
		// Обновляем визуализацию
		if (typeof updateAllConnections === 'function') updateAllConnections()
	}
}

// --- ОСТАЛЬНЫЕ ФУНКЦИИ (Импорт/Экспорт/Удаление) ---

function importTemplates() {
	const modal = document.getElementById('modal-tpl-import')
	modal.classList.remove('hidden')
	setTimeout(() => modal.classList.add('active'), 10)
	initDropZone()
}

function initDropZone() {
	const dropZone = document.getElementById('tpl-drop-zone')
	const fileInput = document.getElementById('templateFileInput')
	dropZone.onclick = () => fileInput.click()
	fileInput.onchange = () => handleFile(fileInput.files[0])
	dropZone.ondragover = e => {
		e.preventDefault()
		dropZone.classList.add('drag-over')
	}
	dropZone.ondragleave = () => dropZone.classList.remove('drag-over')
	dropZone.ondrop = e => {
		e.preventDefault()
		dropZone.classList.remove('drag-over')
		if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0])
	}
}

function handleFile(file) {
	if (!file || !file.name.endsWith('.json')) {
		alert('Выберите .json файл')
		return
	}
	const reader = new FileReader()
	reader.onload = function (e) {
		try {
			const imported = JSON.parse(e.target.result)
			// Объединяем шаблоны
			customTemplates = { ...customTemplates, ...imported }
			localStorage.setItem(
				'ecrous_custom_templates',
				JSON.stringify(customTemplates)
			)
			initToolbox()
			closeTemplateModal('modal-tpl-import')
			showImportSuccessModal(Object.keys(imported))
		} catch (err) {
			alert('Ошибка файла шаблонов')
		}
	}
	reader.readAsText(file)
}

// Удаление
let templateToDeleteName = null
function deleteTemplate(name) {
	templateToDeleteName = name
	const modal = document.getElementById('modal-confirm-delete')
	document.getElementById(
		'confirm-delete-msg'
	).innerHTML = `Удалить шаблон <b>"${name}"</b>?`
	modal.classList.remove('hidden')
	setTimeout(() => modal.classList.add('active'), 10)
	document.getElementById('btn-perform-delete').onclick = performDeletion
}

function performDeletion() {
	if (!templateToDeleteName) return
	delete customTemplates[templateToDeleteName]
	localStorage.setItem(
		'ecrous_custom_templates',
		JSON.stringify(customTemplates)
	)
	initToolbox()
	closeConfirmDeleteModal()
}

function closeConfirmDeleteModal() {
	const modal = document.getElementById('modal-confirm-delete')
	modal.classList.remove('active')
	setTimeout(() => {
		modal.classList.add('hidden')
		templateToDeleteName = null
	}, 200)
}

function closeTemplateModal(id) {
	const modal = document.getElementById(id)
	modal.classList.remove('active')
	setTimeout(() => modal.classList.add('hidden'), 200)
}

function showImportSuccessModal(names) {
	const modal = document.getElementById('modal-tpl-import-success')
	document.getElementById('import-count-val').innerText = names.length
	const list = document.getElementById('imported-tpl-names')
	list.innerHTML = ''
	names.forEach(
		n => (list.innerHTML += `<div class="imported-item">${n}</div>`)
	)
	modal.classList.remove('hidden')
	setTimeout(() => modal.classList.add('active'), 10)
}

function closeImportSuccessModal() {
	closeTemplateModal('modal-tpl-import-success')
}

// Экспорт
function exportTemplates() {
	const modal = document.getElementById('modal-tpl-export-select')
	const list = document.getElementById('tpl-export-list')
	list.innerHTML = ''

	if (!customTemplates || Object.keys(customTemplates).length === 0) {
		alert('Нет шаблонов для экспорта')
		return
	}

	Object.keys(customTemplates).forEach(name => {
		const div = document.createElement('div')
		div.className = 'tpl-list-item'
		div.innerHTML = `<input type="checkbox" class="tpl-checkbox" value="${name}" checked> <label>${name}</label>`
		list.appendChild(div)
	})

	modal.classList.remove('hidden')
	setTimeout(() => modal.classList.add('active'), 10)
}

function confirmExportSelected() {
	const checkboxes = document.querySelectorAll(
		'#tpl-export-list .tpl-checkbox:checked'
	)
	if (checkboxes.length === 0) return

	const exportData = {}
	checkboxes.forEach(cb => {
		if (customTemplates[cb.value])
			exportData[cb.value] = customTemplates[cb.value]
	})

	const blob = new Blob([JSON.stringify(exportData, null, 2)], {
		type: 'application/json',
	})
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = 'Ecrous_Templates.json'
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)

	closeExportSelectModal()
}

function closeExportSelectModal() {
	closeTemplateModal('modal-tpl-export-select')
}
function toggleAllTemplates() {
	const cbs = document.querySelectorAll('.tpl-checkbox')
	const all = Array.from(cbs).every(c => c.checked)
	cbs.forEach(c => (c.checked = !all))
}
