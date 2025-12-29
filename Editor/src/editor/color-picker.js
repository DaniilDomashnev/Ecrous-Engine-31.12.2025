// ==========================================
// --- COLOR PICKER (src/editor/color-picker.js) ---
// ==========================================

const ColorPicker = {
    isOpen: false,
    targetInput: null,
    swatchElement: null,
    
    // Состояние цвета (HSV)
    h: 0, // 0-360
    s: 0, // 0-100
    v: 100, // 0-100

    init() {
        // Создаем HTML структуру модального окна, если её нет
        if (!document.getElementById('cp-modal')) {
            const html = `
            <div id="cp-overlay" class="cp-overlay hidden">
                <div class="cp-window">
                    <div class="cp-header">
                        <span>Выбор цвета</span>
                        <div class="cp-preview" id="cp-preview-box"></div>
                    </div>
                    
                    <div class="cp-body">
                        <div class="cp-area-sb" id="cp-sb-area">
                            <div class="cp-cursor-sb" id="cp-cursor-sb"></div>
                            <canvas id="cp-canvas-sb" width="200" height="200"></canvas>
                        </div>

                        <div class="cp-area-hue" id="cp-hue-area">
                            <div class="cp-cursor-hue" id="cp-cursor-hue"></div>
                            <canvas id="cp-canvas-hue" width="200" height="200"></canvas>
                        </div>
                    </div>

                    <div class="cp-inputs">
                        <label>HEX: <input type="text" id="cp-input-hex" value="#FFFFFF"></label>
                    </div>
                    
                    <div class="cp-footer">
                        <button class="modal-btn secondary" id="cp-btn-cancel">Отмена</button>
                        <button class="modal-btn primary" id="cp-btn-ok">Применить</button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            
            // Ссылки на элементы
            this.overlay = document.getElementById('cp-overlay');
            this.canvasSB = document.getElementById('cp-canvas-sb');
            this.canvasHue = document.getElementById('cp-canvas-hue');
            this.ctxSB = this.canvasSB.getContext('2d');
            this.ctxHue = this.canvasHue.getContext('2d');
            
            // События
            document.getElementById('cp-btn-cancel').onclick = () => this.close();
            document.getElementById('cp-btn-ok').onclick = () => this.apply();
            document.getElementById('cp-input-hex').onchange = (e) => this.setFromHex(e.target.value);

            // Логика перетаскивания (Hue Ring)
            this.initDrag(document.getElementById('cp-hue-area'), (x, y, cx, cy) => {
                const angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI);
                this.h = (angle + 360) % 360;
                this.updateUI();
            });

            // Логика перетаскивания (SB Square)
            this.initDrag(document.getElementById('cp-sb-area'), (x, y, cx, cy, w, h) => {
                // x, y - координаты внутри квадрата
                this.s = Math.max(0, Math.min(100, (x / w) * 100));
                this.v = Math.max(0, Math.min(100, 100 - (y / h) * 100));
                this.updateUI();
            }, true);
        }
    },

    open(inputElement, swatchElement) {
        if (!this.overlay) this.init();
        
        this.targetInput = inputElement;
        this.swatchElement = swatchElement;
        this.setFromHex(inputElement.value || '#FFFFFF');
        
        this.overlay.classList.remove('hidden');
        this.drawHueRing();
        this.updateUI();
        this.isOpen = true;
    },

    close() {
        if(this.overlay) this.overlay.classList.add('hidden');
        this.isOpen = false;
    },

    apply() {
        const hex = this.hsvToHex(this.h, this.s, this.v);
        if (this.targetInput) {
            this.targetInput.value = hex;
            // Триггерим событие изменения, чтобы движок сохранил данные
            this.targetInput.dispatchEvent(new Event('change'));
            this.targetInput.dispatchEvent(new Event('input')); 
        }
        if (this.swatchElement) {
            this.swatchElement.style.backgroundColor = hex;
        }
        this.close();
    },

    updateUI() {
        this.drawSBBox(); // Перерисовываем квадрат с новым оттенком
        
        // Обновляем позицию курсоров
        // 1. Hue Ring
        const r = 85; // Радиус кольца
        const rad = this.h * (Math.PI / 180);
        const cx = 100, cy = 100;
        const hx = cx + Math.cos(rad) * r;
        const hy = cy + Math.sin(rad) * r;
        const curHue = document.getElementById('cp-cursor-hue');
        curHue.style.left = hx + 'px';
        curHue.style.top = hy + 'px';

        // 2. SB Square
        // Квадрат внутри холста 200x200. Пусть квадрат будет 120x120 по центру
        const sbSize = 100; // Половина ширины для отрисовки
        const offset = 50; 
        
        // Позиция внутри квадрата (0-120)
        // Но в моем CSS квадрат растянут на весь canvas. Упростим:
        // Рисуем квадрат на весь канвас для простоты
        const curSB = document.getElementById('cp-cursor-sb');
        curSB.style.left = (this.s * 2) + 'px'; // 200px ширина / 100%
        curSB.style.top = ((100 - this.v) * 2) + 'px';

        // 3. Цвет превью
        const hex = this.hsvToHex(this.h, this.s, this.v);
        document.getElementById('cp-preview-box').style.backgroundColor = hex;
        document.getElementById('cp-input-hex').value = hex;
    },

    drawHueRing() {
        const ctx = this.ctxHue;
        const w = 200, h = 200;
        const cx = w/2, cy = h/2;
        
        ctx.clearRect(0,0,w,h);
        
        for(let i=0; i<360; i++) {
            const rad = i * (Math.PI/180);
            const x = cx + Math.cos(rad) * 85;
            const y = cy + Math.sin(rad) * 85;
            
            ctx.beginPath();
            ctx.arc(cx, cy, 85, rad, rad + (Math.PI/180) * 1.5);
            ctx.strokeStyle = `hsl(${i}, 100%, 50%)`;
            ctx.lineWidth = 20;
            ctx.stroke();
        }
    },

    drawSBBox() {
        const ctx = this.ctxSB;
        const w = 200, h = 200;
        
        ctx.clearRect(0,0,w,h);
        
        // 1. Цвет оттенка
        ctx.fillStyle = `hsl(${this.h}, 100%, 50%)`;
        ctx.fillRect(0,0,w,h);
        
        // 2. Градиент белого (горизонтально)
        const grdWhite = ctx.createLinearGradient(0,0,w,0);
        grdWhite.addColorStop(0, 'rgba(255,255,255,1)');
        grdWhite.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grdWhite;
        ctx.fillRect(0,0,w,h);
        
        // 3. Градиент черного (вертикально)
        const grdBlack = ctx.createLinearGradient(0,0,0,h);
        grdBlack.addColorStop(0, 'rgba(0,0,0,0)');
        grdBlack.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = grdBlack;
        ctx.fillRect(0,0,w,h);
    },

    initDrag(element, callback, isRect = false) {
        let isDragging = false;
        const handler = (e) => {
            const rect = element.getBoundingClientRect();
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            let x = clientX - rect.left;
            let y = clientY - rect.top;
            
            if (isRect) {
                // Ограничиваем рамками
                x = Math.max(0, Math.min(rect.width, x));
                y = Math.max(0, Math.min(rect.height, y));
                callback(x, y, 0, 0, rect.width, rect.height);
            } else {
                callback(x, y, rect.width/2, rect.height/2);
            }
        };

        const start = (e) => {
            isDragging = true;
            handler(e); // Сразу применяем при клике
        };
        const move = (e) => { if (isDragging) { e.preventDefault(); handler(e); } };
        const end = () => { isDragging = false; };

        element.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
        
        element.addEventListener('touchstart', start, {passive:false});
        window.addEventListener('touchmove', move, {passive:false});
        window.addEventListener('touchend', end);
    },

    // --- Helpers ---
    setFromHex(hex) {
        // Простой парсинг HEX -> RGB -> HSV
        let r=0, g=0, b=0;
        if(hex.length === 4) {
            r = parseInt("0x"+hex[1]+hex[1]);
            g = parseInt("0x"+hex[2]+hex[2]);
            b = parseInt("0x"+hex[3]+hex[3]);
        } else if (hex.length === 7) {
            r = parseInt("0x"+hex[1]+hex[2]);
            g = parseInt("0x"+hex[3]+hex[4]);
            b = parseInt("0x"+hex[5]+hex[6]);
        }
        
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) h = 0; 
        else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        this.h = h * 360;
        this.s = s * 100;
        this.v = v * 100;
    },

    hsvToHex(h, s, v) {
        s /= 100;
        v /= 100;
        const k = (n) => (n + h / 60) % 6;
        const f = (n) => v * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
        const toHex = (x) => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`.toUpperCase();
    }
};

// Экспортируем глобально
window.ColorPicker = ColorPicker;
