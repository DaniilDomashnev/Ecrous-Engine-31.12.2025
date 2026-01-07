function openAssetStore() {
	window.location.href = 'AssetStore/index.html'
}

/* =========================================
   EASTER EGG: HOLD KEYS (L+O+V+E)
   ========================================= */

const pressedKeys = new Set()
// Клавиши, которые нужно зажать одновременно
const secretCombo = ['l', 'o', 'v', 'e']

document.addEventListener('keydown', e => {
	// Игнорируем ввод в текстовые поля, чтобы не мешать печатать
	if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

	// Добавляем нажатую клавишу в набор
	pressedKeys.add(e.key.toLowerCase())

	checkEasterEgg()
})

document.addEventListener('keyup', e => {
	// Убираем клавишу из набора, когда её отпустили
	pressedKeys.delete(e.key.toLowerCase())
})

function checkEasterEgg() {
	// Проверяем, содержатся ли ВСЕ нужные клавиши в нажатых прямо сейчас
	const allPressed = secretCombo.every(key => pressedKeys.has(key))

	if (allPressed) {
		openLove()
		pressedKeys.clear() // Сброс, чтобы не открывалось повторно мгновенно
	}
}

function openLove() {
	const overlay = document.getElementById('loveOverlay')
	if (overlay) {
		overlay.style.display = 'flex'
	}
}

function closeLove() {
	const overlay = document.getElementById('loveOverlay')
	if (overlay) {
		overlay.style.display = 'none'
		pressedKeys.clear() // Очищаем нажатия при закрытии
	}
}
