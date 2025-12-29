// ==========================================
// --- ЛОГИКА ГЛАВНОГО МЕНЮ ---
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
	// --- ФУНКЦИИ ХЕЛПЕРЫ ---
	const runAction = action => {
		document
			.querySelectorAll('.menu-item')
			.forEach(m => m.classList.remove('open'))
		setTimeout(action, 10)
	}

	// --- 3. ОБЪЕКТЫ ---
	// Создать стандартный
	const btnObjCreate = document.getElementById('btnObjCreate')
	if (btnObjCreate)
		btnObjCreate.onclick = () =>
			runAction(() => {
				if (typeof addObject === 'function') addObject()
			})

	// Пустой объект
	const btnObjEmpty = document.getElementById('btnObjEmpty')
	if (btnObjEmpty)
		btnObjEmpty.onclick = () =>
			runAction(() => {
				const s = getActiveScene()
				if (s) createObjectInternal(s, 'Empty Object')
			})

	// Камера (создаем объект с пометкой Camera)
	const btnObjCamera = document.getElementById('btnObjCamera')
	if (btnObjCamera)
		btnObjCamera.onclick = () =>
			runAction(() => {
				const s = getActiveScene()
				if (s) {
					createObjectInternal(s, 'Camera')
					// Тут можно добавить логику добавления компонента камеры
					alert("Объект 'Camera' создан. Добавьте логику слежения.")
				}
			})

	// Свет (Заглушка)
	const btnObjLight = document.getElementById('btnObjLight')
	if (btnObjLight)
		btnObjLight.onclick = () =>
			runAction(() => {
				alert('Система освещения будет доступна в версии 1.1')
			})

	// --- 4. АССЕТЫ ---
	// Импорт (триггерим скрытый инпут)
	const btnAssetImport = document.getElementById('btnAssetImport')
	if (btnAssetImport)
		btnAssetImport.onclick = () =>
			runAction(() => {
				document.getElementById('assetFileInput').click()
			})

	// Очистка (Удаляем ассеты, которые не используются в скриптах)
	const btnAssetClean = document.getElementById('btnAssetClean')
	if (btnAssetClean)
		btnAssetClean.onclick = () =>
			runAction(() => {
				// Простая заглушка очистки
				if (
					confirm(
						'Удалить все ассеты? (Внимание: проверка использования пока не работает)'
					)
				) {
					projectData.assets = []
					renderAssetList()
				}
			})

	// --- 5. ЗАПУСК ---
	// Запуск
	const btnRunMenu = document.getElementById('btnRunMenu')
	if (btnRunMenu) btnRunMenu.onclick = () => runAction(runProject)

	// Стоп
	const btnStopMenu = document.getElementById('btnStopMenu')
	if (btnStopMenu) btnStopMenu.onclick = () => runAction(stopGame)

	// Пауза
	const btnPauseMenu = document.getElementById('btnPauseMenu')
	if (btnPauseMenu)
		btnPauseMenu.onclick = () =>
			runAction(() => {
				if (typeof isGamePaused !== 'undefined') {
					isGamePaused = !isGamePaused
					const status = isGamePaused ? 'ПАУЗА' : 'ИГРАЕМ'
					showNotification(`Статус игры: ${status}`)
				}
			})

	// Полноэкранный
	const btnRunFull = document.getElementById('btnRunFull')
	if (btnRunFull)
		btnRunFull.onclick = () =>
			runAction(() => {
				runProject()
				// Пытаемся развернуть фуллскрин
				const elem = document.documentElement
				if (elem.requestFullscreen) {
					elem.requestFullscreen()
				}
			})

	// --- 6. ИНСТРУМЕНТЫ ---
	// Консоль
	const btnToolConsole = document.getElementById('btnToolConsole')
	if (btnToolConsole)
		btnToolConsole.onclick = () =>
			runAction(() => {
				// Открыть консоль браузера программно нельзя, но можно показать свою
				alert(
					"Используйте F12 для системной консоли или блок 'log_print' для внутриигровой."
				)
			})

	// AI
	const btnToolAI = document.getElementById('btnToolAI')
	if (btnToolAI)
		btnToolAI.onclick = () =>
			runAction(() => {
				if (typeof TabbyAI !== 'undefined') {
					// Если есть интеграция
					alert('Запуск AI Assistant...')
				} else {
					alert('Модуль TabbyAI не подключен.')
				}
			})

	// --- 7. ОКНА (Тогглы) ---
	const toggleElement = id => {
		const el = document.querySelector(id)
		if (el) {
			if (el.style.display === 'none') el.style.display = ''
			else el.style.display = 'none'
		}
	}

	// Иерархия (Сайдбар)
	document.getElementById('winToggleHierarchy').onclick = () =>
		runAction(() => {
			toggleElement('.sidebar')
		})

	// Инструменты (Тулбокс)
	document.getElementById('winToggleToolbox').onclick = () =>
		runAction(() => {
			toggleElement('.toolbox')
		})

	// Сброс интерфейса
	document.getElementById('winResetLayout').onclick = () =>
		runAction(() => {
			document.querySelector('.sidebar').style.display = ''
			document.querySelector('.toolbox').style.display = ''
			panX = 0
			panY = 0
			zoomLevel = 1
			updateTransform()
			showNotification('Интерфейс сброшен')
		})

	// --- 8. ПОМОЩЬ ---
	document.getElementById('hlpDocs').onclick = () =>
		runAction(() => {
			window.open(
				'https://daniildomashnev.github.io/NexLang-Documentation/',
				'_blank'
			)
		})

	document.getElementById('hlpCommunity').onclick = () =>
		runAction(() => {
			window.open('https://discord.com', '_blank') // Замените на вашу ссылку
		})

	document.getElementById('hlpAbout').onclick = () =>
		runAction(() => {
			alert('Ecrous Engine v1.0 Beta\nCreated by You.')
		})
})

document.addEventListener('DOMContentLoaded', () => {
	console.log('Инициализация мобильного меню...')

	const btn = document.getElementById('btnMobileMenuToggle')
	const menu = document.getElementById('mainMenuBar')

	if (!btn) {
		console.error("ОШИБКА: Не найдена кнопка с id='btnMobileMenuToggle'")
		return
	}
	if (!menu) {
		console.error("ОШИБКА: Не найдено меню с id='mainMenuBar'")
		return
	}

	console.log('Кнопка и меню найдены. Вешаем событие.')

	btn.onclick = e => {
		e.stopPropagation() // Чтобы клик не ушел дальше
		console.log('Нажата кнопка меню')

		// Переключаем класс
		menu.classList.toggle('show-mobile')

		// Меняем иконку
		const icon = btn.querySelector('i')
		if (menu.classList.contains('show-mobile')) {
			icon.className = 'ri-close-line' // Крестик
		} else {
			icon.className = 'ri-menu-line' // Полоски
		}
	}

	// Закрытие при клике вне меню
	document.addEventListener('click', e => {
		// Если меню открыто И клик был НЕ по меню И НЕ по кнопке
		if (
			menu.classList.contains('show-mobile') &&
			!menu.contains(e.target) &&
			e.target !== btn
		) {
			menu.classList.remove('show-mobile')
			const icon = btn.querySelector('i')
			if (icon) icon.className = 'ri-menu-line'
		}
	})
})
