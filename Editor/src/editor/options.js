// ==========================================
// --- НАСТРОЙКИ ПРОЕКТА ---
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnProjectSettings')
    if (btn) btn.onclick = openProjectSettings

    const saveBtn = document.getElementById('btn-save-settings')
    if (saveBtn) saveBtn.onclick = saveProjectSettings

    // Обработчик загрузки файла иконки
    const iconInput = document.getElementById('set-proj-icon-input')
    if (iconInput) {
        iconInput.addEventListener('change', function (e) {
            const file = e.target.files[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = function (evt) {
                tempIconBase64 = evt.target.result
                const preview = document.getElementById('set-proj-icon-preview')
                if(preview) preview.src = tempIconBase64
            }
            reader.readAsDataURL(file)
        })
    }
})

let tempIconBase64 = null

function openProjectSettings() {
    const modal = document.getElementById('modal-project-settings')
    if (!modal) return

    // Получаем элементы
    const nameInp = document.getElementById('set-proj-name')
    const authorInp = document.getElementById('set-proj-author')
    const verInp = document.getElementById('set-proj-version')
    const sceneSel = document.getElementById('set-start-scene')
    const statusSel = document.getElementById('set-proj-status')
    const iconPrev = document.getElementById('set-proj-icon-preview')
    
    // --- НОВЫЕ ЭЛЕМЕНТЫ ---
    const orientSel = document.getElementById('set-proj-orientation')
    const pkgInp = document.getElementById('set-proj-package')
    const splashCheck = document.getElementById('set-disable-splash')

    // Инициализируем объект настроек, если его нет
    if (!projectData.settings) projectData.settings = {}

    // 1. Заполняем стандартные поля
    if (nameInp)
			nameInp.value =
				projectData.settings.name || projectData.meta?.name || 'My Game'
    if(authorInp) authorInp.value = projectData.settings.author || ''
    if(verInp) verInp.value = projectData.settings.version || '1.0'
    if(statusSel) statusSel.value = projectData.settings.status || ''

    // 2. Заполняем НОВЫЕ поля
    if (orientSel) {
        orientSel.value = projectData.settings.orientation || 'landscape'
    }
    if (pkgInp) {
        pkgInp.value = projectData.settings.packageId || 'com.ecrous.game'
    }
    if (splashCheck) {
        // Если галочка стоит = Splash отключен
        splashCheck.checked = projectData.settings.disableSplash === true
    }

    // 3. Иконка
    tempIconBase64 = projectData.settings.icon || null
    if (iconPrev) {
        if (tempIconBase64) {
            iconPrev.src = tempIconBase64
        } else {
            iconPrev.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23333'/%3E%3Cpath d='M32 20v24M20 32h24' stroke='%23555' stroke-width='4'/%3E%3C/svg%3E"
        }
    }

    // 4. Список сцен
    if (sceneSel) {
        sceneSel.innerHTML = ''
        projectData.scenes.forEach(scene => {
            const opt = document.createElement('option')
            opt.value = scene.id
            opt.innerText = scene.name
            if (projectData.settings.startSceneId === scene.id) {
                opt.selected = true
            }
            sceneSel.appendChild(opt)
        })
    }

    modal.classList.remove('hidden')
    setTimeout(() => modal.classList.add('active'), 10)
}

function saveProjectSettings() {
    // Получаем значения
    const name = document.getElementById('set-proj-name')?.value || 'New Project'
    const author = document.getElementById('set-proj-author')?.value || ''
    const version = document.getElementById('set-proj-version')?.value || '1.0'
    const startSceneId = document.getElementById('set-start-scene')?.value
    const status = document.getElementById('set-proj-status')?.value
    
    // --- НОВЫЕ ЗНАЧЕНИЯ ---
    const orientation = document.getElementById('set-proj-orientation')?.value || 'landscape'
    const packageId = document.getElementById('set-proj-package')?.value || 'com.ecrous.game'
    const disableSplash = document.getElementById('set-disable-splash')?.checked || false

    // Сохраняем в объект
    projectData.settings = {
        name,
        author,
        version,
        startSceneId,
        status,
        orientation,   // Сохраняем ориентацию
        packageId,     // Сохраняем пакет
        disableSplash, // Сохраняем состояние заставки
        icon: tempIconBase64,
    }

    // Обновляем метаданные и заголовок
    if(projectData.meta) projectData.meta.name = name
    document.title = `Ecrous Engine | ${name}`

    // Сохраняем в LocalStorage
    if(typeof saveProjectToLocal === 'function') saveProjectToLocal()
    
    closeProjectSettings()
}

