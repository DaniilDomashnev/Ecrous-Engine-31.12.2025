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
// 3. УТИЛИТЫ (Toasts & Security)
// ==========================================

// Функция для очистки HTML от вредоносных скриптов (XSS защита)
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Проверка валидности URL
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container')
    if (!container) return

    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `
    container.appendChild(toast)

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards'
        setTimeout(() => toast.remove(), 300)
    }, 3000)
}

// Управление модальными окнами
window.openModal = id => {
    const modal = document.getElementById(id)
    if (modal) {
        modal.classList.add('active')
        document.body.style.overflow = 'hidden'
    }
}

window.closeModal = id => {
    const modal = document.getElementById(id)
    if (modal) {
        modal.classList.remove('active')
        document.body.style.overflow = 'auto'
    }
}

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

onAuthStateChanged(auth, user => {
    if (user) {
        authButtons.classList.add('hidden')
        userPanel.classList.remove('hidden')
        userPanel.style.display = 'flex'
        userEmailSpan.textContent = user.email
        loadAssets() // Перезагружаем, чтобы показать кнопки владельца
    } else {
        authButtons.classList.remove('hidden')
        userPanel.classList.add('hidden')
        userPanel.style.display = 'none'
        loadAssets()
    }
})

// Обработчики форм авторизации
function setupAuthForm(formId, isRegister) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const emailInput = form.querySelector('input[type="email"]');
        const passInput = form.querySelector('input[type="password"]');
        const btn = form.querySelector('button[type="submit"]');
        
        const originalText = btn.textContent;
        btn.textContent = 'Загрузка...';
        btn.disabled = true;

        try {
            if (isRegister) {
                await createUserWithEmailAndPassword(auth, emailInput.value, passInput.value);
                window.closeModal('register-modal');
                showToast('Аккаунт создан!', 'success');
            } else {
                await signInWithEmailAndPassword(auth, emailInput.value, passInput.value);
                window.closeModal('login-modal');
                showToast('Добро пожаловать!', 'success');
            }
            form.reset();
        } catch (error) {
            let msg = error.message;
            if (msg.includes('auth/wrong-password')) msg = 'Неверный пароль';
            if (msg.includes('auth/user-not-found')) msg = 'Пользователь не найден';
            if (msg.includes('auth/email-already-in-use')) msg = 'Email уже занят';
            showToast(msg, 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

setupAuthForm('register-form', true);
setupAuthForm('login-form', false);

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
        if (!auth.currentUser) return showToast('Сначала войдите в систему!', 'error')

        const name = document.getElementById('asset-name').value.trim()
        const category = document.getElementById('asset-category').value
        const previewUrl = document.getElementById('asset-preview').value.trim()
        const downloadUrl = document.getElementById('asset-file').value.trim()

        // Валидация
        if (!isValidUrl(previewUrl) || !isValidUrl(downloadUrl)) {
            return showToast('Укажите корректные ссылки (http/https)', 'error');
        }

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
                isVerified: false, // По умолчанию
                ratingSum: 0,
                ratingCount: 0
            })

            window.closeModal('upload-modal')
            window.openModal('success-modal')
            uploadForm.reset()
            loadAssets()
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
let allAssets = [] 

async function loadAssets(filterCategory = 'all') {
    if (!assetsContainer) return

    // Если мы просто переключаем фильтр и данные уже есть, не грузим с сервера заново
    // (Но при первой загрузке или обновлении allAssets будет пуст или требовать обновления)
    // В данной реализации для простоты грузим заново, чтобы всегда видеть свежие данные
    assetsContainer.innerHTML = '<div class="loader-container"><div class="spinner"></div></div>'

    try {
        const q = query(collection(db, 'assets'), orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)

        allAssets = []
        querySnapshot.forEach(doc => {
            const data = doc.data()
            data.id = doc.id
            allAssets.push(data)
        })

        // Проверяем текущий активный фильтр в UI
        const activeCat = document.querySelector('.category-list li.active')?.getAttribute('data-cat') || filterCategory;
        renderAssets(allAssets, activeCat)
    } catch (error) {
        console.error(error)
        assetsContainer.innerHTML = '<p style="text-align:center;color:#ef4444;grid-column:1/-1;">Не удалось загрузить ассеты.</p>'
    }
}

function renderAssets(assets, category) {
    assetsContainer.innerHTML = ''

    const filtered = category === 'all' ? assets : assets.filter(a => a.category === category)

    if (filtered.length === 0) {
        assetsContainer.innerHTML = '<p style="text-align:center;color:#666;grid-column:1/-1;padding:40px;">В этой категории пока пусто.</p>'
        return
    }

    const currentUserEmail = auth.currentUser ? auth.currentUser.email : null

    filtered.forEach(asset => {
        const card = document.createElement('article')
        card.className = 'asset-card'

        const verifiedHtml = asset.isVerified
            ? `<span class="verified-badge" title="Проверенный автор"><i class="fa-solid fa-check"></i></span>`
            : ''

        const ratingSum = Math.max(0, asset.ratingSum || 0)
        const ratingCount = Math.max(0, asset.ratingCount || 0)
        const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : '0.0'

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

        // Защита от XSS при выводе данных!
        const safeName = escapeHtml(asset.name);
        const safeCategory = escapeHtml(asset.category);
        const safeAuthor = escapeHtml(asset.author.split('@')[0]);
        // URL вставляем в атрибуты (src, href), там XSS сложнее, но лучше если валидация прошла при загрузке.
        const safeImg = asset.previewUrl || 'https://via.placeholder.com/300x200?text=No+Preview';

        card.innerHTML = `
            <div class="card-img-wrapper">
                <img src="${safeImg}" alt="${safeName}" class="card-img" onerror="this.src='https://via.placeholder.com/300x200?text=Error'">
            </div>
            <div class="card-body">
                <div class="card-category">${safeCategory}</div>
                <h3 class="card-title">${safeName}</h3>
                
                <p class="card-author">By ${safeAuthor} ${verifiedHtml}</p>

                <div style="font-size: 0.8rem; color: #fbbf24; margin-bottom: 10px;">
                    <i class="fa-solid fa-star"></i> ${avgRating} <span style="color:#666">(${ratingCount})</span>
                </div>
                
                <div class="card-footer">
                    <span class="price-tag">FREE</span>
                    <div style="display:flex; align-items: center;">
                        ${actionButtonsHtml}
                        <button class="btn btn-outline-sm open-details-btn" data-id="${asset.id}">Подробнее</button>
                    </div>
                </div>
            </div>
        `

        card.addEventListener('click', e => {
            if (!e.target.closest('.edit-btn') && !e.target.closest('.delete-btn')) {
                openAssetDetails(asset.id)
            }
        })

        assetsContainer.appendChild(card)
    })

    attachActionHandlers()
}

function attachActionHandlers() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
            e.stopPropagation()
            if (confirm('Удалить этот ассет? Это действие необратимо.')) {
                const id = btn.getAttribute('data-id')
                try {
                    await deleteDoc(doc(db, 'assets', id))
                    showToast('Ассет удален', 'success')
                    allAssets = allAssets.filter(a => a.id !== id)
                    
                    const activeCat = document.querySelector('.category-list li.active')?.getAttribute('data-cat') || 'all';
                    renderAssets(allAssets, activeCat)
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
document.querySelectorAll('.category-list li').forEach(li => {
    li.addEventListener('click', () => {
        document.querySelector('.category-list li.active').classList.remove('active')
        li.classList.add('active')
        const cat = li.getAttribute('data-cat')
        renderAssets(allAssets, cat)
    })
})

const searchInput = document.getElementById('search-input')
if (searchInput) {
    searchInput.addEventListener('input', e => {
        const term = e.target.value.toLowerCase()
        const searched = allAssets.filter(a => a.name.toLowerCase().includes(term))
        renderAssets(searched, 'all')
    })
}

// ==========================================
// 8. ОБНОВЛЕНИЕ АССЕТА (UPDATE)
// ==========================================
const editForm = document.getElementById('edit-form')

if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault()

        const id = document.getElementById('edit-asset-id').value
        const name = document.getElementById('edit-name').value.trim()
        const category = document.getElementById('edit-category').value
        const previewUrl = document.getElementById('edit-preview').value.trim()
        const downloadUrl = document.getElementById('edit-file').value.trim()

        if (!isValidUrl(previewUrl) || !isValidUrl(downloadUrl)) {
            return showToast('Некорректные ссылки', 'error');
        }
        
        const btn = document.getElementById('save-changes-btn')
        const originalText = btn.textContent
        btn.textContent = 'Сохранение...'
        btn.disabled = true

        try {
            const assetRef = doc(db, 'assets', id)
            await updateDoc(assetRef, {
                name, category, previewUrl, downloadUrl
            })

            const assetIndex = allAssets.findIndex(a => a.id === id)
            if (assetIndex !== -1) {
                allAssets[assetIndex] = { ...allAssets[assetIndex], name, category, previewUrl, downloadUrl }
            }

            showToast('Ассет успешно обновлен!', 'success')
            window.closeModal('edit-modal')
            
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
// 9. ЛОГИКА ДЕТАЛЕЙ И РЕЙТИНГА
// ==========================================

let currentAssetId = null;
let editingCommentId = null;
let oldRatingValue = 0;

window.openAssetDetails = async (id) => {
    currentAssetId = id;
    resetCommentForm();

    const asset = allAssets.find(a => a.id === id);
    if (!asset) return;

    document.getElementById('detail-img').src = asset.previewUrl;
    document.getElementById('detail-title').textContent = asset.name; // textContent безопасен
    document.getElementById('detail-category').textContent = asset.category;
    document.getElementById('detail-author').textContent = asset.author.split('@')[0];
    document.getElementById('detail-download').href = asset.downloadUrl;

    const verEl = document.getElementById('detail-verified');
    verEl.innerHTML = asset.isVerified 
        ? `<span class="verified-badge"><i class="fa-solid fa-check"></i></span>` 
        : '';

    updateRatingUI(asset);
    await loadComments(id);
    window.openModal('details-modal');
}

function updateRatingUI(asset) {
    const sum = Math.max(0, asset.ratingSum || 0)
    const count = Math.max(0, asset.ratingCount || 0)
    const avg = count > 0 ? (sum / count).toFixed(1) : '0.0'

    document.getElementById('detail-rating-val').textContent = avg
    document.getElementById('detail-reviews-count').textContent = count

    let starsHtml = ''
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.round(avg)) starsHtml += '<i class="fa-solid fa-star"></i>'
        else starsHtml += '<i class="fa-regular fa-star" style="color:#555"></i>'
    }
    document.getElementById('detail-stars').innerHTML = starsHtml
}

async function loadComments(assetId) {
    const list = document.getElementById('comments-list');
    list.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:10px auto;"></div>';

    try {
        const commentsRef = collection(db, 'assets', assetId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<p style="text-align:center; color:#666; font-size: 0.9rem;">Пока нет отзывов.</p>';
            return;
        }

        const currentUser = auth.currentUser ? auth.currentUser.email : null;

        snapshot.forEach(docSnap => {
            const c = docSnap.data();
            const cid = docSnap.id;

            let sHtml = '';
            for(let i=0; i<c.rating; i++) sHtml += '<i class="fa-solid fa-star"></i>';

            const item = document.createElement('div');
            item.className = 'comment-item';
            
            let actionsHtml = '';
            if (currentUser === c.author) {
                actionsHtml = `
                    <div class="comment-actions">
                        <button class="comment-btn edit" title="Редактировать"><i class="fa-solid fa-pen"></i></button>
                        <button class="comment-btn delete" title="Удалить"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
            }

            // Безопасный вывод текста комментария
            item.innerHTML = `
                <div class="comment-header">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span class="comment-author">${escapeHtml(c.authorName)}</span>
                        <span class="comment-stars">${sHtml}</span>
                    </div>
                    ${actionsHtml}
                </div>
                <div class="comment-text">${escapeHtml(c.text)}</div>
            `;

            if (currentUser === c.author) {
                item.querySelector('.delete').addEventListener('click', () => handleDeleteComment(assetId, cid, c.rating));
                item.querySelector('.edit').addEventListener('click', () => handleEditStart(cid, c.text, c.rating));
            }

            list.appendChild(item);
        });
    } catch (e) {
        console.error(e);
        list.innerHTML = '<p style="color:red">Ошибка загрузки комментариев</p>';
    }
}

