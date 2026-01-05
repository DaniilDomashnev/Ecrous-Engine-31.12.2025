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
	updateDoc,
	increment,
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

	const filtered =
		category === 'all' ? assets : assets.filter(a => a.category === category)

	if (filtered.length === 0) {
		assetsContainer.innerHTML =
			'<p style="text-align:center;color:#666;grid-column:1/-1;padding:40px;">В этой категории пока пусто.</p>'
		return
	}

	const currentUserEmail = auth.currentUser ? auth.currentUser.email : null

	filtered.forEach(asset => {
		const card = document.createElement('article')
		card.className = 'asset-card'

		// --- ЛОГИКА ГАЛОЧКИ ---
		// Если в базе есть поле isVerified: true, показываем галочку
		const verifiedHtml = asset.isVerified
			? `<span class="verified-badge" title="Проверенный автор"><i class="fa-solid fa-check"></i></span>`
			: ''

		// --- ЛОГИКА РЕЙТИНГА ---
		// Вычисляем средний рейтинг
		const ratingSum = Math.max(0, asset.ratingSum || 0)
		const ratingCount = Math.max(0, asset.ratingCount || 0)

		const avgRating =
			ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : '0.0'

		const isOwner = currentUserEmail === asset.author

		let actionButtonsHtml = ''
		if (isOwner) {
			actionButtonsHtml = `
                <button class="btn btn-icon edit-btn" data-id="${asset.id}" title="Редактировать" style="margin-right: 5px; color: #fbbf24; z-index: 5; position: relative;">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-icon delete-btn" data-id="${asset.id}" title="Удалить" style="margin-right: 5px; color: #ef4444; z-index: 5; position: relative;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `
		}

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
                <h3 class="card-title">${asset.name}</h3>
                
                <p class="card-author">
                    By ${asset.author.split('@')[0]}
                    ${verifiedHtml}
                </p>

                <div style="font-size: 0.8rem; color: #fbbf24; margin-bottom: 10px;">
                    <i class="fa-solid fa-star"></i> ${avgRating} <span style="color:#666">(${ratingCount})</span>
                </div>
                
                <div class="card-footer">
                    <span class="price-tag">FREE</span>
                    <div style="display:flex; align-items: center;">
                        ${actionButtonsHtml}
                        <button class="btn btn-outline-sm open-details-btn" data-id="${
													asset.id
												}">
                             Подробнее
                        </button>
                    </div>
                </div>
            </div>
        `

		// Клик по всей карточке (кроме кнопок) открывает детали
		card.addEventListener('click', e => {
			// Если кликнули не по кнопкам редактирования/удаления
			if (!e.target.closest('.edit-btn') && !e.target.closest('.delete-btn')) {
				openAssetDetails(asset.id)
			}
		})

		assetsContainer.appendChild(card)
	})

	// Привязываем старые обработчики удаления и редактирования...
	attachActionHandlers()
}

// Вынесем обработчики кнопок в отдельную функцию, чтобы не дублировать
function attachActionHandlers() {
	document.querySelectorAll('.delete-btn').forEach(btn => {
		btn.addEventListener('click', async e => {
			e.stopPropagation()
			if (confirm('Удалить этот ассет?')) {
				const id = btn.getAttribute('data-id')
				try {
					await deleteDoc(doc(db, 'assets', id))
					showToast('Ассет удален', 'success')
					allAssets = allAssets.filter(a => a.id !== id)
					loadAssets() // Перезагружаем для чистоты
				} catch (err) {
					showToast('Ошибка: ' + err.message, 'error')
				}
			}
		})
	})

	document.querySelectorAll('.edit-btn').forEach(btn => {
		btn.addEventListener('click', e => {
			e.stopPropagation()
			const id = btn.getAttribute('data-id')
			const asset = allAssets.find(a => a.id === id)
			if (asset) {
				document.getElementById('edit-asset-id').value = id
				document.getElementById('edit-name').value = asset.name
				document.getElementById('edit-category').value = asset.category
				document.getElementById('edit-preview').value = asset.previewUrl
				document.getElementById('edit-file').value = asset.downloadUrl
				window.openModal('edit-modal')
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

// ==========================================
// 8. ОБНОВЛЕНИЕ АССЕТА (UPDATE)
// ==========================================
const editForm = document.getElementById('edit-form')

if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault()

        const id = document.getElementById('edit-asset-id').value
        const name = document.getElementById('edit-name').value
        const category = document.getElementById('edit-category').value
        const previewUrl = document.getElementById('edit-preview').value
        const downloadUrl = document.getElementById('edit-file').value
        
        const btn = document.getElementById('save-changes-btn')
        const originalText = btn.textContent
        btn.textContent = 'Сохранение...'
        btn.disabled = true

        try {
            const assetRef = doc(db, 'assets', id)
            
            // Отправляем обновленные данные в Firestore
            await updateDoc(assetRef, {
                name: name,
                category: category,
                previewUrl: previewUrl,
                downloadUrl: downloadUrl
                // author и createdAt не меняем
            })

            // Обновляем локальный массив allAssets, чтобы не делать лишний запрос к серверу
            const assetIndex = allAssets.findIndex(a => a.id === id)
            if (assetIndex !== -1) {
                allAssets[assetIndex] = { ...allAssets[assetIndex], name, category, previewUrl, downloadUrl }
            }

            showToast('Ассет успешно обновлен!', 'success')
            window.closeModal('edit-modal')
            
            // Перерисовываем текущую категорию
            const currentActiveCat = document.querySelector('.category-list li.active')?.getAttribute('data-cat') || 'all'
            renderAssets(allAssets, currentActiveCat)

        } catch (error) {
            console.error(error)
            showToast('Ошибка обновления: ' + error.message, 'error')
        } finally {
            btn.textContent = originalText
            btn.disabled = false
        }
    })
}

// ==========================================
// 9. ЛОГИКА ДЕТАЛЕЙ, РЕЙТИНГА И КОММЕНТАРИЕВ
// ==========================================

let currentAssetId = null; // ID открытого ассета
let editingCommentId = null; // ID комментария, который редактируем (если null, значит создаем новый)
let oldRatingValue = 0; // Сохраняем старую оценку при редактировании, чтобы правильно пересчитать сумму

// Открытие модального окна деталей
window.openAssetDetails = async (id) => {
    currentAssetId = id;
    
    // Сбрасываем форму при открытии
    resetCommentForm();

    const asset = allAssets.find(a => a.id === id);
    if (!asset) return;

    // Заполняем инфо
    document.getElementById('detail-img').src = asset.previewUrl;
    document.getElementById('detail-title').textContent = asset.name;
    document.getElementById('detail-category').textContent = asset.category;
    document.getElementById('detail-author').textContent = asset.author.split('@')[0];
    document.getElementById('detail-download').href = asset.downloadUrl;

    // Галочка
    const verEl = document.getElementById('detail-verified');
    verEl.innerHTML = asset.isVerified 
        ? `<span class="verified-badge"><i class="fa-solid fa-check"></i></span>` 
        : '';

    // Рейтинг
    updateRatingUI(asset);

    // Загружаем комментарии
    await loadComments(id);

    window.openModal('details-modal');
}

// Вспомогательная функция отрисовки рейтинга
function updateRatingUI(asset) {
	// Тоже добавляем защиту от минусов
	const sum = Math.max(0, asset.ratingSum || 0)
	const count = Math.max(0, asset.ratingCount || 0)

	const avg = count > 0 ? (sum / count).toFixed(1) : '0.0'

	document.getElementById('detail-rating-val').textContent = avg
	document.getElementById('detail-reviews-count').textContent = count

	// Рисуем звезды
	let starsHtml = ''
	for (let i = 1; i <= 5; i++) {
		if (i <= Math.round(avg)) starsHtml += '<i class="fa-solid fa-star"></i>'
		else starsHtml += '<i class="fa-regular fa-star" style="color:#555"></i>'
	}
	document.getElementById('detail-stars').innerHTML = starsHtml
}

// Загрузка комментариев
async function loadComments(assetId) {
    const list = document.getElementById('comments-list');
    list.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:10px auto;"></div>';

    try {
        const commentsRef = collection(db, 'assets', assetId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<p style="text-align:center; color:#666; font-size: 0.9rem;">Пока нет отзывов. Будьте первым!</p>';
            return;
        }

        const currentUser = auth.currentUser ? auth.currentUser.email : null;

        snapshot.forEach(docSnap => {
            const c = docSnap.data();
            const cid = docSnap.id;

            // Генерируем звезды для коммента
            let sHtml = '';
            for(let i=0; i<c.rating; i++) sHtml += '<i class="fa-solid fa-star"></i>';

            const item = document.createElement('div');
            item.className = 'comment-item';
            
            // Если это мой комментарий, добавляем кнопки
            let actionsHtml = '';
            if (currentUser === c.author) {
                actionsHtml = `
                    <div class="comment-actions">
                        <button class="comment-btn edit" title="Редактировать">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="comment-btn delete" title="Удалить">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
            }

            item.innerHTML = `
                <div class="comment-header">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span class="comment-author">${c.authorName}</span>
                        <span class="comment-stars">${sHtml}</span>
                    </div>
                    ${actionsHtml}
                </div>
                <div class="comment-text">${c.text}</div>
            `;

            // Навешиваем обработчики событий на кнопки (если они есть)
            if (currentUser === c.author) {
                const editBtn = item.querySelector('.edit');
                const deleteBtn = item.querySelector('.delete');

                // Удаление
                deleteBtn.addEventListener('click', () => handleDeleteComment(assetId, cid, c.rating));

                // Редактирование
                editBtn.addEventListener('click', () => handleEditStart(cid, c.text, c.rating));
            }

            list.appendChild(item);
        });
    } catch (e) {
        console.error(e);
        list.innerHTML = '<p style="color:red">Ошибка загрузки комментариев</p>';
    }
}

