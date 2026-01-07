/* ==========================================
   Settings.js - Исправленная версия с рабочими темами
========================================== */

document.addEventListener('DOMContentLoaded', () => {
	loadCustomTheme()
	loadSavedTheme()

	// Если тема все еще не применилась (например, из-за CSS), пробуем принудительно
	const saved = localStorage.getItem('theme') || 'Dark'
	forceThemeApply(saved)

	restoreAnimations()
	restoreHints()
	initSettingsListeners()
})

function initSettingsListeners() {
	const uploadBtn = document.getElementById('uploadThemeBtn')
	const fileInput = document.getElementById('themeFileInput')
	const themeSelect = document.getElementById('ThemeSelect')

	if (themeSelect) {
		themeSelect.addEventListener('change', changeTheme)
	}

	if (uploadBtn && fileInput) {
		uploadBtn.addEventListener('click', () => fileInput.click())

		fileInput.addEventListener('change', async event => {
			const file = event.target.files[0]
			if (!file) return

			try {
				const text = await file.text()
				// Простая генерация имени, если в файле нет
				let themeName = 'theme-custom-' + Date.now()
				const match = text.match(/\.theme-[a-zA-Z0-9_-]+/)
				if (match) themeName = match[0].replace('.', '')

				localStorage.setItem('customThemeCSS', text)
				localStorage.setItem('customThemeName', themeName)

				addCustomThemeToDOM(themeName, text)
				addCustomThemeToSelect(themeName)
				applyTheme(themeName)

				if (themeSelect) themeSelect.value = themeName
				alert('Тема успешно загружена!')
			} catch (e) {
				console.error(e)
				alert('Ошибка чтения файла')
			}
		})
	}
}

/* ==========================================
   ЗАГРУЗКА И ПРИМЕНЕНИЕ ТЕМ
========================================== */

function loadSavedTheme() {
	const saved = localStorage.getItem('theme') || 'Dark'
	applyThemeClasses(saved)

	const select = document.getElementById('ThemeSelect')
	if (select) {
		select.value = saved
		if (!select.value) select.value = 'Dark' // Фолбэк
	}
}

function changeTheme() {
	const select = document.getElementById('ThemeSelect')
	if (!select) return
	const theme = select.value
	applyThemeClasses(theme)
	localStorage.setItem('theme', theme)
}

function applyTheme(name) {
	applyThemeClasses(name)
	localStorage.setItem('theme', name)
}

function applyThemeClasses(themeName) {
	// Сначала убираем ВСЕ классы тем
	const classes = document.body.classList
	const toRemove = []
	classes.forEach(c => {
		if (c.startsWith('theme-')) toRemove.push(c)
	})
	toRemove.forEach(c => classes.remove(c))

	// Маппинг имен из Select -> CSS классы
	const map = {
		Dark: 'theme-dark',
		Light: 'theme-light',
		Night: 'theme-night',
		Ruby: 'theme-ruby',
		RubyLight: 'theme-ruby-light',
		RubyNeon: 'theme-ruby-neon',
		Emerald: 'theme-emerald',
		Gold: 'theme-gold',
		Diamond: 'theme-diamond',
		Sapphire: 'theme-sapphire',
		Gray: 'theme-gray',
		Mint: 'theme-mint',
		Sakura: 'theme-sakura',
		Sunset: 'theme-sunset',
		Frost: 'theme-frost',
	}

	// Если это стандартная тема
	if (map[themeName]) {
		document.body.classList.add(map[themeName])
	}
	// Если это кастомная тема (начинается с theme-)
	else if (themeName.startsWith('theme-')) {
		document.body.classList.add(themeName)
	}
	// Иначе дефолт
	else {
		document.body.classList.add('theme-dark')
	}
}

function forceThemeApply(themeName) {
	// Если CSS файл не подгрузился, переменные не сработают.
	// Но классы мы всё равно вешаем.
	applyThemeClasses(themeName)
}

/* ==========================================
   CUSTOM THEMES
========================================== */
function loadCustomTheme() {
	const css = localStorage.getItem('customThemeCSS')
	const name = localStorage.getItem('customThemeName')
	if (!css || !name) return

	addCustomThemeToDOM(name, css)
	addCustomThemeToSelect(name)
}

function addCustomThemeToDOM(name, css) {
	const old = document.getElementById('custom-theme-style')
	if (old) old.remove()
	const style = document.createElement('style')
	style.id = 'custom-theme-style'
	style.textContent = css
	document.head.appendChild(style)
}

function addCustomThemeToSelect(name) {
	const select = document.getElementById('ThemeSelect')
	if (!select) return
	if ([...select.options].some(o => o.value === name)) return

	const option = document.createElement('option')
	option.value = name
	option.textContent = 'Custom: ' + name.replace('theme-', '')
	select.appendChild(option)
}

/* ==========================================
   ОСТАЛЬНЫЕ НАСТРОЙКИ
========================================== */
function restoreAnimations() {
	// Пример
}
function restoreHints() {
	// Пример
}

/* ==========================================
   MODAL LOGIC
========================================== */
function openSettings() {
	const panel = document.getElementById('settingsPanel')
	if (panel) {
		const overlay = ensureModalOverlay()
		overlay.style.display = 'block'
		setTimeout(() => overlay.classList.add('visible'), 10)
		panel.style.display = 'flex'
		setTimeout(() => panel.classList.remove('hidden'), 10)
	}
}

function closeSettings() {
	const panel = document.getElementById('settingsPanel')
	if (panel) {
		panel.classList.add('hidden')
		const overlay = document.getElementById('modalOverlay')
		if (overlay) {
			overlay.classList.remove('visible')
			setTimeout(() => {
				overlay.style.display = 'none'
			}, 220)
		}
		setTimeout(() => {
			panel.style.display = 'none'
		}, 200)
	}
}

function ensureModalOverlay() {
	let overlay = document.getElementById('modalOverlay')
	if (overlay) return overlay
	overlay = document.createElement('div')
	overlay.id = 'modalOverlay'
	overlay.classList.add('modal-overlay')
	overlay.style.display = 'none'
	overlay.addEventListener('click', () => {
		try {
			closeSettings()
		} catch (e) {}
	})
	document.body.appendChild(overlay)
	return overlay
}