async function handleDeleteComment(assetId, commentId, ratingVal) {
    if (!confirm('Удалить ваш отзыв?')) return

    try {
        await deleteDoc(doc(db, 'assets', assetId, 'comments', commentId))
        const assetRef = doc(db, 'assets', assetId)
        await updateDoc(assetRef, {
            ratingSum: increment(-ratingVal),
            ratingCount: increment(-1),
        })

        updateLocalAssetStats(assetId, -ratingVal, -1)
        showToast('Отзыв удален', 'success')
        
        if (editingCommentId === commentId) resetCommentForm()
        
        // Обновляем UI деталей и списка
        const asset = allAssets.find(a => a.id === assetId);
        if(asset) updateRatingUI(asset);
        await loadComments(assetId);

        const activeCat = document.querySelector('.category-list li.active')?.getAttribute('data-cat') || 'all'
        renderAssets(allAssets, activeCat)

    } catch (err) {
        showToast('Ошибка удаления: ' + err.message, 'error')
    }
}

function handleEditStart(commentId, text, rating) {
    editingCommentId = commentId;
    oldRatingValue = rating;
    document.getElementById('comment-text').value = text;
    
    const starInput = document.querySelector(`input[name="rating"][value="${rating}"]`);
    if (starInput) starInput.checked = true;

    const btn = document.querySelector('#comment-form button');
    btn.textContent = 'Обновить отзыв';
    btn.classList.add('btn-primary');
    document.getElementById('comment-form').scrollIntoView({ behavior: 'smooth' });
}

