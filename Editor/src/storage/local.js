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
// --- АВТОСОХРАНЕНИЕ (ДИНАМИЧЕСКОЕ) ---
// ==========================================

let autosaveTimer = null;
let autosaveConfig = {
    enabled: true,
    intervalSec: 30 // Значение по умолчанию
};

// Загрузка настроек при старте
function initAutosaveSystem() {
    const savedConfig = localStorage.getItem('ecrous_autosave_config');
    if (savedConfig) {
        try {
            autosaveConfig = JSON.parse(savedConfig);
        } catch (e) {
            console.warn('Ошибка чтения конфига автосейва');
        }
    }
    restartAutosaveTimer();
}

// Перезапуск таймера (нужен при изменении настроек)
function restartAutosaveTimer() {
    // 1. Очищаем старый таймер
    if (autosaveTimer) {
        clearInterval(autosaveTimer);
        autosaveTimer = null;
    }

    // 2. Если включено — запускаем новый
    if (autosaveConfig.enabled && autosaveConfig.intervalSec > 0) {
        console.log(`[AutoSave] Запущен. Интервал: ${autosaveConfig.intervalSec} сек.`);
        // Переводим секунды в миллисекунды
        autosaveTimer = setInterval(saveProjectLocal, autosaveConfig.intervalSec * 1000);
    } else {
        console.log('[AutoSave] Отключен.');
    }
}

// Функция сохранения (ваша, немного доработанная)
function saveProjectLocal() {
    // Защита от сохранения пустого проекта
    if (!projectData || !projectData.scenes || projectData.scenes.length === 0) return;

    try {
        if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace();

        // Сохраняем без тяжелых ассетов (оптимизация)
        const lightProjectData = { ...projectData, assets: [] }; // Либо assets: projectData.assets если хотите всё хранить
        const saveStr = JSON.stringify(lightProjectData);
        
        const key = typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'ecrous_autosave_default';
        localStorage.setItem(key, saveStr);

        // Визуальная индикация (мигание иконки в меню, если она видна)
        // Но лучше сделать маленькое уведомление
        const saveIcon = document.querySelector('#btnSave i'); // Ищем иконку в меню
        if (saveIcon) {
             const oldColor = saveIcon.style.color;
             saveIcon.style.color = '#00E676'; // Зеленый
             setTimeout(() => saveIcon.style.color = oldColor, 800);
        }
        
        console.log(`[AutoSave] ${new Date().toLocaleTimeString()}`);
    } catch (e) {
        console.error('Ошибка автосохранения:', e);
    }
}

// --- УПРАВЛЕНИЕ МОДАЛЬНЫМ ОКНОМ ---

function openAutosaveModal() {
    // Устанавливаем текущие значения в поля
    document.getElementById('as-enable-check').checked = autosaveConfig.enabled;
    document.getElementById('as-interval-input').value = autosaveConfig.intervalSec;
    
    // Показываем окно (используем class 'active' согласно вашему CSS)
    const modal = document.getElementById('modal-autosave-settings');
    modal.classList.remove('hidden'); // На случай если есть hidden
    // Небольшая задержка для анимации opacity
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeAutosaveModal() {
    const modal = document.getElementById('modal-autosave-settings');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

function applyAutosaveSettings() {
    const isEnabled = document.getElementById('as-enable-check').checked;
    let seconds = parseInt(document.getElementById('as-interval-input').value);

    // Валидация
    if (isNaN(seconds) || seconds < 5) seconds = 5; // Минимум 5 секунд

    // Обновляем конфиг
    autosaveConfig.enabled = isEnabled;
    autosaveConfig.intervalSec = seconds;

    // Сохраняем настройки в localStorage, чтобы помнить их после перезагрузки
    localStorage.setItem('ecrous_autosave_config', JSON.stringify(autosaveConfig));

    // Перезапускаем таймер
    restartAutosaveTimer();
    
    closeAutosaveModal();
    
    if (typeof showNotification === 'function') {
        showNotification(`Автосохранение: ${isEnabled ? seconds + ' сек' : 'Выкл'}`);
    }
}

// Запускаем систему при старте
document.addEventListener('DOMContentLoaded', initAutosaveSystem);
