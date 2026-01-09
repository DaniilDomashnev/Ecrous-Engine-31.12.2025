// ==========================================
// --- FORMULA EDITOR LOGIC (REFACTORED) ---
// ==========================================

const FormulaEditor = {
    targetInput: null,
    currentTab: 'math', // 'math' или 'vars'
    currentCategory: 'basic', // текущая категория математики

    // Инициализация
    init: function () {
        this.cacheDOM();
        this.bindEvents();
        this.renderKeyboard(); // Рендер по умолчанию
    },

    cacheDOM: function() {
        this.overlay = document.getElementById('formula-editor-overlay');
        this.display = document.getElementById('formula-display-input');
        this.grid = document.getElementById('fk-main-grid');
        this.varsPanel = document.getElementById('fk-vars-panel');
        this.varsList = document.getElementById('fk-vars-list');
    },

    bindEvents: function() {
        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay && !this.overlay.classList.contains('hidden')) {
                this.close();
            }
        });

        // Клик вне редактора (по затемнению) закрывает его
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.close();
            });
        }
    },

    // --- ОТКРЫТИЕ / ЗАКРЫТИЕ ---

    open: function (inputElement) {
        this.targetInput = inputElement;
        
        if (!this.overlay || !this.display) {
            console.error('Formula Editor HTML elements missing!');
            // Пытаемся переинициализировать, если DOM был обновлен
            this.init();
            if (!this.overlay) return;
        }

        // Копируем значение
        this.display.value = inputElement.value || inputElement.innerText || '';

        // Показываем
        this.overlay.classList.remove('hidden');
        setTimeout(() => this.overlay.classList.add('active'), 10);

        // Фокус и выделение
        this.display.focus();
        // Ставим курсор в конец
        const len = this.display.value.length;
        this.display.setSelectionRange(len, len);

        // Сброс на вкладку Math при открытии
        this.switchTab('math');
    },

    close: function () {
        if (!this.overlay) return;
        this.overlay.classList.remove('active');
        setTimeout(() => this.overlay.classList.add('hidden'), 300);
        this.targetInput = null;
    },

    // --- ЛОГИКА ВКЛАДОК ---

    switchTab: function(tabName) {
        this.currentTab = tabName;
        
        // Визуальное переключение кнопок табов
        // (Предполагается, что в HTML есть кнопки с onclick="FormulaEditor.switchTab('...')")
        
        if (tabName === 'math') {
            if (this.varsPanel) this.varsPanel.classList.add('hidden');
            if (this.grid) this.grid.classList.remove('hidden');
            // Показываем категории математики
            this.renderCategories('math');
            this.renderKeyboard();
        } else if (tabName === 'vars') {
            if (this.grid) this.grid.classList.add('hidden');
            if (this.varsPanel) this.varsPanel.classList.remove('hidden');
            // Показываем категории переменных
            this.renderCategories('vars');
            this.renderVarsList('all'); // Показываем все или первую категорию
        }
    },

    // Рендер кнопок категорий (верхний ряд)
    renderCategories: function(mode) {
        const catContainer = document.querySelector('.fk-row.categories');
        if (!catContainer) return;

        catContainer.innerHTML = ''; // Очистка

        let cats = [];
        if (mode === 'math') {
            cats = [
                { id: 'basic', name: 'Базовые', icon: 'ri-calculator-line' },
                { id: 'trig', name: 'Тригонометрия', icon: 'ri-function-line' },
                { id: 'logic', name: 'Логика', icon: 'ri-git-merge-line' },
                { id: 'const', name: 'Константы', icon: 'ri-hashtag' }
            ];
        } else {
            cats = [
                { id: 'game', name: 'Игра', icon: 'ri-gamepad-line' },
                { id: 'objects', name: 'Объекты', icon: 'ri-box-3-line' },
                { id: 'system', name: 'Система', icon: 'ri-settings-3-line' }
            ];
        }

        cats.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'fk-btn cat';
            if (c.id === this.currentCategory && mode === 'math') btn.classList.add('active');
            btn.innerHTML = `<i class="${c.icon}"></i> ${c.name}`;
            btn.onclick = () => {
                if (mode === 'math') {
                    this.currentCategory = c.id;
                    this.renderKeyboard();
                    // Обновляем активный класс
                    Array.from(catContainer.children).forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                } else {
                    this.renderVarsList(c.id);
                    Array.from(catContainer.children).forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
            };
            catContainer.appendChild(btn);
        });
    },

    // --- РЕНДЕР КЛАВИАТУРЫ (MATH) ---

    renderKeyboard: function() {
        if (!this.grid) return;
        this.grid.innerHTML = ''; // Полная очистка, чтобы кнопки встали правильно

        let layout = [];

        switch(this.currentCategory) {
            case 'basic':
                layout = [
                    { t:'7', c:'num' }, { t:'8', c:'num' }, { t:'9', c:'num' }, { t:'/', c:'op' }, { t:'DEL', c:'action', act:'del' },
                    { t:'4', c:'num' }, { t:'5', c:'num' }, { t:'6', c:'num' }, { t:'*', c:'op' }, { t:'C', c:'action', act:'clear' },
                    { t:'1', c:'num' }, { t:'2', c:'num' }, { t:'3', c:'num' }, { t:'-', c:'op' }, { t:'(', c:'num' },
                    { t:'0', c:'num' }, { t:'.', c:'num' }, { t:',', c:'num' }, { t:'+', c:'op' }, { t:')', c:'num' },
                    { t:'color', c:'color-picker-btn', act:'color' }, { t:'random', c:'func', val:'random(0,10)' }, { t:'^', c:'op' }, { t:'=', c:'op' }, { t:'OK', c:'done', act:'ok' }
                ];
                break;
            case 'trig':
                layout = [
                    { t:'sin', c:'func', val:'sin(' }, { t:'cos', c:'func', val:'cos(' }, { t:'tan', c:'func', val:'tan(' }, { t:'abs', c:'func', val:'abs(' }, { t:'DEL', c:'action', act:'del' },
                    { t:'asin', c:'func', val:'asin(' }, { t:'acos', c:'func', val:'acos(' }, { t:'atan', c:'func', val:'atan(' }, { t:'sqrt', c:'func', val:'sqrt(' }, { t:'(', c:'num' },
                    { t:'floor', c:'func', val:'floor(' }, { t:'ceil', c:'func', val:'ceil(' }, { t:'round', c:'func', val:'round(' }, { t:'log', c:'func', val:'log(' }, { t:')', c:'num' },
                    { t:'min', c:'func', val:'min(' }, { t:'max', c:'func', val:'max(' }, { t:'clamp', c:'func', val:'clamp(' }, { t:'lerp', c:'func', val:'lerp(' }, { t:',', c:'num' },
                    { t:'deg2rad', c:'func', val:'deg2rad(' }, { t:'rad2deg', c:'func', val:'rad2deg(' }, { t:'dist', c:'func', val:'dist(' }, { t:'pow', c:'func', val:'pow(' }, { t:'OK', c:'done', act:'ok' }
                ];
                break;
            case 'logic':
                layout = [
                    { t:'==', c:'op' }, { t:'!=', c:'op' }, { t:'>', c:'op' }, { t:'<', c:'op' }, { t:'DEL', c:'action', act:'del' },
                    { t:'>=', c:'op' }, { t:'<=', c:'op' }, { t:'&&', c:'op' }, { t:'||', c:'op' }, { t:'!', c:'op' },
                    { t:'true', c:'num' }, { t:'false', c:'num' }, { t:'if', c:'func', val:'? : ' }, { t:'null', c:'num' }, { t:'(', c:'num' },
                    { t:'contains', c:'op' }, { t:'startsWith', c:'op' }, { t:'?', c:'op' }, { t:':', c:'op' }, { t:')', c:'num' },
                    { t:'1', c:'num' }, { t:'0', c:'num' }, { t:'length', c:'func', val:'length(' }, { t:'exists', c:'func', val:'exists(' }, { t:'OK', c:'done', act:'ok' }
                ];
                break;
            case 'const':
                layout = [
                    { t:'PI', c:'num' }, { t:'E', c:'num' }, { t:'width', c:'var', val:'{width}' }, { t:'height', c:'var', val:'{height}' }, { t:'DEL', c:'action', act:'del' },
                    { t:'dt', c:'var', val:'{dt}' }, { t:'time', c:'var', val:'{time}' }, { t:'fps', c:'var', val:'{fps}' }, { t:'mouseX', c:'var', val:'{mouseX}' }, { t:'(', c:'num' },
                    { t:'Infinity', c:'num' }, { t:'NaN', c:'num' }, { t:'undefined', c:'num' }, { t:'mouseY', c:'var', val:'{mouseY}' }, { t:')', c:'num' },
                    { t:'"text"', c:'num', val:'""' }, { t:'{var}', c:'num', val:'{}' }, { t:'GRAVITY', c:'num' }, { t:'SPEED', c:'num' }, { t:'OK', c:'done', act:'ok' }
                ];
                break;
            default:
                layout = [];
        }

        // Рендерим кнопки
        layout.forEach(btnData => {
            const btn = document.createElement('button');
            btn.className = `fk-btn ${btnData.c}`;
            
            // Текст или Иконка
            if (btnData.t === 'DEL') btn.innerHTML = '<i class="ri-delete-back-2-line"></i>';
            else if (btnData.t === 'OK') btn.innerHTML = '<i class="ri-check-line"></i>';
            else if (btnData.t === 'color') btn.innerHTML = '<div class="rainbow-circle"></div>';
            else btn.innerText = btnData.t;

            // Событие клика
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (btnData.act === 'del') this.backspace();
                else if (btnData.act === 'clear') this.display.value = '';
                else if (btnData.act === 'ok') this.apply();
                else if (btnData.act === 'color') this.openColor();
                else {
                    const insertVal = btnData.val || btnData.t;
                    this.insert(insertVal);
                }
            };

            this.grid.appendChild(btn);
        });
    },

    // --- РЕНДЕР ПЕРЕМЕННЫХ (VARS) ---

    renderVarsList: function(category) {
        if (!this.varsList) return;
        this.varsList.innerHTML = '';

        const createHeader = (text) => {
            const h = document.createElement('div');
            h.className = 'fk-list-header';
            h.innerText = text;
            this.varsList.appendChild(h);
        };

        const createBtn = (name, type, color) => {
            const btn = document.createElement('button');
            btn.className = 'fk-list-item';
            
            let iconClass = 'ri-braces-line';
            if (type === 'game') iconClass = 'ri-gamepad-line';
            if (type === 'obj') iconClass = 'ri-cube-line';
            if (type === 'sys') iconClass = 'ri-settings-4-line';

            btn.innerHTML = `<i class="${iconClass}" style="color:${color}"></i> ${name}`;
            btn.onclick = () => {
                // Если это свойство объекта (с точкой), вставляем как есть, иначе в скобках
                const val = name.includes('.') ? `{${name}}` : `{${name}}`;
                this.insert(val);
                // Можно автоматически переключиться назад
                // this.switchTab('math'); 
            };
            this.varsList.appendChild(btn);
        };

        // 1. СБОР ПЕРЕМЕННЫХ (ИГРОВЫЕ)
        if (category === 'all' || category === 'game') {
            createHeader('Игровые переменные');
            let varsFound = false;

            // Если игра запущена (gameVariables из game.js)
            if (window.isRunning && typeof gameVariables !== 'undefined') {
                Object.keys(gameVariables).forEach(v => {
                    createBtn(v, 'game', '#ff9800');
                    varsFound = true;
                });
            } 
            // Если мы в редакторе (projectData из main.js)
            else if (typeof projectData !== 'undefined' && projectData.variables) {
                // Если variables массив строк
                if (Array.isArray(projectData.variables)) {
                     projectData.variables.forEach(v => {
                        createBtn(v, 'game', '#ff9800');
                        varsFound = true;
                     });
                } 
                // Если variables объект (старый формат)
                else {
                    Object.keys(projectData.variables).forEach(v => {
                        createBtn(v, 'game', '#ff9800');
                        varsFound = true;
                    });
                }
            }

            if (!varsFound) {
                const empty = document.createElement('div');
                empty.innerText = 'Нет переменных';
                empty.style.padding = '10px';
                empty.style.opacity = '0.5';
                empty.style.fontSize = '12px';
                this.varsList.appendChild(empty);
            }
        }

        // 2. ОБЪЕКТЫ (СВОЙСТВА)
        if (category === 'all' || category === 'objects') {
            createHeader('Объекты сцены');
            
            // Получаем список объектов
            let objects = [];
            
            // Если игра идет - берем из DOM или данных сцены
            if (window.isRunning && window.globalCurrentSceneData) {
                objects = window.globalCurrentSceneData.objects;
            } 
            // Если редактор - ищем активную сцену
            else if (typeof projectData !== 'undefined' && typeof activeSceneId !== 'undefined') {
                const scene = projectData.scenes.find(s => s.id === activeSceneId);
                if (scene) objects = scene.objects;
            }

            if (objects.length > 0) {
                objects.forEach(obj => {
                    // Генерируем основные свойства для каждого объекта по имени
                    if (obj.name) {
                        createBtn(`${obj.name}.x`, 'obj', '#00bcd4');
                        createBtn(`${obj.name}.y`, 'obj', '#00bcd4');
                        createBtn(`${obj.name}.width`, 'obj', '#00bcd4');
                        createBtn(`${obj.name}.height`, 'obj', '#00bcd4');
                        createBtn(`${obj.name}.angle`, 'obj', '#00bcd4');
                        // createBtn(`${obj.name}.opacity`, 'obj', '#00bcd4');
                    }
                });
            } else {
                const empty = document.createElement('div');
                empty.innerText = 'Сцена пуста';
                empty.style.padding = '10px';
                empty.style.opacity = '0.5';
                empty.style.fontSize = '12px';
                this.varsList.appendChild(empty);
            }
        }

        // 3. СИСТЕМНЫЕ
        if (category === 'all' || category === 'system') {
            createHeader('Системные');
            const sysVars = [
                'width', 'height', 'dt', 'time', 'fps', 
                'mouseX', 'mouseY', 'camera.x', 'camera.y', 'camera.zoom'
            ];
            sysVars.forEach(v => createBtn(v, 'sys', '#9c27b0'));
        }
    },

    // --- ДЕЙСТВИЯ ---

    insert: function (text) {
        if (!this.display) return;
        const start = this.display.selectionStart;
        const end = this.display.selectionEnd;
        const val = this.display.value;

        this.display.value = val.substring(0, start) + text + val.substring(end);
        
        const newPos = start + text.length;
        this.display.focus();
        this.display.setSelectionRange(newPos, newPos);
        
        // Превью в реальном времени
        this.syncToTarget();
    },

    backspace: function () {
        if (!this.display) return;
        const start = this.display.selectionStart;
        const end = this.display.selectionEnd;
        const val = this.display.value;

        if (start === end && start > 0) {
            this.display.value = val.substring(0, start - 1) + val.substring(end);
            this.display.setSelectionRange(start - 1, start - 1);
        } else {
            this.display.value = val.substring(0, start) + val.substring(end);
            this.display.setSelectionRange(start, start);
        }
        this.display.focus();
        this.syncToTarget();
    },

    openColor: function() {
        // Создаем временный input color
        const input = document.createElement('input');
        input.type = 'color';
        input.onchange = (e) => {
            this.insert(e.target.value);
        };
        input.click();
    },

    // Синхронизация с целевым полем (Preview)
    syncToTarget: function() {
        if (this.targetInput) {
            const val = this.display.value;
            if (this.targetInput.tagName === 'INPUT' || this.targetInput.tagName === 'TEXTAREA') {
                this.targetInput.value = val;
            } else {
                this.targetInput.innerText = val;
            }
            // Триггер события input для фреймворков или слушателей
            this.targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    },

    // Применить и закрыть
    apply: function () {
        this.syncToTarget();
        if (this.targetInput) {
            this.targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        this.close();
    }
};

// --- ГЛОБАЛЬНЫЙ ЗАПУСК ---

// Делаем доступным глобально
window.FormulaEditor = FormulaEditor;

// Автозапуск при загрузке
document.addEventListener('DOMContentLoaded', () => {
    FormulaEditor.init();
    
    // Глобальный делегат событий для открытия редактора
    // (Позволяет открывать редактор для кнопок, созданных динамически)
    document.body.addEventListener('click', function(e) {
        // Проверяем кнопку f(x)
        if (e.target.closest('.formula-trigger')) {
            const trigger = e.target.closest('.formula-trigger');
            // Ищем input рядом
            const parent = trigger.parentElement;
            const input = parent.querySelector('input, textarea, [contenteditable="true"]');
            if (input) {
                e.preventDefault();
                e.stopPropagation();
                FormulaEditor.open(input);
            }
        }
    });
});

// Хелпер для добавления кнопок f(x) ко всем инпутам
window.addFormulaTriggers = function() {
    // Этот код вызывается из main.js при обновлении UI блоков
    const inputs = document.querySelectorAll('input.with-formula, .block-input-wrapper input');
    
    inputs.forEach(input => {
        const wrapper = input.parentElement;
        if (!wrapper) return;
        
        // Если уже есть триггер, пропускаем
        if (wrapper.querySelector('.formula-trigger')) return;

        // Создаем кнопку
        const trigger = document.createElement('span');
        trigger.className = 'formula-trigger';
        trigger.innerText = 'fx';
        trigger.title = 'Редактор формул';
        
        // Добавляем
        if (getComputedStyle(wrapper).position === 'static') {
            wrapper.style.position = 'relative';
        }
        wrapper.appendChild(trigger);
    });
};