function closeProjectSettings() {
    const modal = document.getElementById('modal-project-settings')
    if (modal) {
        modal.classList.remove('active')
        setTimeout(() => modal.classList.add('hidden'), 200)
    }
}

// ==========================================
// --- УПРАВЛЕНИЕ НАСТРОЙКАМИ (ИМПОРТ/ЭКСПОРТ) ---
// ==========================================

// Список ключей localStorage, которые мы считаем "настройками редактора"
const SETTINGS_KEYS = [
    'ecrous_autosave_config', // Автосохранение
    'ecrous_hotkeys',         // Горячие клавиши
    'ecrous_theme',           // Тема (если есть)
    'ecrous_editor_opts'      // Общие опции (сетка, привязка и т.д.)
];

// --- ЭКСПОРТ ---
function exportEditorSettings() {
    try {
        const exportData = {};
        
        // Собираем данные из localStorage
        SETTINGS_KEYS.forEach(key => {
            const val = localStorage.getItem(key);
            if (val) {
                try {
                    exportData[key] = JSON.parse(val);
                } catch (e) {
                    exportData[key] = val; // Если это не JSON, сохраняем как строку
                }
            }
        });

        // Добавляем мета-данные
        exportData._meta = {
            version: '1.0',
            date: new Date().toISOString(),
            type: 'ecrous_settings'
        };

        // Генерируем файл
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Скачиваем
        const a = document.createElement('a');
        a.href = url;
        a.download = `ecrous_settings_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof showNotification === 'function') showNotification('Настройки экспортированы');
    } catch (e) {
        console.error('Ошибка экспорта:', e);
        alert('Не удалось экспортировать настройки.');
    }
}

// --- ИМПОРТ ---
function importEditorSettings() {
    // Кликам по скрытому инпуту
    document.getElementById('settingsFileInput').click();
}

function handleSettingsFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);

            // Простая проверка валидности
            if (!json._meta || json._meta.type !== 'ecrous_settings') {
                if(!confirm('Этот файл не похож на файл настроек Ecrous. Всё равно продолжить?')) {
                    input.value = ''; // Сброс
                    return;
                }
            }

            // Применяем настройки
            let importedCount = 0;
            SETTINGS_KEYS.forEach(key => {
                if (json[key] !== undefined) {
                    const valToSave = typeof json[key] === 'object' ? JSON.stringify(json[key]) : json[key];
                    localStorage.setItem(key, valToSave);
                    importedCount++;
                }
            });

            input.value = ''; // Сброс инпута

            if (confirm(`Успешно импортировано настроек: ${importedCount}. Перезагрузить страницу для применения?`)) {
                window.location.reload();
            }

        } catch (err) {
            console.error(err);
            alert('Ошибка чтения файла. Убедитесь, что это корректный .json');
        }
    };
    reader.readAsText(file);
}

// --- СБРОС ---
function resetEditorSettings() {
    if (confirm('Вы уверены? Это сбросит горячие клавиши, автосохранение и тему к значениям по умолчанию.')) {
        
        // Удаляем только ключи настроек
        SETTINGS_KEYS.forEach(key => {
            localStorage.removeItem(key);
        });

        if (typeof showNotification === 'function') showNotification('Настройки сброшены');
        
        // Перезагрузка для применения дефолтных значений (которые прописаны в коде как const DEFAULT_...)
        setTimeout(() => window.location.reload(), 500);
    }
}

// ==========================================
// --- НАСТРОЙКИ РЕДАКТОРА (UI) ---
// ==========================================

// Дефолтные настройки
const DEFAULT_EDITOR_SETTINGS = {
    // Узлы
    blockScale: '1.0',
    fontFamily: "'Inter', sans-serif",
    fontSize: '13',
    // Toolbox
    toolboxScale: '1.0',
    toolboxFontSize: '13'
};

document.addEventListener('DOMContentLoaded', () => {
    const btnOpenEditorSettings = document.getElementById('btnOpenEditorSettings');
    if(btnOpenEditorSettings) btnOpenEditorSettings.onclick = openEditorSettings;

    const btnSave = document.getElementById('btn-save-editor-settings');
    if(btnSave) btnSave.onclick = saveEditorSettings;

    // Живое обновление цифр для ползунков
    setupRangeListener('set-editor-font-size-range', 'set-editor-font-size-val');
    setupRangeListener('set-toolbox-font-size-range', 'set-toolbox-font-size-val');

    // Применяем настройки сразу при старте
    applyEditorSettings();
});

function setupRangeListener(rangeId, valId) {
    const range = document.getElementById(rangeId);
    const val = document.getElementById(valId);
    if(range && val) {
        range.oninput = (e) => val.innerText = e.target.value;
    }
}

function openEditorSettings() {
    const modal = document.getElementById('modal-editor-settings');
    if (!modal) return;

    const settings = getEditorSettings();

    // Заполняем поля УЗЛОВ
    setVal('set-editor-block-scale', settings.blockScale);
    setVal('set-editor-font', settings.fontFamily);
    setVal('set-editor-font-size-range', settings.fontSize);
    setText('set-editor-font-size-val', settings.fontSize);

    // Заполняем поля TOOLBOX
    setVal('set-toolbox-scale', settings.toolboxScale);
    setVal('set-toolbox-font-size-range', settings.toolboxFontSize);
    setText('set-toolbox-font-size-val', settings.toolboxFontSize);

    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeEditorSettings() {
    const modal = document.getElementById('modal-editor-settings');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }
}

function saveEditorSettings() {
    const newSettings = {
        // Узлы
        blockScale: getVal('set-editor-block-scale'),
        fontFamily: getVal('set-editor-font'),
        fontSize: getVal('set-editor-font-size-range'),
        // Toolbox
        toolboxScale: getVal('set-toolbox-scale'),
        toolboxFontSize: getVal('set-toolbox-font-size-range')
    };

    localStorage.setItem('ecrous_editor_ui_prefs', JSON.stringify(newSettings));
    applyEditorSettings();
    
    // Обновляем связи на канвасе (так как блоки могли изменить размер)
    if(typeof updateAllConnections === 'function') {
        setTimeout(updateAllConnections, 100); 
    }

    closeEditorSettings();
    if (typeof showNotification === 'function') showNotification('Визуальные настройки сохранены');
}

// === ФУНКЦИЯ СБРОСА ===
function resetEditorUISettings() {
    if(!confirm('Сбросить внешний вид редактора к стандартным настройкам?')) return;

    // Сохраняем дефолт
    localStorage.setItem('ecrous_editor_ui_prefs', JSON.stringify(DEFAULT_EDITOR_SETTINGS));
    
    // Применяем
    applyEditorSettings();
    
    // Обновляем UI модалки (если она открыта, чтобы юзер видел изменения)
    openEditorSettings(); 
    
    if (typeof showNotification === 'function') showNotification('Настройки сброшены');
}

function getEditorSettings() {
    const raw = localStorage.getItem('ecrous_editor_ui_prefs');
    if (!raw) return DEFAULT_EDITOR_SETTINGS;
    try {
        // Объединяем с дефолтными, чтобы новые поля не ломались у старых юзеров
        return { ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(raw) };
    } catch (e) {
        return DEFAULT_EDITOR_SETTINGS;
    }
}

function applyEditorSettings() {
    const settings = getEditorSettings();
    const root = document.documentElement;

    // Применяем переменные для УЗЛОВ
    root.style.setProperty('--editor-block-scale', settings.blockScale);
    root.style.setProperty('--editor-font-family', settings.fontFamily);
    root.style.setProperty('--editor-font-size', settings.fontSize + 'px');

    // Применяем переменные для TOOLBOX
    root.style.setProperty('--toolbox-scale', settings.toolboxScale);
    root.style.setProperty('--toolbox-font-size', settings.toolboxFontSize + 'px');
}

// Вспомогательные функции
function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}
function setVal(id, val) {
    const el = document.getElementById(id);
    if(el) el.value = val;
}
function setText(id, txt) {
    const el = document.getElementById(id);
    if(el) el.innerText = txt;
}
