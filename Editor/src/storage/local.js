function saveProjectToLocal() {
	saveCurrentWorkspace() // Сначала обновляем данные из редактора в объект

	// Используем уникальный ключ именно для ЭТОГО проекта
	localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData))

	showNotification(`Проект "${currentProjectName}" сохранен!`, 'ri-save-3-line')
}

function loadProjectFromLocal() {
	// Загружаем по уникальному ключу
	const d = localStorage.getItem(STORAGE_KEY)
	if (d) {
		projectData = JSON.parse(d)
		// Проверка на целостность, чтобы не крашнулось
		if (!projectData.scenes || projectData.scenes.length === 0) return

		activeSceneId = projectData.scenes[0].id
		const firstObj = projectData.scenes[0].objects[0]
		activeObjectId = firstObj ? firstObj.id : null

		renderSidebar()
		loadWorkspace()
	} else {
		projectData = null // Маркер, что проект новый
	}
}

function saveCurrentWorkspace() {
	const currentObj = getActiveObject()
	if (!currentObj) return
	const data = []
	document.querySelectorAll('.node-block').forEach(el => {
		const inputs = Array.from(el.querySelectorAll('input')).map(i => i.value)
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
	currentObj.connections = [...connections]
}

function loadWorkspace() {
	container.innerHTML = ''
	const svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	svgLayer.setAttribute('id', 'connections-layer')
	svgLayer.style.overflow = 'visible'
	container.appendChild(svgLayer)
	const currentObj = getActiveObject()
	if (!currentObj) return
	if (currentObj.scripts)
		currentObj.scripts.forEach(b => createBlock(b.type, 0, 0, b))
	connections = currentObj.connections || []
	setEditorMode(editorMode)
	if (editorMode === 'nodes') setTimeout(updateAllConnections, 50)
}
