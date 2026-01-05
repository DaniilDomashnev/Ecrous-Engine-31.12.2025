// ==========================================
// --- STORAGE SYSTEM (LocalStorage + IndexedDB) ---
// ==========================================

const DB_NAME = 'EcrousAssetsDB'
const DB_VERSION = 1
const STORE_NAME = 'assets'

// --- Хелперы для IndexedDB ---
function openAssetsDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION)
		request.onupgradeneeded = e => {
			const db = e.target.result
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME)
			}
		}
		request.onsuccess = e => resolve(e.target.result)
		request.onerror = e => reject(e.target.error)
	})
}

async function saveAssetsToDB(projectName, assets) {
	const db = await openAssetsDB()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite')
		const store = tx.objectStore(STORE_NAME)
		const request = store.put(assets, projectName) // Ключ - имя проекта

		request.onsuccess = () => resolve()
		request.onerror = e => reject(e.target.error)
	})
}

async function loadAssetsFromDB(projectName) {
	const db = await openAssetsDB()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly')
		const store = tx.objectStore(STORE_NAME)
		const request = store.get(projectName)

		request.onsuccess = () => resolve(request.result || [])
		request.onerror = e => reject(e.target.error)
	})
}

// ==========================================
// --- ОСНОВНЫЕ ФУНКЦИИ СОХРАНЕНИЯ ---
// ==========================================

async function saveProjectToLocal() {
	// 0. Защита от сохранения пустого проекта
	if (!projectData || !projectData.scenes || projectData.scenes.length === 0) {
		console.warn('Попытка сохранить пустой проект! Отменено.')
		return
	}

	// 1. Сначала обновляем данные из редактора
	if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace()

	// 2. Подготовка данных
	const assetsBackup = projectData.assets || []

	// Создаем легкую копию проекта БЕЗ ассетов для localStorage
	const lightProjectData = { ...projectData, assets: [] }

	try {
		// 3. Сохраняем ассеты в IndexedDB
		await saveAssetsToDB(currentProjectName, assetsBackup)

		// 4. Сохраняем структуру проекта в LocalStorage
		// Используем STORAGE_KEY, который уникален для имени проекта
		localStorage.setItem(STORAGE_KEY, JSON.stringify(lightProjectData))

		// 5. Восстанавливаем ассеты в памяти
		projectData.assets = assetsBackup

		if (typeof showNotification === 'function') {
			const sizeMB = (
				new Blob([JSON.stringify(assetsBackup)]).size /
				1024 /
				1024
			).toFixed(2)
			showNotification(
				`Проект сохранен! (Ассеты: ${sizeMB} MB)`,
				'ri-save-3-line'
			)
		} else {
			console.log('Проект сохранен')
		}
	} catch (e) {
		console.error('Ошибка сохранения:', e)
		projectData.assets = assetsBackup
		alert(
			'Ошибка сохранения! Возможно, закончилось место на диске.\n' + e.message
		)
	}
}

async function loadProjectFromLocal() {
	try {
		// 1. Загружаем структуру из LocalStorage
		const json = localStorage.getItem(STORAGE_KEY)

		if (json) {
			const loadedData = JSON.parse(json)

			// Дополнительная проверка целостности загруженных данных
			if (!loadedData || !loadedData.scenes) {
				console.error('Загруженные данные повреждены.')
				// Не сбрасываем projectData в null, чтобы не запустить создание нового поверх старого
				return
			}

			projectData = loadedData

			// 2. Асинхронно подгружаем тяжелые ассеты из базы данных
			const assets = await loadAssetsFromDB(currentProjectName)
			projectData.assets = assets || []

			// Восстанавливаем состояние редактора
			if (projectData.scenes && projectData.scenes.length > 0) {
				activeSceneId = projectData.scenes[0].id
				const firstObj = projectData.scenes[0].objects[0]
				activeObjectId = firstObj ? firstObj.id : null
			}

			if (typeof renderSidebar === 'function') renderSidebar()
			if (typeof loadWorkspace === 'function') loadWorkspace()

			// Обновляем список ассетов в UI, если он уже отрисован
			if (typeof renderAssetList === 'function') renderAssetList()

			console.log(`Проект загружен. Ассетов: ${projectData.assets.length}`)
		} else {
			// Проекта нет в памяти - это НОВЫЙ проект.
			// projectData остается дефолтным (из main.js)
			console.log('Проект не найден в памяти, создан новый.')
		}
	} catch (e) {
		console.error('Ошибка загрузки:', e)
		alert('Не удалось загрузить проект.')
		// Не обнуляем projectData, чтобы не потерять текущую сессию
	}
}

function saveCurrentWorkspace() {
	if (typeof getActiveObject !== 'function') return

	const currentObj = getActiveObject()
	if (!currentObj) return

	const data = []
	document.querySelectorAll('.node-block').forEach(el => {
		const inputs = Array.from(el.querySelectorAll('input, textarea')).map(
			i => i.value
		)
		data.push({
			id: el.id,
			type: el.dataset.type,
			x: parseFloat(el.style.left),
			y: parseFloat(el.style.top),
			disabled: el.classList.contains('disabled'),
			collapsed: el.classList.contains('collapsed'),
			values: inputs,
		})
	})

	currentObj.scripts = data
	if (typeof connections !== 'undefined') {
		currentObj.connections = [...connections]
	}
}

function loadWorkspace() {
	if (typeof container === 'undefined' || !container) return

	container.innerHTML = ''
	const svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	svgLayer.setAttribute('id', 'connections-layer')
	svgLayer.style.overflow = 'visible'
	container.appendChild(svgLayer)

	const currentObj = getActiveObject()
	if (!currentObj) return

	if (currentObj.scripts && typeof createBlock === 'function') {
		currentObj.scripts.forEach(b => createBlock(b.type, 0, 0, b))
	}

	connections = currentObj.connections || []

	if (typeof setEditorMode === 'function') setEditorMode(editorMode)
	if (editorMode === 'nodes' && typeof updateAllConnections === 'function') {
		setTimeout(updateAllConnections, 50)
	}
}

// ==========================================
// --- АВТОСОХРАНЕНИЕ ---
// ==========================================
const AUTOSAVE_INTERVAL = 30000 // 30 секунд

function saveProjectLocal() {
	// [ВАЖНО] Защита от перезаписи хорошего сохранения пустым состоянием
	if (!projectData || !projectData.scenes || projectData.scenes.length === 0) {
		return
	}

	try {
		// Сначала обновляем модель данными из UI
		if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace()

		// Готовим данные без ассетов (ассеты тяжелые, их в автосейв каждые 30сек писать не будем в localStorage, только при ручном)
		// Или пишем, но только структуру.
		const lightProjectData = { ...projectData, assets: [] }
		const saveStr = JSON.stringify(lightProjectData)

		const key =
			typeof STORAGE_KEY !== 'undefined'
				? STORAGE_KEY
				: 'ecrous_autosave_default'

		localStorage.setItem(key, saveStr)

		const saveIcon = document.getElementById('btnSave')
		if (saveIcon) {
			saveIcon.style.color = '#00E676'
			setTimeout(() => (saveIcon.style.color = ''), 500)
		}
		console.log('[AutoSave] Проект сохранен:', new Date().toLocaleTimeString())
	} catch (e) {
		console.error('Ошибка автосохранения:', e)
	}
}

// Запускаем таймер
setInterval(saveProjectLocal, AUTOSAVE_INTERVAL)
