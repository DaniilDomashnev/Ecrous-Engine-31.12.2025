let currentLang = localStorage.getItem('lang') || 'ru'
let translations = {}

// Try to determine a reliable base URL for locale files by looking
// for the script tag that loaded this file. This avoids relative-path
// issues when the app is served from different bases.
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
	// Fallback to absolute path under web root
	return '/src/locales/'
}

async function loadLanguage(lang) {
	if (!lang) lang = 'ru'
	const base = getLocalesBaseURL()
	const url = new URL(`${lang}.json`, base).toString()
	try {
		const res = await fetch(url)
		if (!res.ok)
			throw new Error('Файл не найден: ' + res.status + ' (' + url + ')')
		const data = await res.json()
		translations = data || {}
		currentLang = lang
		localStorage.setItem('lang', lang)
		applyTranslations()
	} catch (err) {
		console.warn('Ошибка загрузки языка:', err)
		if (lang !== 'en') {
			// try fallback to English
			await loadLanguage('en')
		}
	}
}

function applyTranslations() {
	// textContent translations
	document.querySelectorAll('[data-translate]').forEach(el => {
		const key = el.getAttribute('data-translate')
		if (!key) return
		const val = translations[key]
		if (typeof val !== 'undefined') el.textContent = val
	})

	// attribute translations: placeholder, alt, title, value, innerHTML
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

	// set document language for accessibility
	try {
		document.documentElement.lang = currentLang
	} catch (e) {}
}

// Expose changeLanguage for inline `onchange="changeLanguage()"` usage in HTML
window.changeLanguage = function (lang) {
	if (!lang) {
		const sel = document.getElementById('languageSelect')
		if (sel) lang = sel.value
	}
	if (window.initChangelog) {
		window.initChangelog()
	}
	if (lang) loadLanguage(lang)
}

// Load on DOMContentLoaded so the DOM exists (but before all resources finish)
window.addEventListener('DOMContentLoaded', () => {
	loadLanguage(currentLang)
})
