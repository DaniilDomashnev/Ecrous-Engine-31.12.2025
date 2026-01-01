// ==========================================
// 1. ИМПОРТЫ FIREBASE
// ==========================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js'
import {
	getAuth,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'
import {
	getFirestore,
	collection,
	addDoc,
	getDocs,
	query,
	orderBy,
	deleteDoc,
	doc,
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'

// ==========================================
// 2. КОНФИГУРАЦИЯ
// ==========================================
const firebaseConfig = {
	apiKey: 'AIzaSyB5alDi1qbkwTQkTpxoHM5o1RNBV5U0yXo',
	authDomain: 'ecrous-engine.firebaseapp.com',
	databaseURL: 'https://ecrous-engine-default-rtdb.firebaseio.com',
	projectId: 'ecrous-engine',
	storageBucket: 'ecrous-engine.firebasestorage.app',
	messagingSenderId: '1019082545814',
	appId: '1:1019082545814:web:f9bec8d187512967d280b7',
	measurementId: 'G-T47F29BTF0',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// ==========================================
// 3. UI УТИЛИТЫ (Toasts & Modals)
// ==========================================

// Функция показа всплывающих уведомлений
function showToast(message, type = 'success') {
	const container = document.getElementById('toast-container')
	if (!container) return // Защита, если контейнера нет в HTML

	const toast = document.createElement('div')
	toast.className = `toast ${type}`

	const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'

	toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `

	container.appendChild(toast)

	// Анимация исчезновения через 3 секунды
	setTimeout(() => {
		toast.style.animation = 'fadeOut 0.3s forwards'
		setTimeout(() => toast.remove(), 300)
	}, 3000)
}

// Глобальные функции для управления модалками (чтобы работали из HTML onclick)
window.openModal = id => {
	const modal = document.getElementById(id)
	if (modal) {
		modal.classList.add('active')
		document.body.style.overflow = 'hidden' // Блокируем скролл фона
	}
}

window.closeModal = id => {
	const modal = document.getElementById(id)
	if (modal) {
		modal.classList.remove('active')
		document.body.style.overflow = 'auto'
	}
}

// Закрытие по клику на затемненный фон
window.onclick = function (e) {
	if (e.target.classList.contains('modal-overlay')) {
		e.target.classList.remove('active')
		document.body.style.overflow = 'auto'
	}
}

// ==========================================
// 4. АВТОРИЗАЦИЯ
// ==========================================
const userPanel = document.getElementById('user-panel')
const authButtons = document.getElementById('auth-buttons')
const userEmailSpan = document.getElementById('user-email')

// Слушаем изменения статуса входа
onAuthStateChanged(auth, user => {
	if (user) {
		// Пользователь вошел
		authButtons.classList.add('hidden')
		// authButtons.style.display = 'none'; // На всякий случай

		userPanel.classList.remove('hidden')
		userPanel.style.display = 'flex'
		userEmailSpan.textContent = user.email

		// Перезагружаем ассеты, чтобы показать кнопки удаления (если это владелец)
		loadAssets()
	} else {
		// Пользователь вышел
		authButtons.classList.remove('hidden')
		authButtons.style.display = 'flex'

		userPanel.classList.add('hidden')
		userPanel.style.display = 'none'

		loadAssets()
	}
})

// Регистрация
const regForm = document.getElementById('register-form')
if (regForm) {
	regForm.addEventListener('submit', async e => {
		e.preventDefault()
		const email = document.getElementById('reg-email').value
		const pass = document.getElementById('reg-pass').value
		try {
			await createUserWithEmailAndPassword(auth, email, pass)
			window.closeModal('register-modal')
			showToast('Аккаунт успешно создан!', 'success')
		} catch (error) {
			showToast(error.message, 'error')
		}
	})
}

// Вход
const loginForm = document.getElementById('login-form')
if (loginForm) {
	loginForm.addEventListener('submit', async e => {
		e.preventDefault()
		const email = document.getElementById('login-email').value
		const pass = document.getElementById('login-pass').value
		try {
			await signInWithEmailAndPassword(auth, email, pass)
			window.closeModal('login-modal')
			showToast('Добро пожаловать!', 'success')
		} catch (error) {
			showToast('Ошибка входа: ' + error.message, 'error')
		}
	})
}

// Выход
const logoutBtn = document.getElementById('logout-btn')
if (logoutBtn) {
	logoutBtn.addEventListener('click', () => {
		signOut(auth)
		showToast('Вы вышли из системы', 'success')
	})
}

// ==========================================
// 5. ЗАГРУЗКА АССЕТОВ (CREATE)
// ==========================================
const uploadForm = document.getElementById('upload-form')

if (uploadForm) {
	uploadForm.addEventListener('submit', async e => {
		e.preventDefault()
		if (!auth.currentUser)
			return showToast('Сначала войдите в систему!', 'error')

		const name = document.getElementById('asset-name').value
		const category = document.getElementById('asset-category').value
		const previewUrl = document.getElementById('asset-preview').value
		const downloadUrl = document.getElementById('asset-file').value

		const btn = document.getElementById('upload-btn')
		const originalText = btn.textContent
		btn.textContent = 'Публикация...'
		btn.disabled = true

		try {
			await addDoc(collection(db, 'assets'), {
				name,
				category,
				previewUrl,
				downloadUrl,
				author: auth.currentUser.email,
				createdAt: new Date(),
			})

			// Успех: закрываем загрузку, открываем Success Modal
			window.closeModal('upload-modal')
			window.openModal('success-modal')

			uploadForm.reset()
			loadAssets() // Обновляем список
		} catch (error) {
			showToast('Ошибка: ' + error.message, 'error')
		} finally {
			btn.textContent = originalText
			btn.disabled = false
		}
	})
}

// ==========================================
// 6. ОТОБРАЖЕНИЕ И УДАЛЕНИЕ (READ & DELETE)
// ==========================================
const assetsContainer = document.getElementById('assets-container')
let allAssets = [] // Храним загруженные данные локально для быстрого поиска

async function loadAssets(filterCategory = 'all') {
	if (!assetsContainer) return

	assetsContainer.innerHTML =
		'<div class="loader-container"><div class="spinner"></div></div>'

	try {
		const q = query(collection(db, 'assets'), orderBy('createdAt', 'desc'))
		const querySnapshot = await getDocs(q)

		allAssets = []
		querySnapshot.forEach(doc => {
			const data = doc.data()
			data.id = doc.id // ВАЖНО: Сохраняем ID документа для удаления
			allAssets.push(data)
		})

		renderAssets(allAssets, filterCategory)
	} catch (error) {
		console.error(error)
		assetsContainer.innerHTML =
			'<p style="text-align:center;color:#ef4444;grid-column:1/-1;">Не удалось загрузить ассеты.</p>'
	}
}

function renderAssets(assets, category) {
	assetsContainer.innerHTML = ''

	// Фильтрация
	const filtered =
		category === 'all' ? assets : assets.filter(a => a.category === category)

	if (filtered.length === 0) {
		assetsContainer.innerHTML =
			'<p style="text-align:center;color:#666;grid-column:1/-1;padding:40px;">В этой категории пока пусто.</p>'
		return
	}

	// Текущий пользователь для проверки прав
	const currentUserEmail = auth.currentUser ? auth.currentUser.email : null

	filtered.forEach(asset => {
		const card = document.createElement('article')
		card.className = 'asset-card'

		// Проверка: автор ли текущий юзер?
		const isOwner = currentUserEmail === asset.author

		// HTML кнопки удаления (только для автора)
		const deleteBtnHtml = isOwner
			? `<button class="btn btn-delete delete-btn" data-id="${asset.id}" title="Удалить"><i class="fa-solid fa-trash"></i></button>`
			: ''

		// Заглушка, если нет картинки
		const imgUrl =
			asset.previewUrl || 'https://via.placeholder.com/300x200?text=No+Preview'

		card.innerHTML = `
            <div class="card-img-wrapper">
                <img src="${imgUrl}" alt="${
			asset.name
		}" class="card-img" onerror="this.src='https://via.placeholder.com/300x200?text=Error'">
            </div>
            <div class="card-body">
                <div class="card-category">${asset.category}</div>
                <h3 class="card-title" title="${asset.name}">${asset.name}</h3>
                <p class="card-author">By ${asset.author.split('@')[0]}</p>
                
                <div class="card-footer">
                    <span class="price-tag">FREE</span>
                    <div style="display:flex; gap: 8px; align-items: center;">
                        ${deleteBtnHtml}
                        <a href="${
													asset.downloadUrl
												}" target="_blank" class="btn btn-outline-sm">
                            <i class="fa-solid fa-download"></i>
                        </a>
                    </div>
                </div>
            </div>
        `
		assetsContainer.appendChild(card)
	})

	// Навешиваем обработчики на кнопки удаления ПОСЛЕ рендера
	document.querySelectorAll('.delete-btn').forEach(btn => {
		btn.addEventListener('click', async e => {
			e.stopPropagation() // Чтобы не сработал клик по карточке (если будет)

			if (confirm('Вы уверены, что хотите удалить этот ассет?')) {
				const id = btn.getAttribute('data-id')
				try {
					await deleteDoc(doc(db, 'assets', id))
					showToast('Ассет удален', 'success')

					// Удаляем визуально без перезагрузки
					const card = btn.closest('.asset-card')
					card.style.opacity = '0'
					setTimeout(() => card.remove(), 300)

					// Обновляем локальный массив
					allAssets = allAssets.filter(a => a.id !== id)
				} catch (err) {
					showToast('Ошибка удаления: ' + err.message, 'error')
				}
			}
		})
	})
}

// ==========================================
// 7. ФИЛЬТРЫ И ПОИСК
// ==========================================

// Клик по категории
document.querySelectorAll('.category-list li').forEach(li => {
	li.addEventListener('click', () => {
		// UI
		document
			.querySelector('.category-list li.active')
			.classList.remove('active')
		li.classList.add('active')

		// Логика
		const cat = li.getAttribute('data-cat')
		renderAssets(allAssets, cat)
	})
})

// Поиск
const searchInput = document.getElementById('search-input')
if (searchInput) {
	searchInput.addEventListener('input', e => {
		const term = e.target.value.toLowerCase()
		const searched = allAssets.filter(a => a.name.toLowerCase().includes(term))

		// При поиске игнорируем текущую категорию и ищем по всему
		renderAssets(searched, 'all')
	})
}

// Запуск при старте страницы
loadAssets()
