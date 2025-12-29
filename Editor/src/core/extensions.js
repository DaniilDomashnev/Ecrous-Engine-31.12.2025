// База данных доступных расширений (в будущем можно грузить с сервера)
const EXTENSION_STORE = [
	{
		id: 'ext_3d_basic',
		name: 'Basic 3D Pack',
		desc: 'Добавляет базовые 3D примитивы: Куб, Сфера и управление 3D камерой.',
		icon: 'ri-box-3-fill',
		color: '#FF4081',
		price: 0, // Бесплатно
		blocks: [
			{
				id: '3d_create_cube',
				category: '3D Мир',
				label: 'Создать Куб',
				desc: 'Создает 3D куб в центре сцены',
				icon: 'ri-box-3-line',
				color: '#FF4081',
				inputs: [
					{ label: 'Имя', default: 'cube1' },
					{ label: 'Размер', default: '50' },
					{ label: 'Цвет', default: '#ff0000', type: 'color' },
				],
			},
			{
				id: '3d_rotate_obj',
				category: '3D Мир',
				label: 'Вращать 3D',
				desc: 'Вращает объект по осям X, Y, Z',
				icon: 'ri-refresh-line',
				color: '#FF4081',
				inputs: [
					{ label: 'Объект', default: 'cube1' },
					{ label: 'X', default: '1' },
					{ label: 'Y', default: '1' },
					{ label: 'Z', default: '0' },
				],
			},
		],
	},
	{
		id: 'ext_rpg_system',
		name: 'RPG System',
		desc: 'Готовые блоки для инвентаря, диалогов и квестов.',
		icon: 'ri-sword-fill',
		color: '#7C4DFF',
		price: 100, // EcrCoin
		blocks: [], // Тут можно добавить блоки RPG
	},
	{
		id: 'ext_network',
		name: 'Multiplayer',
		desc: 'Бета-версия мультиплеера. WebSocket клиент.',
		icon: 'ri-earth-line',
		color: '#00B0FF',
		price: 500,
		blocks: [],
	},
]

// Глобальный список установленных ID
let installedExtensions = []

// Инициализация магазина
function initExtensionsSystem() {
	// Загружаем список купленных из LocalStorage
	const saved = localStorage.getItem('ecrous_installed_extensions')
	if (saved) {
		installedExtensions = JSON.parse(saved)
		// Применяем их сразу при старте
		installedExtensions.forEach(extId => installExtensionBlocks(extId, true))
	}
}

function openAssetStore() {
	const modal = document.getElementById('modal-asset-store')
	modal.classList.remove('hidden')
	// Здесь можно загружать список ассетов с сервера
}

function closeAssetStore() {
	document.getElementById('modal-asset-store').classList.add('hidden')
}

// Открыть окно
function openStoreModal() {
	const modal = document.getElementById('modal-store')
	modal.classList.remove('hidden')
	renderStore('all')
}

// Закрыть окно
function closeStoreModal() {
	document.getElementById('modal-store').classList.add('hidden')
}

// Рендер карточек
function renderStore(filter) {
	const container = document.getElementById('store-content')
	container.innerHTML = ''

	EXTENSION_STORE.forEach(pack => {
		const isInstalled = installedExtensions.includes(pack.id)

		if (filter === 'installed' && !isInstalled) return
		if (filter === 'premium' && pack.price === 0) return

		const el = document.createElement('div')
		el.className = 'store-card'

		let btnHtml = ''
		if (isInstalled) {
			btnHtml = `<button class="store-btn installed"><i class="ri-check-line"></i> Установлено</button>`
		} else {
			const priceText = pack.price === 0 ? 'Бесплатно' : `${pack.price} EcrCoin`
			btnHtml = `<button class="store-btn buy" onclick="buyExtension('${pack.id}')">
                         Получить за ${priceText}
                       </button>`
		}

		el.innerHTML = `
            <div class="store-card-img" style="color:${pack.color}">
                <i class="${pack.icon}"></i>
            </div>
            <div class="store-card-body">
                <div style="display:flex; justify-content:space-between;">
                    <div class="store-card-title">${pack.name}</div>
                </div>
                <div class="store-card-desc">${pack.desc}</div>
                ${btnHtml}
            </div>
        `
		container.appendChild(el)
	})
}

function filterStore(type) {
	document
		.querySelectorAll('.store-tab')
		.forEach(t => t.classList.remove('active'))
	event.target.classList.add('active')
	renderStore(type)
}

// Покупка / Установка
function buyExtension(packId) {
	const pack = EXTENSION_STORE.find(p => p.id === packId)
	if (!pack) return

	// Тут можно добавить проверку баланса EcrCoin
	/*
    if (userBalance < pack.price) {
        alert("Недостаточно средств!");
        return;
    }
    */

	if (confirm(`Установить "${pack.name}"?`)) {
		installedExtensions.push(packId)
		saveExtensionsState()

		installExtensionBlocks(packId)
		renderStore('all') // Обновить кнопки

		// Уведомление
		if (typeof showNotification === 'function')
			showNotification(`Пакет ${pack.name} установлен!`)
	}
}

// Логика добавления блоков в движок
function installExtensionBlocks(packId, isSilent = false) {
	const pack = EXTENSION_STORE.find(p => p.id === packId)
	if (!pack || !pack.blocks) return

	// Добавляем новые блоки в глобальный массив BLOCK_DEFINITIONS
	pack.blocks.forEach(newBlock => {
		// Проверяем, нет ли дубликатов
		if (!BLOCK_DEFINITIONS.find(b => b.id === newBlock.id)) {
			BLOCK_DEFINITIONS.push(newBlock)
		}
	})

	// Если это не тихая загрузка при старте, обновляем тулбокс
	if (!isSilent) {
		initToolbox()
	}
}

function saveExtensionsState() {
	localStorage.setItem(
		'ecrous_installed_extensions',
		JSON.stringify(installedExtensions)
	)
}

window.initExtensionsSystem = initExtensionsSystem
window.openStoreModal = openStoreModal
window.closeStoreModal = closeStoreModal
window.buyExtension = buyExtension
window.filterStore = filterStore
