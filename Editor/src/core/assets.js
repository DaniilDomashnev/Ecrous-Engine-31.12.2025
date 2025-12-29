// src/core/assets.js

document.addEventListener('DOMContentLoaded', () => {
	const fileInput = document.getElementById('assetFileInput')
	if (fileInput) {
		// Снимаем старый слушатель, чтобы не дублировать
		fileInput.removeEventListener('change', handleAssetUpload)
		fileInput.addEventListener('change', handleAssetUpload)
	}
	// Рендерим с небольшой задержкой, чтобы проект успел загрузиться из памяти
	setTimeout(renderAssetList, 200)
})

function handleAssetUpload(e) {
	const files = e.target.files
	if (!files.length) return

	// --- ИСПРАВЛЕНИЕ ОШИБКИ ---
	// Если массив удалился при загрузке старого сохранения, создаем его заново
	if (!projectData.assets) projectData.assets = []
	// -------------------------

	Array.from(files).forEach(file => {
		const reader = new FileReader()
		reader.onload = evt => {
			const base64 = evt.target.result

			// Еще раз проверяем внутри колбэка (на всякий случай)
			if (!projectData.assets) projectData.assets = []

			// Определяем тип файла
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
			}

			projectData.assets.push(asset)
			renderAssetList()

			// Сохраняем сразу, чтобы массив assets записался в localStorage
			if (typeof saveProjectToLocal === 'function') saveProjectToLocal()
		}
		reader.readAsDataURL(file)
	})

	e.target.value = '' // Сброс инпута
}

function renderAssetList() {
	const container = document.getElementById('assetList')
	if (!container) return

	container.innerHTML = ''

	// Если списка нет - создаем и выходим
	if (!projectData.assets) {
		projectData.assets = []
	}

	if (projectData.assets.length === 0) {
		container.innerHTML =
			'<div style="padding:10px; color:#666; font-size:11px; text-align:center;">Пусто</div>'
		return
	}

	projectData.assets.forEach(asset => {
		const item = document.createElement('div')
		item.className = 'list-item'

		// ВАЖНО: Разрешаем перетаскивание
		item.draggable = true
		item.style.cursor = 'grab'

		let icon = 'ri-file-line'
		if (asset.type === 'image') icon = 'ri-image-line'
		else if (asset.type === 'audio') icon = 'ri-music-line'
		else if (asset.type === 'font') icon = 'ri-font-size'

		item.innerHTML = `
            <i class="${icon}"></i>
            <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px;">${asset.name}</span>
            <i class="ri-delete-bin-line action-icon" title="Удалить" style="color:var(--danger)"></i>
        `

		// === ЛОГИКА DRAG & DROP ===
		item.ondragstart = e => {
			e.dataTransfer.setData('text/plain', asset.id)
			e.dataTransfer.effectAllowed = 'copy'
		}

		// Копирование ID по клику
		item.onclick = e => {
			if (!e.target.classList.contains('ri-delete-bin-line')) {
				navigator.clipboard.writeText(asset.id)
				if (typeof showNotification === 'function')
					showNotification('ID скопирован')
			}
		}

		// Удаление
		item.querySelector('.ri-delete-bin-line').onclick = e => {
			e.stopPropagation()
			if (confirm('Удалить файл из проекта?')) {
				projectData.assets = projectData.assets.filter(a => a.id !== asset.id)
				renderAssetList()
				if (typeof saveProjectToLocal === 'function') saveProjectToLocal()
			}
		}

		container.appendChild(item)
	})
}
