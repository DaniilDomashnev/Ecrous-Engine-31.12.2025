document.addEventListener('DOMContentLoaded', () => {
	const fileInput = document.getElementById('assetFileInput')
	if (fileInput) {
		fileInput.removeEventListener('change', handleAssetUpload)
		fileInput.addEventListener('change', handleAssetUpload)
	}
	// Рендер с задержкой
	setTimeout(renderAssetList, 200)
})

// === СОЗДАНИЕ ПАПКИ ===
async function createAssetFolder() {
	if (!projectData.folders) projectData.folders = []

	const name = await showCustomPrompt('Новая папка', 'Введите имя папки:')
	if (!name) return

	const folder = {
		id: 'folder_' + Date.now(),
		name: name,
		parentId: currentAssetFolderId,
	}

	projectData.folders.push(folder)

	if (typeof saveProjectToLocal === 'function') saveProjectToLocal()
	renderAssetList()
}

// === ПЕРЕИМЕНОВАНИЕ ПАПКИ ===
async function renameAssetFolder(folderId) {
	const folder = projectData.folders.find(f => f.id === folderId)
	if (!folder) return

	const newName = await showCustomPrompt(
		'Переименование',
		'Новое имя папки:',
		folder.name
	)

	if (newName && newName.trim() !== '') {
		folder.name = newName

		if (typeof saveProjectToLocal === 'function') saveProjectToLocal()
		renderAssetList()
	}
}

// === ПЕРЕИМЕНОВАНИЕ АССЕТА (НОВОЕ) ===
async function renameAsset(assetId) {
	const asset = projectData.assets.find(a => a.id === assetId)
	if (!asset) return

	const newName = await showCustomPrompt(
		'Переименование файла',
		'Новое имя:',
		asset.name
	)

	if (newName && newName.trim() !== '') {
		asset.name = newName

		if (typeof saveProjectToLocal === 'function') saveProjectToLocal()
		renderAssetList()
	}
}

// === ЗАГРУЗКА ФАЙЛОВ ===
function handleAssetUpload(e) {
	const files = e.target.files
	if (!files.length) return

	if (!projectData.assets) projectData.assets = []

	Array.from(files).forEach(file => {
		const reader = new FileReader()
		reader.onload = evt => {
			const base64 = evt.target.result

			if (!projectData.assets) projectData.assets = []

			let type = 'unknown'
			if (file.type.startsWith('image')) type = 'image'
			else if (file.type.startsWith('audio')) type = 'audio'
			else if (
				file.name.endsWith('.ttf') ||
				file.name.endsWith('.otf') ||
				file.name.endsWith('.woff')
			)
				type = 'font'

			const asset = {
				id: 'asset_' + Date.now() + Math.random().toString(36).substr(2, 4),
				name: file.name,
				type: type,
				data: base64,
				parentId: currentAssetFolderId,
			}

			projectData.assets.push(asset)

			renderAssetList()
			if (typeof saveProjectToLocal === 'function') saveProjectToLocal()
		}
		reader.readAsDataURL(file)
	})

	e.target.value = ''
}

// === НАВИГАЦИЯ ===
function openAssetFolder(folderId) {
	currentAssetFolderId = folderId
	renderAssetList()
}

function goUpAssetFolder() {
	const currentFolder = projectData.folders.find(
		f => f.id === currentAssetFolderId
	)
	if (currentFolder) {
		currentAssetFolderId = currentFolder.parentId
	} else {
		currentAssetFolderId = null
	}
	renderAssetList()
}

