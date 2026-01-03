/* ==========================================
   AboutNew.js - Исправленная версия
========================================== */

const UPDATE_CONFIG = {
	version: 'ECX 2025.03.01',
	changes: [
		{
			type: 'fix',
			text: {
				ru: 'Блоки на телефоне работают нормально',
				en: 'Blocks work correctly on mobile',
				uk: 'Блоки на телефоні працюють нормально',
				kz: 'Телефонда блоктар дұрыс жұмыс істейді',
			},
		},
		{
			type: 'update',
			text: {
				ru: 'Перетаскивание блоков на телефонах теперь имеет задержку в 200мс, чтобы вы случайно не задели блоки.',
				en: 'Dragging blocks on phones now has a 200ms delay to prevent accidental touches.',
				uk: 'Перетягування блоків на телефонах тепер має затримку 200мс, щоб ви випадково не зачепили блоки.',
				kz: 'Телефонда блоктарды сүйреу енді кездейсоқ тиіп кетпес үшін 200мс кідіріске ие.',
			},
		},
		{
			type: 'update',
			text: {
				ru: 'Обновлены языки, теперь появился немецский язык, а так же отображение языков работает корректно',
				en: 'Languages updated, German added, and language display works correctly',
				uk: "Оновлено мови, тепер з'явилася німецька мова, а також відображення мов працює коректно",
				kz: 'Тілдер жаңартылды, енді неміс тілі қосылды, сондай-ақ тілдердің көрсетілуі дұрыс жұмыс істейді',
			},
		},
		{
			type: 'update',
			text: {
				ru: 'Новые участники в пункте благодарности',
				en: 'New members in the Credits section',
				uk: 'Нові учасники в розділі подяк',
				kz: 'Алғыс білдіру бөлімінде жаңа қатысушылар',
			},
		},
	],
}

const STORAGE_KEY_VERSION = 'EcrousEngine_LastViewedVersion'

// Словари для бейджей
const BADGE_KEYS = {
	new: 'badgeNew',
	fix: 'badgeFix',
	update: 'badgeUpdate',
}
const BADGE_FALLBACKS = {
	ru: { new: 'Новое', fix: 'Исправлено', update: 'Улучшено' },
	en: { new: 'New', fix: 'Fixed', update: 'Improved' },
	uk: { new: 'Нове', fix: 'Виправлено', update: 'Покращено' },
	kz: { new: 'Жаңа', fix: 'Түзетілді', update: 'Жақсартылды' },
}

document.addEventListener('DOMContentLoaded', () => {
	initChangelog()
	checkAndShowUpdate()
})

// === ВАЖНО: Делаем функцию глобальной, чтобы Language.js мог её вызвать ===
window.initChangelog = initChangelog

function getCurrentLanguage() {
	let lang = localStorage.getItem('language')
	if (!lang) lang = 'ru' // Язык по умолчанию
	return lang
}

function initChangelog() {
	const container = document.getElementById('changelogContainer')
	const versionSpan = document.getElementById('newVersionNumber')
	const currentLang = getCurrentLanguage()

	if (versionSpan) versionSpan.innerText = UPDATE_CONFIG.version
	if (!container) return

	container.innerHTML = ''

	UPDATE_CONFIG.changes.forEach(item => {
		const row = document.createElement('div')
		row.className = 'changelog-item'

		const badgeClass = `badge ${item.type}`

		// 1. Текст бейджа
		const dict = BADGE_FALLBACKS[currentLang] || BADGE_FALLBACKS['ru']
		const badgeText = dict[item.type] || item.type

		// 2. Текст обновления
		// Ищем перевод, если нет - берем русский, если нет - берем первый доступный или пустую строку
		const updateText =
			item.text[currentLang] ||
			item.text['ru'] ||
			Object.values(item.text)[0] ||
			''

		row.innerHTML = `
            <div class="${badgeClass}" data-translate="${
			BADGE_KEYS[item.type]
		}">${badgeText}</div>
            <div class="change-text">${updateText}</div>
        `
		container.appendChild(row)
	})
}

function openAboutNew() {
	const panel = document.getElementById('aboutNewPanel')
	if (!panel) return
	initChangelog() // Обновляем перед открытием
	try {
		document.documentElement.style.overflow = 'hidden'
	} catch (e) {}
	panel.style.display = 'flex'
	panel.style.animation =
		'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
}

function closeAboutNew() {
	const panel = document.getElementById('aboutNewPanel')
	if (!panel) return
	panel.style.animation = 'fadeOut 0.3s forwards'
	setTimeout(() => {
		panel.style.display = 'none'
		panel.style.animation = ''
		document.documentElement.style.overflow = ''
		markVersionAsViewed()
	}, 300)
}

function checkAndShowUpdate() {
	const lastViewed = localStorage.getItem(STORAGE_KEY_VERSION)
	if (lastViewed !== UPDATE_CONFIG.version) {
		setTimeout(() => {
			openAboutNew()
		}, 1000)
	}
}

function markVersionAsViewed() {
	localStorage.setItem(STORAGE_KEY_VERSION, UPDATE_CONFIG.version)
}