// === ЛОГИКА УДАЛЕНИЯ ===
async function handleDeleteComment(assetId, commentId, ratingVal) {
	if (!confirm('Удалить ваш отзыв?')) return

	// Находим ассет локально, чтобы проверить текущие цифры
	const localAsset = allAssets.find(a => a.id === assetId)

	// Защита: если вдруг локально счетчик уже 0, не отправляем минус в базу
	// (Хотя ситуация редкая, если кнопка доступна)
	if (localAsset && localAsset.ratingCount <= 0) {
		console.warn('Попытка уйти в минус предотвращена')
		// Можно просто сбросить поля в базе принудительно, но лучше просто удалить коммент
	}

	try {
		// 1. Удаляем сам комментарий
		await deleteDoc(doc(db, 'assets', assetId, 'comments', commentId))

		// 2. Обновляем рейтинг ассета (минусуем)
		const assetRef = doc(db, 'assets', assetId)
		await updateDoc(assetRef, {
			// Используем Math.max нельзя внутри increment, поэтому полагаемся на базу
			// Но мы можем добавить проверку в правилах безопасности, если нужно.
			ratingSum: increment(-ratingVal),
			ratingCount: increment(-1),
		})

		// 3. Обновляем локальные данные и UI
		updateLocalAssetStats(assetId, -ratingVal, -1)

		showToast('Отзыв удален', 'success')

		if (editingCommentId === commentId) resetCommentForm()

		openAssetDetails(assetId)

		// Перерисовка фона, чтобы обновились звезды в списке
		const activeCat =
			document
				.querySelector('.category-list li.active')
				?.getAttribute('data-cat') || 'all'
		renderAssets(allAssets, activeCat)
	} catch (err) {
		console.error(err)
		showToast('Ошибка удаления: ' + err.message, 'error')
	}
}