// === РЕНДЕРИНГ ===
function renderAssetList() {
	const container = document.getElementById('assetList')
	if (!container) return

	container.innerHTML = ''

	if (!projectData.assets) projectData.assets = []
	if (!projectData.folders) projectData.folders = []

	// 1. КНОПКА "НАЗАД"
	if (currentAssetFolderId !== null) {
		const backBtn = document.createElement('div')
		backBtn.className = 'list-item folder-back'
		backBtn.style.background = 'rgba(255,255,255,0.05)'
		backBtn.innerHTML = `<i class="ri-arrow-go-back-line"></i> <span style="font-weight:bold">...</span>`
		backBtn.onclick = goUpAssetFolder
		enableDropZone(backBtn, null, true)
		container.appendChild(backBtn)
	}

	// 2. ФИЛЬТРАЦИЯ
	const foldersToShow = projectData.folders.filter(
		f => f.parentId === currentAssetFolderId
	)
	const filesToShow = projectData.assets.filter(
		a => a.parentId == currentAssetFolderId
	)

	if (foldersToShow.length === 0 && filesToShow.length === 0) {
		const emptyMsg = document.createElement('div')
		emptyMsg.style.padding = '10px'
		emptyMsg.style.color = '#666'
		emptyMsg.style.fontSize = '11px'
		emptyMsg.style.textAlign = 'center'
		emptyMsg.innerText = 'Пусто'
		container.appendChild(emptyMsg)
	}

	// 3. РЕНДЕР ПАПОК
	foldersToShow.forEach(folder => {
		const item = document.createElement('div')
		item.className = 'list-item folder-item'
		item.draggable = true

		item.innerHTML = `
            <i class="ri-folder-3-fill" style="color: #ffffff;"></i>
            <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; font-weight:600;">${folder.name}</span>
            
            <div style="display:flex; gap:8px; align-items:center;">
                <i class="ri-edit-line action-icon edit-btn" title="Переименовать"></i>
                <i class="ri-delete-bin-line action-icon delete-btn" style="color:var(--danger)" title="Удалить"></i>
            </div>
        `

		// Вход в папку
		item.onclick = e => {
			if (!e.target.classList.contains('action-icon')) {
				openAssetFolder(folder.id)
			}
		}

		// Логика переименования папки
		item.querySelector('.edit-btn').onclick = e => {
			e.stopPropagation()
			renameAssetFolder(folder.id)
		}

		// Логика удаления папки
		item.querySelector('.delete-btn').onclick = e => {
			e.stopPropagation()
			deleteFolderRecursive(folder.id)
		}

		enableDropZone(item, folder.id, false)
		container.appendChild(item)
	})

	// 4. РЕНДЕР ФАЙЛОВ (ОБНОВЛЕНО: ДОБАВЛЕНА КНОПКА EDIT)
	filesToShow.forEach(asset => {
		const item = document.createElement('div')
		item.className = 'list-item asset-item'
		item.draggable = true
		item.style.cursor = 'grab'

		let icon = 'ri-file-line'
		if (asset.type === 'image') icon = 'ri-image-line'
		else if (asset.type === 'audio') icon = 'ri-music-line'
		else if (asset.type === 'font') icon = 'ri-font-size'

		item.innerHTML = `
            <i class="${icon}"></i>
            <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px;">${asset.name}</span>
            <div style="display:flex; gap:8px; align-items:center;">
                <i class="ri-edit-line action-icon edit-asset-btn" title="Переименовать"></i>
                <i class="ri-delete-bin-line action-icon delete-asset-btn" title="Удалить" style="color:var(--danger)"></i>
            </div>
        `

		item.ondragstart = e => {
			e.dataTransfer.setData('text/plain', asset.id)
			e.dataTransfer.setData('type', 'asset_move')
			e.dataTransfer.effectAllowed = 'all'
		}

		// Клик по элементу (копирование ID)
		item.onclick = e => {
			if (!e.target.classList.contains('action-icon')) {
				navigator.clipboard.writeText(asset.id)
				if (typeof showNotification === 'function')
					showNotification('ID скопирован')
			}
		}

		// Логика переименования файла (НОВОЕ)
		item.querySelector('.edit-asset-btn').onclick = e => {
			e.stopPropagation()
			renameAsset(asset.id)
		}

		// Логика удаления файла
		item.querySelector('.delete-asset-btn').onclick = e => {
			e.stopPropagation()
			if (confirm('Удалить файл?')) {
				projectData.assets = projectData.assets.filter(a => a.id !== asset.id)
				renderAssetList()
				if (typeof saveProjectToLocal === 'function') saveProjectToLocal()
			}
		}

		container.appendChild(item)
	})
}

// === DRAG & DROP & DELETE ===

function enableDropZone(element, targetFolderId, isBackBtn) {
	element.ondragover = e => {
		e.preventDefault()
		element.style.background = 'rgba(255, 255, 255, 0.1)'
	}

	element.ondragleave = e => {
		element.style.background = ''
	}

	element.ondrop = e => {
		e.preventDefault()
		element.style.background = ''

		const data = e.dataTransfer.getData('text/plain')
		const type = e.dataTransfer.getData('type')

		if (type === 'asset_move') {
			const asset = projectData.assets.find(a => a.id === data)
			if (asset) {
				if (isBackBtn) {
					const currentFolder = projectData.folders.find(
						f => f.id === currentAssetFolderId
					)
					asset.parentId = currentFolder ? currentFolder.parentId : null
				} else {
					asset.parentId = targetFolderId
				}

				renderAssetList()
				if (typeof saveProjectToLocal === 'function') saveProjectToLocal()
			}
		}
	}
}

async function deleteFolderRecursive(folderId) {
	if (!confirm('Удалить папку и ВСЕ файлы внутри неё?')) return

	const foldersToDelete = [folderId]

	const findChildren = parentId => {
		const children = projectData.folders.filter(f => f.parentId === parentId)
		children.forEach(child => {
			foldersToDelete.push(child.id)
			findChildren(child.id)
		})
	}
	findChildren(folderId)

	projectData.assets = projectData.assets.filter(
		a => !foldersToDelete.includes(a.parentId)
	)
	projectData.folders = projectData.folders.filter(
		f => !foldersToDelete.includes(f.id)
	)

	if (foldersToDelete.includes(currentAssetFolderId)) {
		currentAssetFolderId = null
	}

	renderAssetList()
	if (typeof saveProjectToLocal === 'function') saveProjectToLocal()
}