function resetCommentForm() {
    editingCommentId = null;
    oldRatingValue = 0;
    const form = document.getElementById('comment-form');
    if(form) {
        form.reset();
        const btn = form.querySelector('button');
        btn.textContent = 'Отправить отзыв';
        btn.classList.remove('btn-primary');
    }
}

const commentForm = document.getElementById('comment-form');
if (commentForm) {
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!auth.currentUser) {
            showToast('Войдите, чтобы оставить отзыв', 'error');
            return window.openModal('login-modal');
        }
        
        if (!currentAssetId) return;

        const text = document.getElementById('comment-text').value.trim();
        const ratingInput = document.querySelector('input[name="rating"]:checked');
        const rating = ratingInput ? parseInt(ratingInput.value) : 0;

        if (rating === 0) return showToast('Поставьте оценку (звезды)!', 'error');

        const btn = commentForm.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Обработка...';

        try {
            const assetRef = doc(db, 'assets', currentAssetId);

            if (editingCommentId) {
                const commentRef = doc(db, 'assets', currentAssetId, 'comments', editingCommentId);
                await updateDoc(commentRef, { text, rating });

                const ratingDiff = rating - oldRatingValue;
                if (ratingDiff !== 0) {
                    await updateDoc(assetRef, { ratingSum: increment(ratingDiff) });
                    updateLocalAssetStats(currentAssetId, ratingDiff, 0);
                }
                showToast('Отзыв обновлен!', 'success');
                resetCommentForm();
            } else {
                await addDoc(collection(db, 'assets', currentAssetId, 'comments'), {
                    text,
                    rating,
                    author: auth.currentUser.email,
                    authorName: auth.currentUser.email.split('@')[0],
                    createdAt: new Date()
                });
                await updateDoc(assetRef, {
                    ratingSum: increment(rating),
                    ratingCount: increment(1)
                });
                updateLocalAssetStats(currentAssetId, rating, 1);
                showToast('Отзыв опубликован!', 'success');
                commentForm.reset();
            }
            
            // Обновляем UI
            const asset = allAssets.find(a => a.id === currentAssetId);
            if(asset) updateRatingUI(asset);
            await loadComments(currentAssetId);

            const activeCat = document.querySelector('.category-list li.active')?.getAttribute('data-cat') || 'all';
            renderAssets(allAssets, activeCat);

        } catch (err) {
            console.error(err);
            showToast('Ошибка: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            if(!editingCommentId) btn.textContent = 'Отправить отзыв';
        }
    });
}

function updateLocalAssetStats(assetId, ratingDelta, countDelta) {
    const localAsset = allAssets.find(a => a.id === assetId);
    if(localAsset) {
        localAsset.ratingSum = (localAsset.ratingSum || 0) + ratingDelta;
        localAsset.ratingCount = (localAsset.ratingCount || 0) + countDelta;
    }
}

// Запуск при старте
loadAssets();
