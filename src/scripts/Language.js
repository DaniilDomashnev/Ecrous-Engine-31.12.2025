let currentLang = localStorage.getItem('lang') || 'ru'
let translations = {}

// Функция для определения базового пути (без изменений)
function getLocalesBaseURL() {
	try {
		const scripts = document.querySelectorAll('script[src]')
		for (const s of scripts) {
			if (s.src && s.src.includes('Language.js')) {
				return s.src.replace(
					/\/src\/scripts\/Language\.js(\?.*)?$/,
					'/src/locales/'
				)
			}
		}
	} catch (e) {
		// fall through
	}
	return '/src/locales/'
}

async function loadLanguage(lang) {
	if (!lang) lang = 'ru'

	// 1. Сразу обновляем выпадающий список, чтобы интерфейс соответствовал логике
	const langSelect = document.getElementById('languageSelect')
	if (langSelect) {
		langSelect.value = lang
	}

	const base = getLocalesBaseURL()
	const url = new URL(`${lang}.json`, base).toString()

	try {
		const res = await fetch(url)
		if (!res.ok)
			throw new Error('Файл не найден: ' + res.status + ' (' + url + ')')

		const data = await res.json()
		translations = data || {}

		// Сохраняем и применяем
		currentLang = lang
		localStorage.setItem('lang', lang)
		applyTranslations()
	} catch (err) {
		console.warn('Ошибка загрузки языка:', err)
		if (lang !== 'en') {
			await loadLanguage('en')
		}
	}
}

function applyTranslations() {
	// (Код перевода без изменений)
	document.querySelectorAll('[data-translate]').forEach(el => {
		const key = el.getAttribute('data-translate')
		if (!key) return
		const val = translations[key]
		if (typeof val !== 'undefined') el.textContent = val
	})

	document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
		const key = el.getAttribute('data-translate-placeholder')
		const val = translations[key]
		if (typeof val !== 'undefined') el.placeholder = val
	})

	document.querySelectorAll('[data-translate-alt]').forEach(el => {
		const key = el.getAttribute('data-translate-alt')
		const val = translations[key]
		if (typeof val !== 'undefined') el.alt = val
	})

	document.querySelectorAll('[data-translate-title]').forEach(el => {
		const key = el.getAttribute('data-translate-title')
		const val = translations[key]
		if (typeof val !== 'undefined') el.title = val
	})

	document.querySelectorAll('[data-translate-value]').forEach(el => {
		const key = el.getAttribute('data-translate-value')
		const val = translations[key]
		if (typeof val !== 'undefined') el.value = val
	})

	document.querySelectorAll('[data-translate-html]').forEach(el => {
		const key = el.getAttribute('data-translate-html')
		const val = translations[key]
		if (typeof val !== 'undefined') el.innerHTML = val
	})

	try {
		document.documentElement.lang = currentLang
	} catch (e) {}
}

// Изменения языка пользователем
window.changeLanguage = function (lang) {
	if (!lang) {
		const sel = document.getElementById('languageSelect')
		if (sel) lang = sel.value
	}
	// Сохраняем выбор сразу, чтобы интерфейс не дергался
	if (lang) {
		localStorage.setItem('lang', lang)
		loadLanguage(lang)
	}

	if (window.initChangelog) {
		window.initChangelog()
	}
}

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
	loadLanguage(currentLang)
})
