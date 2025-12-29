// ==========================================
// --- НАСТРОЙКИ ПРОЕКТА ---
// ==========================================

// Инициализация кнопки
document.addEventListener('DOMContentLoaded', () => {
	const btn = document.getElementById('btnProjectSettings')
	if (btn) btn.onclick = openProjectSettings

	document.getElementById('btn-save-settings').onclick = saveProjectSettings
})

let tempIconBase64 = null

document.addEventListener('DOMContentLoaded', () => {
	const btn = document.getElementById('btnProjectSettings')
	if (btn) btn.onclick = openProjectSettings

	const saveBtn = document.getElementById('btn-save-settings')
	if (saveBtn) saveBtn.onclick = saveProjectSettings

	// Обработчик загрузки файла иконки
	const iconInput = document.getElementById('set-proj-icon-input')
	if (iconInput) {
		iconInput.addEventListener('change', function (e) {
			const file = e.target.files[0]
			if (!file) return
			const reader = new FileReader()
			reader.onload = function (evt) {
				tempIconBase64 = evt.target.result
				document.getElementById('set-proj-icon-preview').src = tempIconBase64
			}
			reader.readAsDataURL(file)
		})
	}
})

function openProjectSettings() {
	const modal = document.getElementById('modal-project-settings')
	const nameInp = document.getElementById('set-proj-name')
	const authorInp = document.getElementById('set-proj-author')
	const verInp = document.getElementById('set-proj-version')
	const sceneSel = document.getElementById('set-start-scene')
	const statusSel = document.getElementById('set-proj-status')
	const iconPrev = document.getElementById('set-proj-icon-preview')

	// НОВОЕ: Чекбокс заставки
	const splashCheck = document.getElementById('set-disable-splash')

	if (!projectData.settings) projectData.settings = {}

	nameInp.value =
		projectData.settings.name || projectData.meta.name || 'My Game'
	authorInp.value = projectData.settings.author || ''
	verInp.value = projectData.settings.version || '1.0'
	statusSel.value = projectData.settings.status || ''

	// Загружаем состояние галочки
	if (splashCheck) {
		splashCheck.checked = projectData.settings.disableSplash === true
	}

	tempIconBase64 = projectData.settings.icon || null
	if (tempIconBase64) {
		iconPrev.src = tempIconBase64
	} else {
		// Заглушка
		iconPrev.src =
			"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23333'/%3E%3Cpath d='M32 20v24M20 32h24' stroke='%23555' stroke-width='4'/%3E%3C/svg%3E"
	}

	sceneSel.innerHTML = ''
	projectData.scenes.forEach(scene => {
		const opt = document.createElement('option')
		opt.value = scene.id
		opt.innerText = scene.name
		if (projectData.settings.startSceneId === scene.id) {
			opt.selected = true
		}
		sceneSel.appendChild(opt)
	})

	modal.classList.remove('hidden')
	setTimeout(() => modal.classList.add('active'), 10)
}

function saveProjectSettings() {
	const name = document.getElementById('set-proj-name').value
	const author = document.getElementById('set-proj-author').value
	const version = document.getElementById('set-proj-version').value
	const startSceneId = document.getElementById('set-start-scene').value
	const status = document.getElementById('set-proj-status').value

	// Сохраняем галочку
	const disableSplash = document.getElementById('set-disable-splash').checked

	projectData.settings = {
		name,
		author,
		version,
		startSceneId,
		status,
		disableSplash, // <--- Важно!
		icon: tempIconBase64,
	}

	projectData.meta.name = name
	document.title = `Ecrous Engine | ${name}`

	saveProjectToLocal()
	closeProjectSettings()
}
window.addEventListener('touchstart', () => (window.isTouching = true))
window.addEventListener('touchend', () => (window.isTouching = false))

function closeProjectSettings() {
	const modal = document.getElementById('modal-project-settings')
	modal.classList.remove('active')
	setTimeout(() => modal.classList.add('hidden'), 200)
}
