// ==========================================
// 1. ИМПОРТЫ FIREBASE (БЕЗ STORAGE)
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

// Инициализация сервисов (Storage удален)
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// ==========================================
// 3. УПРАВЛЕНИЕ АВТОРИЗАЦИЕЙ
// ==========================================
const userPanel = document.getElementById('user-panel')
const authButtons = document.getElementById('auth-buttons')
const userEmailSpan = document.getElementById('user-email')

onAuthStateChanged(auth, user => {
	if (user) {
		authButtons.classList.add('hidden')
		userPanel.classList.remove('hidden')
		userEmailSpan.textContent = user.email
	} else {
		authButtons.classList.remove('hidden')
		userPanel.classList.add('hidden')
	}
})

// Регистрация
document.getElementById('register-form').addEventListener('submit', async e => {
	e.preventDefault()
	const email = document.getElementById('reg-email').value
	const pass = document.getElementById('reg-pass').value

	try {
		await createUserWithEmailAndPassword(auth, email, pass)
		window.closeModal('register-modal')
		alert('Аккаунт создан!')
	} catch (error) {
		alert('Ошибка: ' + error.message)
	}
})

// Вход
document.getElementById('login-form').addEventListener('submit', async e => {
	e.preventDefault()
	const email = document.getElementById('login-email').value
	const pass = document.getElementById('login-pass').value

	try {
		await signInWithEmailAndPassword(auth, email, pass)
		window.closeModal('login-modal')
	} catch (error) {
		alert('Ошибка входа: ' + error.message)
	}
})

document.getElementById('logout-btn').addEventListener('click', () => {
	signOut(auth)
})

// ==========================================
// 4. ЗАГРУЗКА АССЕТОВ (ТЕПЕРЬ ЭТО ПРОСТО ССЫЛКИ)
// ==========================================
const uploadForm = document.getElementById('upload-form')

uploadForm.addEventListener('submit', async e => {
	e.preventDefault()

	// Проверка авторизации
	if (!auth.currentUser) {
		alert('Сначала войдите в систему!')
		return
	}

	// Получаем данные из полей
	const name = document.getElementById('asset-name').value
	const category = document.getElementById('asset-category').value

	// Теперь здесь лежат СТРОКИ (ссылки), а не файлы
	const previewUrl = document.getElementById('asset-preview').value
	const downloadUrl = document.getElementById('asset-file').value

	const btn = document.getElementById('upload-btn')
	btn.disabled = true
	btn.textContent = 'Публикация...'

	try {
		// Мы пропускаем этап загрузки файла и сразу пишем ссылку в БД
		await addDoc(collection(db, 'assets'), {
			name: name,
			category: category,
			author: auth.currentUser.email,
			previewUrl: previewUrl, // Ссылка, которую вставил юзер
			downloadUrl: downloadUrl, // Ссылка, которую вставил юзер
			createdAt: new Date(),
		})

		alert('Ассет успешно добавлен!')
		window.closeModal('upload-modal')
		uploadForm.reset()
		loadAssets() // Обновить список
	} catch (error) {
		console.error(error)
		alert('Ошибка при сохранении: ' + error.message)
	} finally {
		btn.disabled = false
		btn.textContent = 'Опубликовать'
	}
})

// ==========================================
// 5. ОТОБРАЖЕНИЕ АССЕТОВ (Без изменений)
// ==========================================
const assetsContainer = document.getElementById('assets-container')
let allAssets = []

async function loadAssets(filterCategory = 'all') {
	assetsContainer.innerHTML = '<div class="loader">Загрузка...</div>'

	try {
		const q = query(collection(db, 'assets'), orderBy('createdAt', 'desc'))
		const querySnapshot = await getDocs(q)

		allAssets = []
		assetsContainer.innerHTML = ''

		querySnapshot.forEach(doc => {
			allAssets.push(doc.data())
		})

		renderAssets(allAssets, filterCategory)
	} catch (error) {
		assetsContainer.innerHTML = `<p>Ошибка загрузки: ${error.message}</p>`
	}
}

function renderAssets(assets, category) {
	assetsContainer.innerHTML = ''

	const filtered =
		category === 'all' ? assets : assets.filter(a => a.category === category)

	if (filtered.length === 0) {
		assetsContainer.innerHTML = '<p>Ассетов пока нет.</p>'
		return
	}

	filtered.forEach(asset => {
		const card = document.createElement('article')
		card.className = 'asset-card'
		// Безопасность: проверяем, что ссылка на картинку существует, иначе ставим заглушку
		const imgUrl =
			asset.previewUrl || 'https://via.placeholder.com/300x200?text=No+Preview'

		card.innerHTML = `
            <img src="${imgUrl}" alt="${
			asset.name
		}" class="card-img" onerror="this.src='https://via.placeholder.com/300x200?text=Error'">
            <div class="card-content">
                <div class="badge">${asset.category}</div>
                <h3 class="card-title">${asset.name}</h3>
                <p class="card-author">от ${asset.author.split('@')[0]}</p>
                <div class="card-footer">
                    <a href="${
											asset.downloadUrl
										}" class="btn btn-outline" target="_blank">
                        <i class="fa-solid fa-download"></i> Скачать
                    </a>
                </div>
            </div>
        `
		assetsContainer.appendChild(card)
	})
}

// ==========================================
// 6. ФИЛЬТРАЦИЯ И ПОИСК
// ==========================================

document.querySelectorAll('.categories li').forEach(li => {
	li.addEventListener('click', () => {
		document.querySelector('.categories li.active').classList.remove('active')
		li.classList.add('active')
		const cat = li.getAttribute('data-cat')
		renderAssets(allAssets, cat)
	})
})

document.getElementById('search-input').addEventListener('input', e => {
	const term = e.target.value.toLowerCase()
	const searched = allAssets.filter(a => a.name.toLowerCase().includes(term))

	assetsContainer.innerHTML = ''
	if (searched.length === 0) {
		assetsContainer.innerHTML = '<p>Ничего не найдено</p>'
	} else {
		searched.forEach(asset => {
			const imgUrl = asset.previewUrl || 'https://via.placeholder.com/300x200'
			const card = document.createElement('article')
			card.className = 'asset-card'
			card.innerHTML = `
                <img src="${imgUrl}" class="card-img">
                <div class="card-content">
                    <h3 class="card-title">${asset.name}</h3>
                    <div class="card-footer">
                        <a href="${asset.downloadUrl}" class="btn btn-outline" target="_blank">Скачать</a>
                    </div>
                </div>
            `
			assetsContainer.appendChild(card)
		})
	}
})

// Запуск при старте
loadAssets()
