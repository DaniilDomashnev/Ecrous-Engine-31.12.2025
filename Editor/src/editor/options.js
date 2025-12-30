// ==========================================
// --- НАСТРОЙКИ ПРОЕКТА ---
// ==========================================

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
                const preview = document.getElementById('set-proj-icon-preview')
                if(preview) preview.src = tempIconBase64
            }
            reader.readAsDataURL(file)
        })
    }
})

let tempIconBase64 = null

function openProjectSettings() {
    const modal = document.getElementById('modal-project-settings')
    if (!modal) return

    // Получаем элементы
    const nameInp = document.getElementById('set-proj-name')
    const authorInp = document.getElementById('set-proj-author')
    const verInp = document.getElementById('set-proj-version')
    const sceneSel = document.getElementById('set-start-scene')
    const statusSel = document.getElementById('set-proj-status')
    const iconPrev = document.getElementById('set-proj-icon-preview')
    
    // --- НОВЫЕ ЭЛЕМЕНТЫ ---
    const orientSel = document.getElementById('set-proj-orientation')
    const pkgInp = document.getElementById('set-proj-package')
    const splashCheck = document.getElementById('set-disable-splash')

    // Инициализируем объект настроек, если его нет
    if (!projectData.settings) projectData.settings = {}

    // 1. Заполняем стандартные поля
    if (nameInp)
			nameInp.value =
				projectData.settings.name || projectData.meta?.name || 'My Game'
    if(authorInp) authorInp.value = projectData.settings.author || ''
    if(verInp) verInp.value = projectData.settings.version || '1.0'
    if(statusSel) statusSel.value = projectData.settings.status || ''

    // 2. Заполняем НОВЫЕ поля
    if (orientSel) {
        orientSel.value = projectData.settings.orientation || 'landscape'
    }
    if (pkgInp) {
        pkgInp.value = projectData.settings.packageId || 'com.ecrous.game'
    }
    if (splashCheck) {
        // Если галочка стоит = Splash отключен
        splashCheck.checked = projectData.settings.disableSplash === true
    }

    // 3. Иконка
    tempIconBase64 = projectData.settings.icon || null
    if (iconPrev) {
        if (tempIconBase64) {
            iconPrev.src = tempIconBase64
        } else {
            iconPrev.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23333'/%3E%3Cpath d='M32 20v24M20 32h24' stroke='%23555' stroke-width='4'/%3E%3C/svg%3E"
        }
    }

    // 4. Список сцен
    if (sceneSel) {
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
    }

    modal.classList.remove('hidden')
    setTimeout(() => modal.classList.add('active'), 10)
}

function saveProjectSettings() {
    // Получаем значения
    const name = document.getElementById('set-proj-name')?.value || 'New Project'
    const author = document.getElementById('set-proj-author')?.value || ''
    const version = document.getElementById('set-proj-version')?.value || '1.0'
    const startSceneId = document.getElementById('set-start-scene')?.value
    const status = document.getElementById('set-proj-status')?.value
    
    // --- НОВЫЕ ЗНАЧЕНИЯ ---
    const orientation = document.getElementById('set-proj-orientation')?.value || 'landscape'
    const packageId = document.getElementById('set-proj-package')?.value || 'com.ecrous.game'
    const disableSplash = document.getElementById('set-disable-splash')?.checked || false

    // Сохраняем в объект
    projectData.settings = {
        name,
        author,
        version,
        startSceneId,
        status,
        orientation,   // Сохраняем ориентацию
        packageId,     // Сохраняем пакет
        disableSplash, // Сохраняем состояние заставки
        icon: tempIconBase64,
    }

    // Обновляем метаданные и заголовок
    if(projectData.meta) projectData.meta.name = name
    document.title = `Ecrous Engine | ${name}`

    // Сохраняем в LocalStorage
    if(typeof saveProjectToLocal === 'function') saveProjectToLocal()
    
    closeProjectSettings()
}

function closeProjectSettings() {
    const modal = document.getElementById('modal-project-settings')
    if (modal) {
        modal.classList.remove('active')
        setTimeout(() => modal.classList.add('hidden'), 200)
    }
}