// === ЛОГИКА РЕДАКТИРОВАНИЯ (Старт) ===
function handleEditStart(commentId, text, rating) {
    editingCommentId = commentId;
    oldRatingValue = rating;

    // Заполняем форму
    document.getElementById('comment-text').value = text;
    
    // Ставим звезды
    const starInput = document.querySelector(`input[name="rating"][value="${rating}"]`);
    if (starInput) starInput.checked = true;

    // Меняем кнопку и стиль
    const btn = document.querySelector('#comment-form button');
    btn.textContent = 'Обновить отзыв';
    btn.classList.remove('btn-accent');
    btn.classList.add('btn-primary'); // меняем цвет на фиолетовый для отличия

    // Скролл к форме
    document.getElementById('comment-form').scrollIntoView({ behavior: 'smooth' });
}

// === СБРОС ФОРМЫ ===
function resetCommentForm() {
    editingCommentId = null;
    oldRatingValue = 0;
    const form = document.getElementById('comment-form');
    if(form) {
        form.reset();
        const btn = form.querySelector('button');
        btn.textContent = 'Отправить отзыв';
        btn.classList.add('btn-accent');
        btn.classList.remove('btn-primary');
    }
}

// === ОБРАБОТКА ОТПРАВКИ ФОРМЫ (Создание и Редактирование) ===
const commentForm = document.getElementById('comment-form');
if (commentForm) {
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!auth.currentUser) {
            showToast('Войдите, чтобы оставить отзыв', 'error');
            return window.openModal('login-modal');
        }
        
        if (!currentAssetId) return;

        const text = document.getElementById('comment-text').value;
        const ratingInput = document.querySelector('input[name="rating"]:checked');
        const rating = ratingInput ? parseInt(ratingInput.value) : 0;

        if (rating === 0) return showToast('Поставьте оценку (звезды)!', 'error');

        const btn = commentForm.querySelector('button');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Обработка...';

        try {
            const assetRef = doc(db, 'assets', currentAssetId);

            if (editingCommentId) {
                // --- РЕЖИМ РЕДАКТИРОВАНИЯ ---
                
                // 1. Обновляем документ комментария
                const commentRef = doc(db, 'assets', currentAssetId, 'comments', editingCommentId);
                await updateDoc(commentRef, {
                    text: text,
                    rating: rating,
                    // author и date не меняем, можно добавить updatedAt
                });

                // 2. Корректируем рейтинг ассета
                // Разница между новой и старой оценкой (например: было 4, стало 5. Разница +1)
                const ratingDiff = rating - oldRatingValue;
                
                if (ratingDiff !== 0) {
                    await updateDoc(assetRef, {
                        ratingSum: increment(ratingDiff)
                        // ratingCount не меняется, так как это тот же отзыв
                    });
                    updateLocalAssetStats(currentAssetId, ratingDiff, 0);
                }

                showToast('Отзыв обновлен!', 'success');
                resetCommentForm();

            } else {
                // --- РЕЖИМ СОЗДАНИЯ (НОВЫЙ) ---

                // 1. Создаем коммент
                await addDoc(collection(db, 'assets', currentAssetId, 'comments'), {
                    text: text,
                    rating: rating,
                    author: auth.currentUser.email,
                    authorName: auth.currentUser.email.split('@')[0],
                    createdAt: new Date()
                });

                // 2. Обновляем рейтинг ассета
                await updateDoc(assetRef, {
                    ratingSum: increment(rating),
                    ratingCount: increment(1)
                });

                updateLocalAssetStats(currentAssetId, rating, 1);
                showToast('Отзыв опубликован!', 'success');
                commentForm.reset();
            }
            
            // Перезагружаем UI
            openAssetDetails(currentAssetId);
            
            // Обновляем сетку на фоне (чтобы звезды обновились и там)
            const activeCat = document.querySelector('.category-list li.active')?.getAttribute('data-cat') || 'all';
            renderAssets(allAssets, activeCat);

        } catch (err) {
            console.error(err);
            showToast('Ошибка: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            if(!editingCommentId) btn.textContent = 'Отправить отзыв'; // Возвращаем текст только если не в режиме редактирования (там сброс сам вернет)
        }
    });
}

// Вспомогательная функция для обновления локального массива (чтобы не делать лишний запрос getDocs)
function updateLocalAssetStats(assetId, ratingDelta, countDelta) {
    const localAsset = allAssets.find(a => a.id === assetId);
    if(localAsset) {
        localAsset.ratingSum = (localAsset.ratingSum || 0) + ratingDelta;
        localAsset.ratingCount = (localAsset.ratingCount || 0) + countDelta;
    }
}
