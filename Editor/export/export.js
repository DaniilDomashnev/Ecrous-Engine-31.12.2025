// ==========================================
// EXPORT LOGIC (Ecrous Engine) - FIX 2.0
// ==========================================

function openExportModal() {
	const exportOverlay = document.getElementById('export-overlay')
	const menuFile = document.getElementById('menuFile')

	if (menuFile) menuFile.classList.remove('open')
	if (!exportOverlay) return

	exportOverlay.classList.remove('hidden')
	exportOverlay.classList.add('active')
}

document.addEventListener('DOMContentLoaded', () => {
	const exportOverlay = document.getElementById('export-overlay')
	const btnExport = document.getElementById('btnExport')
	const closeExport = document.getElementById('closeExport')
	const menuFile = document.getElementById('menuFile')

	// Кнопки
	const exportWinBtn = document.getElementById('exportWindows')
	const exportExeBtn = document.getElementById('exportExe')
	const exportAndroidBtn = document.getElementById('exportAndroid')
	const exportIOSBtn = document.getElementById('exportIOS')
	const exportEcrBtn = document.getElementById('exportEcr')

	btnExport.addEventListener('click', e => {
		e.stopPropagation()
		openExportModal()
	})

	if (closeExport && exportOverlay) {
		closeExport.onclick = () => {
			exportOverlay.classList.remove('active')
			setTimeout(() => exportOverlay.classList.add('hidden'), 200)
		}
	}

	// Привязка
	if (exportWinBtn)
		exportWinBtn.onclick = () => {
			const html = generateGameHTML()
			downloadFile('index.html', html, 'text/html')
		}
	if (exportExeBtn) exportExeBtn.onclick = () => exportProjectAsExe()
	if (exportAndroidBtn)
		exportAndroidBtn.onclick = () => exportMobileBundle('Android')
	if (exportIOSBtn) exportIOSBtn.onclick = () => exportMobileBundle('iOS')
	if (exportEcrBtn) exportEcrBtn.onclick = () => exportProjectAsEcr()
})

// ==========================================
// EXPORT LOGIC (Ecrous Engine) - FULL VERSION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
	const exportOverlay = document.getElementById('export-overlay')
	const btnExport = document.getElementById('btnExport')
	const closeExport = document.getElementById('closeExport')
	const menuFile = document.getElementById('menuFile')

	// Кнопки
	const exportWinBtn = document.getElementById('exportWindows')
	const exportExeBtn = document.getElementById('exportExe')
	const exportAndroidBtn = document.getElementById('exportAndroid')
	const exportIOSBtn = document.getElementById('exportIOS')
	const exportEcrBtn = document.getElementById('exportEcr')

	if (btnExport) {
		btnExport.addEventListener('click', e => {
			e.stopPropagation()
			if (menuFile) menuFile.classList.remove('open')
			if (exportOverlay) {
				exportOverlay.classList.remove('hidden')
				exportOverlay.classList.add('active')
			}
		})
	}

	if (closeExport && exportOverlay) {
		closeExport.onclick = () => {
			exportOverlay.classList.remove('active')
			setTimeout(() => exportOverlay.classList.add('hidden'), 200)
		}
	}

	// Привязка событий
	if (exportWinBtn)
		exportWinBtn.onclick = () => {
			const html = generateGameHTML()
			downloadFile('index.html', html, 'text/html')
		}
	if (exportExeBtn) exportExeBtn.onclick = () => exportProjectAsExe()
	if (exportAndroidBtn)
		exportAndroidBtn.onclick = () => exportMobileBundle('Android')
	if (exportIOSBtn) exportIOSBtn.onclick = () => exportMobileBundle('iOS')
	if (exportEcrBtn) exportEcrBtn.onclick = () => exportProjectAsEcr()
})

// ==========================================
// ГЕНЕРАЦИЯ ДВИЖКА (RUNTIME)
// ==========================================
function generateGameHTML() {
	// 1. Сохраняем перед экспортом
	if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace()

	// 2. Определяем стартовую сцену
	let startId = projectData.scenes[0].id
	if (projectData.settings && projectData.settings.startSceneId) {
		if (
			projectData.scenes.find(s => s.id === projectData.settings.startSceneId)
		) {
			startId = projectData.settings.startSceneId
		}
	}

	const buildData = {
		project: projectData,
		startSceneId: startId,
		exportedAt: new Date().toISOString(),
	}

	// 3. JS ДВИЖОК (Полная копия логики из main.js + game.js)
	const runtimeScript = `
        const PROJECT = ${JSON.stringify(buildData.project)};
        const START_SCENE_ID = "${buildData.startSceneId}";
        
        // --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
        let gameConfig = { width: 800, height: 600, scaleMode: 'fit' };
        let gameVariables = {};
        let physicsObjects = {};
        let activeKeys = {};
        let loadedSounds = {};
        let worldGravity = { x: 0, y: 0 };
        let cameraState = { x: 0, y: 0, zoom: 1, target: null, lerp: 0.1, shakeInfo: { power: 0, time: 0 } };
        
        let isRunning = false;
        let isGamePaused = false;
        let lastTime = performance.now();
        let currentSceneId = null;
        let currentSessionId = 0; 
        let activeCollisionsPair = new Set();
        let globalCurrentSceneData = null;
        let showFps = false;
        
        // Таймеры
        let updateInterval = null;
        let activeTimers = [];

        // --- УТИЛИТЫ ---
        function getAssetUrl(input) {
            if (!input) return '';
            // Проверка переменных
            if (input.startsWith('{') && input.endsWith('}')) return resolveValue(input);
            // Поиск в ассетах
            if (PROJECT.assets) {
                const asset = PROJECT.assets.find(a => a.id === input);
                if (asset) return asset.data;
            }
            return input;
        }

        function resolveValue(val) {
            if (typeof val !== 'string') return val;
            if (val.startsWith('{') && val.endsWith('}')) {
                const key = val.slice(1, -1);
                return gameVariables.hasOwnProperty(key) ? gameVariables[key] : 0;
            }
            if (!isNaN(parseFloat(val)) && isFinite(val)) return parseFloat(val);
            return val;
        }

        function resolveText(input) {
            if (typeof input !== 'string') return input;
            return input.replace(/\\{([a-zA-Z0-9_]+)\\}/g, (match, varName) => {
                return gameVariables.hasOwnProperty(varName) ? gameVariables[varName] : match;
            });
        }

        function updateDynamicText() {
            document.querySelectorAll('[data-template]').forEach(el => {
                el.innerText = resolveText(el.dataset.template);
            });
        }

        // --- ЗАПУСК ---
        window.onload = function() {
            // Splash Screen Logic
            const splash = document.getElementById('ecrous-splash');
            const startMsg = document.getElementById('splash-start-msg');
            const loader = document.getElementById('splash-loader');
            const bar = document.getElementById('splash-bar-fill');

            setTimeout(() => { bar.style.width = '100%'; }, 100);

            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                    startMsg.classList.add('visible');
                    splash.addEventListener('click', () => {
                       splash.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                       splash.style.opacity = '0';
                       splash.style.transform = 'scale(1.1)';
                       setTimeout(() => {
                           splash.style.display = 'none';
                           startGame();
                       }, 600);
                    }, { once: true });
                }, 500);
            }, 1600);
        };

        function startGame() {
            gameVariables = {};
            physicsObjects = {};
            activeKeys = {};
            worldGravity = { x: 0, y: 0 };
            activeCollisionsPair.clear();
            
            // Audio Context Unlock
            const audioUnlock = new Audio();
            audioUnlock.play().catch(e => {});

            isRunning = true;
            resizeGame();
            window.addEventListener('resize', resizeGame);
            
            // Mouse/Touch tracking
            window.addEventListener('mousemove', e => {
                const stage = document.getElementById('game-stage');
                if(stage) {
                    const rect = stage.getBoundingClientRect();
                    // Вычисляем масштаб, так как игра может быть растянута
                    const scaleX = gameConfig.width / rect.width;
                    const scaleY = gameConfig.height / rect.height;
                    window.mouseX = (e.clientX - rect.left) * scaleX;
                    window.mouseY = (e.clientY - rect.top) * scaleY;
                }
            });
            window.addEventListener('touchstart', () => window.isTouching = true);
            window.addEventListener('touchend', () => window.isTouching = false);
            
            loadScene(START_SCENE_ID);
            requestAnimationFrame(gameLoop);
        }

        function resizeGame() {
            const stage = document.getElementById('game-stage');
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            
            stage.style.width = gameConfig.width + 'px';
            stage.style.height = gameConfig.height + 'px';
            stage.style.transform = 'none';
            stage.style.position = 'absolute';
            stage.style.left = '50%';
            stage.style.top = '50%';

            let scale = 1;
            if (gameConfig.scaleMode === 'fixed') { scale = 1; } 
            else if (gameConfig.scaleMode === 'stretch') { 
                stage.style.width = winW + 'px'; 
                stage.style.height = winH + 'px'; 
                stage.style.transform = 'translate(-50%, -50%)'; 
                return; 
            }
            else {
                const scaleX = winW / gameConfig.width;
                const scaleY = winH / gameConfig.height;
                if (gameConfig.scaleMode === 'fit') scale = Math.min(scaleX, scaleY);
                else if (gameConfig.scaleMode === 'fill') scale = Math.max(scaleX, scaleY);
            }
            stage.style.transform = \`translate(-50%, -50%) scale(\${scale})\`;
        }

        // --- ЗАГРУЗКА СЦЕНЫ ---
        function loadScene(sceneId) {
            const scene = PROJECT.scenes.find(s => s.id === sceneId);
            if(!scene) return;
            
            currentSessionId++;
            currentSceneId = sceneId;
            globalCurrentSceneData = scene;

            document.getElementById('game-world').innerHTML = '';
            const ui = document.getElementById('game-ui');
            if(ui) ui.innerHTML = '';
            else createUIContainer();

            // Останавливаем звуки при смене сцены
            Object.values(loadedSounds).forEach(s => { try{s.pause(); s.currentTime=0;}catch(e){} });
            
            document.title = scene.name;

            // Очистка таймеров
            if(updateInterval) clearInterval(updateInterval);
            activeTimers.forEach(t => clearInterval(t));
            activeTimers = [];

            const allScripts = scene.objects.flatMap(o => o.scripts || []);

            // 1. Start Events
            allScripts.filter(b => b.type === 'evt_start').forEach(block => {
                if (block.disabled) return;
                const owner = scene.objects.find(o => o.scripts.some(s => s.id === block.id));
                executeChain(block, owner.scripts, owner.connections || []);
            });

            // 2. Update Loop
            const updateEvents = allScripts.filter(b => b.type === 'evt_update');
            if (updateEvents.length > 0) {
                updateInterval = setInterval(() => {
                    if (!isRunning || isGamePaused) return;
                    updateEvents.forEach(block => {
                        const owner = scene.objects.find(o => o.scripts.some(s => s.id === block.id));
                        if(owner) executeChain(block, owner.scripts, owner.connections || []);
                    });
                }, 16);
            }

            // 3. Timers
            const timerEvents = allScripts.filter(b => b.type === 'evt_timer');
            timerEvents.forEach(block => {
                const sec = parseFloat(block.values[0]) || 1;
                const t = setInterval(() => {
                    if (!isRunning || isGamePaused) return;
                    const owner = scene.objects.find(o => o.scripts.some(s => s.id === block.id));
                    if(owner) executeChain(block, owner.scripts, owner.connections || []);
                }, sec * 1000);
                activeTimers.push(t);
            });

            setupInputListeners(scene, allScripts);
        }

        function createUIContainer() {
            if(document.getElementById('game-ui')) return;
            const c = document.createElement('div'); c.id = 'game-ui';
            c.style.position = 'absolute'; c.style.top = 0; c.style.left = 0; c.style.width = '100%'; c.style.height = '100%'; c.style.pointerEvents = 'none';
            document.getElementById('game-stage').appendChild(c);
            const s = document.createElement('style'); s.innerHTML = '#game-ui > * { pointer-events: auto; }'; document.head.appendChild(s);
        }

        function setupInputListeners(scene, allScripts) {
            window.onkeydown = (e) => {
                if(!isRunning || isGamePaused) return;
                activeKeys[e.code] = true;
                const keyEvents = allScripts.filter(b => b.type === 'evt_key_press');
                keyEvents.forEach(block => {
                    if(e.code === block.values[0] || e.key === block.values[0]) {
                        const owner = scene.objects.find(o => o.scripts.some(s => s.id === block.id));
                        executeChain(block, owner.scripts, owner.connections || []);
                    }
                });
                
                // Input Key Down Variable update
                const inputVars = allScripts.filter(b => b.type === 'input_key_down');
                inputVars.forEach(block => {
                    if(e.code === block.values[0]) {
                         gameVariables[block.values[1]] = 1;
                    }
                });
            };
            window.onkeyup = (e) => {
                activeKeys[e.code] = false;
                const inputVars = allScripts.filter(b => b.type === 'input_key_down');
                inputVars.forEach(block => {
                    if(e.code === block.values[0]) {
                         gameVariables[block.values[1]] = 0;
                    }
                });
            };

            document.getElementById('game-stage').onclick = (e) => {
                if(!isRunning || isGamePaused) return;
                const targetId = e.target.id || e.target.closest('[id]')?.id;
                if (!targetId) return;
                
                const clickEvents = allScripts.filter(b => b.type === 'evt_object_click');
                const uiEvents = allScripts.filter(b => b.type === 'ui_button_onclick');
                
                [...clickEvents, ...uiEvents].forEach(block => {
                     if (targetId === block.values[0]) {
                        const owner = scene.objects.find(o => o.scripts.some(s => s.id === block.id));
                        executeChain(block, owner.scripts, owner.connections || []);
                     }
                });
            };
        }

        // --- ЛОГИЧЕСКИЙ ДВИЖОК (ПОЛНАЯ ВЕРСИЯ ИЗ MAIN.JS) ---
        async function executeChain(currentBlock, allBlocks, connections) {
            const mySession = currentSessionId;
            if (!isRunning || currentSessionId !== mySession) return;
            
            while (isGamePaused && isRunning) {
                if (currentSessionId !== mySession) return;
                await new Promise(r => setTimeout(r, 100));
            }

            if (currentBlock.disabled || currentBlock.type === 'flow_comment') {
                const next = getNextBlock(currentBlock, allBlocks, connections);
                if (next) await executeChain(next, allBlocks, connections);
                return;
            }

            let nextBlock = null;
            let skipToBlock = null;

            if (currentBlock.type === 'flow_if') {
                const valA = resolveValue(currentBlock.values[0]);
                const op = currentBlock.values[1];
                const valB = resolveValue(currentBlock.values[2]);
                let condition = false;
                const nA = parseFloat(valA), nB = parseFloat(valB);
                const isNum = !isNaN(nA) && !isNaN(nB);

                if (op === '=') condition = valA == valB;
                else if (op === '!=') condition = valA != valB;
                else if (op === '>') condition = isNum ? nA > nB : valA > valB;
                else if (op === '<') condition = isNum ? nA < nB : valA < valB;
                else if (op === '>=') condition = isNum ? nA >= nB : valA >= valB;
                else if (op === '<=') condition = isNum ? nA <= nB : valA <= valB;
                else if (op === 'contains') condition = String(valA).includes(String(valB));

                if (!condition) {
                    const elseBlock = findElseBlock(currentBlock, allBlocks, connections);
                    skipToBlock = elseBlock ? elseBlock : findClosingBlock(currentBlock, allBlocks, connections);
                }
            }
            else if (currentBlock.type === 'flow_else') {
                skipToBlock = findClosingBlock(currentBlock, allBlocks, connections);
            }
            else if (currentBlock.type === 'flow_repeat') {
                const count = parseInt(resolveValue(currentBlock.values[0])) || 1;
                const loopBodyStart = getNextBlock(currentBlock, allBlocks, connections);
                const loopEnd = findClosingBlock(currentBlock, allBlocks, connections);

                if (loopBodyStart && loopEnd) {
                    for (let i = 0; i < count; i++) {
                        if (!isRunning || currentSessionId !== mySession) return;
                        await executeSection(loopBodyStart, loopEnd, allBlocks, connections);
                    }
                    skipToBlock = loopEnd;
                }
            }

            if (!skipToBlock) await executeBlockLogic(currentBlock);

            if (skipToBlock) nextBlock = getNextBlock(skipToBlock, allBlocks, connections);
            else nextBlock = getNextBlock(currentBlock, allBlocks, connections);

            if (nextBlock && currentSessionId === mySession) {
                await executeChain(nextBlock, allBlocks, connections);
            }
        }

        function getNextBlock(block, allBlocks, connections) {
            if (connections && connections.length > 0) {
                 const conn = connections.find(c => c.from === block.id);
                 if (conn) return allBlocks.find(b => b.id === conn.to);
            }
            let candidates = allBlocks.filter(b => {
                if (b.id === block.id) return false;
                const dy = b.y - block.y;
                return dy > 0 && dy < 150 && Math.abs(b.x - block.x) < 50;
            });
            candidates.sort((a, b) => a.y - b.y);
            return candidates[0];
        }

        function findElseBlock(startBlock, allBlocks, connections) {
            let depth = 0;
            let curr = getNextBlock(startBlock, allBlocks, connections);
            let steps = 0;
            while (curr && steps < 500) {
                if (curr.type === 'flow_if' || curr.type === 'flow_repeat') depth++;
                if (curr.type === 'flow_end') depth--;
                if (depth === 0 && curr.type === 'flow_else') return curr;
                if (depth < 0) return null;
                curr = getNextBlock(curr, allBlocks, connections);
                steps++;
            }
            return null;
        }

        function findClosingBlock(startBlock, allBlocks, connections) {
            let depth = 1;
            let curr = getNextBlock(startBlock, allBlocks, connections);
            let steps = 0;
            while(curr && steps < 500) {
                if (curr.type === 'flow_if' || curr.type === 'flow_repeat') depth++;
                if (curr.type === 'flow_end') depth--;
                if (depth === 0) return curr;
                curr = getNextBlock(curr, allBlocks, connections);
                steps++;
            }
            return null;
        }

        async function executeSection(start, end, allBlocks, conns) {
            let curr = start;
            while(curr && curr.id !== end.id) {
                if (!isRunning) return;
                await executeBlockLogic(curr);
                if (curr.type === 'flow_if') {
                    // Упрощенная вложенность
                }
                curr = getNextBlock(curr, allBlocks, conns);
            }
        }

        // --- ВЫПОЛНЕНИЕ БЛОКОВ (FULL SET) ---
        function executeBlockLogic(block) {
            return new Promise(resolve => {
                if (!isRunning) return resolve();
                
                setTimeout(async () => {
                    const v = block.values;
                    const w = document.getElementById('game-world');
                    const ui = document.getElementById('game-ui');

                    switch (block.type) {
                        // --- ДВИЖЕНИЕ ---
                        case 'mov_set_pos': { const el=document.getElementById(v[0]); if(el){ el.style.left=v[1]+'px'; el.style.top=v[2]+'px'; } break; }
                        case 'mov_change_pos': { const el=document.getElementById(v[0]); if(el){ el.style.left=(parseFloat(el.style.left)||0)+parseFloat(v[1])+'px'; el.style.top=(parseFloat(el.style.top)||0)+parseFloat(v[2])+'px'; } break; }
                        case 'mov_look_at': { 
                            const me = document.getElementById(v[0]); const target = document.getElementById(v[1]);
                            if (me && target) {
                                const r1 = me.getBoundingClientRect(); const r2 = target.getBoundingClientRect();
                                const dx = (r2.left+r2.width/2) - (r1.left+r1.width/2);
                                const dy = (r2.top+r2.height/2) - (r1.top+r1.height/2);
                                const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
                                me.style.transform = \`rotate(\${deg}deg)\`;
                            }
                            break; 
                        }
                        case 'mov_pin': { const el=document.getElementById(v[0]); if(el) el.style.position = (v[1]==='1')?'fixed':'absolute'; break; }
                        case 'mov_align': { 
                            const el=document.getElementById(v[0]); 
                            if(el){
                                const GW=gameConfig.width; const GH=gameConfig.height;
                                if(v[1]==='center'){ el.style.left=(GW/2 - el.offsetWidth/2)+'px'; el.style.top=(GH/2 - el.offsetHeight/2)+'px'; }
                                else if(v[1]==='left') el.style.left='0px';
                                else if(v[1]==='right') el.style.left=(GW - el.offsetWidth)+'px';
                            } 
                            break; 
                        }

                        // --- ГРУППЫ (ADDED) ---
                        case 'grp_add': { const el=document.getElementById(v[0]); if(el) el.classList.add('grp_'+v[1]); break; }
                        case 'grp_remove': { const el=document.getElementById(v[0]); if(el) el.classList.remove('grp_'+v[1]); break; }
                        case 'grp_move': { document.querySelectorAll('.grp_'+v[0]).forEach(el=>{ el.style.left=(parseFloat(el.style.left)||0)+parseFloat(v[1])+'px'; el.style.top=(parseFloat(el.style.top)||0)+parseFloat(v[2])+'px'; }); break; }
                        case 'grp_state': { document.querySelectorAll('.grp_'+v[0]).forEach(el=>{ el.style.display=(v[1]==='hide'?'none':'block'); }); break; }
                        case 'grp_delete': { document.querySelectorAll('.grp_'+v[0]).forEach(el=>el.remove()); break; }

                        // --- ОКНО ---
                        case 'win_set_title': { document.title = resolveValue(v[0]); break; }
                        case 'win_bg_color': { document.getElementById('game-stage').style.background = v[0]; break; }
                        case 'win_bg_image': { const el=document.getElementById('game-stage'); const url=getAssetUrl(resolveValue(v[0])); el.style.backgroundImage=\`url('\${url}')\`; el.style.backgroundSize='cover'; break; }
                        case 'win_scale_mode': { gameConfig.scaleMode = v[0]; resizeGame(); break; }
                        case 'win_set_cursor': { document.getElementById('game-stage').style.cursor = v[0]; break; }
                        
                        // --- ПЕРЕМЕННЫЕ ---
                        case 'var_set': { gameVariables[v[0]] = resolveValue(v[1]); updateDynamicText(); break; }
                        case 'var_change': { gameVariables[v[0]] = (parseFloat(gameVariables[v[0]] || 0)) + parseFloat(resolveValue(v[1])); updateDynamicText(); break; }
                        case 'log_print': { console.log('[LOG]:', resolveValue(v[0])); break; }
                        case 'var_math': {
                            const val1 = parseFloat(resolveValue(v[1]))||0; const op = v[2]; const val2 = parseFloat(resolveValue(v[3]))||0;
                            let res = 0;
                            if (op === '+') res = val1 + val2; else if (op === '-') res = val1 - val2; else if (op === '*') res = val1 * val2; else if (op === '/') res = val2!==0?val1/val2:0; else if (op === '%') res = val1 % val2; else if (op === '^') res = Math.pow(val1, val2);
                            gameVariables[v[0]] = res; updateDynamicText();
                            break;
                        }
                        case 'var_random': { gameVariables[v[0]] = Math.floor(Math.random() * (parseFloat(v[2]) - parseFloat(v[1]) + 1)) + parseFloat(v[1]); break; }

                        // --- INPUT ---
                        case 'input_mouse_pos': { gameVariables[v[0]] = window.mouseX || 0; gameVariables[v[1]] = window.mouseY || 0; break; }
                        case 'input_touch': { gameVariables[v[0]] = window.isTouching ? 1 : 0; break; }

                        // --- ОБЪЕКТЫ (SHAPES ADDED) ---
                        case 'obj_create_rect_custom': { const d=document.createElement('div'); d.id=v[0]; d.style.position='absolute'; d.style.left=v[3]+'px'; d.style.top=v[4]+'px'; d.style.width=v[1]+'px'; d.style.height=v[2]+'px'; d.style.backgroundColor=v[5]; d.style.borderRadius=v[6]+'px'; w.appendChild(d); break; }
                        case 'obj_create_circle': { const d=document.createElement('div'); d.id=v[0]; d.style.position='absolute'; d.style.left=v[1]+'px'; d.style.top=v[2]+'px'; const s=parseInt(v[3])*2; d.style.width=s+'px'; d.style.height=s+'px'; d.style.backgroundColor=v[4]; d.style.borderRadius='50%'; w.appendChild(d); break; }
                        case 'obj_create_line': {
                             const d=document.createElement('div'); d.id=v[0]; d.style.position='absolute';
                             const x1=parseFloat(v[1]); const y1=parseFloat(v[2]); const x2=parseFloat(v[3]); const y2=parseFloat(v[4]);
                             const len=Math.sqrt(Math.pow(x2-x1,2)+Math.pow(y2-y1,2)); const angle=(Math.atan2(y2-y1,x2-x1)*180)/Math.PI;
                             d.style.width=len+'px'; d.style.height=v[5]+'px'; d.style.backgroundColor=v[6];
                             d.style.left=x1+'px'; d.style.top=y1+'px'; d.style.transformOrigin='0 50%'; d.style.transform=\`rotate(\${angle}deg)\`;
                             w.appendChild(d); break;
                        }
                        case 'obj_create_poly': {
                             const d=document.createElement('div'); d.id=v[0]; d.style.position='absolute';
                             const cx=parseFloat(v[1]); const cy=parseFloat(v[2]); const r=parseFloat(v[3]); const sides=parseInt(v[4]);
                             const size=r*2; d.style.width=size+'px'; d.style.height=size+'px'; d.style.left=(cx-r)+'px'; d.style.top=(cy-r)+'px';
                             d.style.backgroundColor=v[5]; let pts=[];
                             for(let i=0;i<sides;i++){ const theta=((Math.PI*2)/sides)*i-Math.PI/2; const px=50+50*Math.cos(theta); const py=50+50*Math.sin(theta); pts.push(\`\${px}% \${py}%\`); }
                             d.style.clipPath=\`polygon(\${pts.join(', ')})\`; w.appendChild(d); break;
                        }
                        case 'obj_clone': { const src=document.getElementById(v[0]); if(src){ const c=src.cloneNode(true); c.id=v[1]; w.appendChild(c); } break; }
                        case 'obj_delete': { const el=document.getElementById(v[0]); if(el) el.remove(); break; }
                        case 'obj_set_size': { const el=document.getElementById(v[0]); if(el){ el.style.width=v[1]+'px'; el.style.height=v[2]+'px'; } break; }
                        case 'obj_set_rotate': { const el=document.getElementById(v[0]); if(el) el.style.transform=\`rotate(\${v[1]}deg)\`; break; }
                        case 'obj_set_color': { const el=document.getElementById(v[0]); if(el) el.style.backgroundColor=v[1]; break; }
                        case 'obj_set_texture': { const el=document.getElementById(v[0]); if(el){ const url=getAssetUrl(resolveValue(v[1])); el.style.backgroundImage=\`url('\${url}')\`; el.style.backgroundSize='cover'; el.style.backgroundPosition='center'; el.style.backgroundRepeat='no-repeat'; } break; }
                        case 'obj_get_pos': { const el=document.getElementById(v[0]); if(el){ gameVariables[v[1]]=parseFloat(el.style.left)||0; gameVariables[v[2]]=parseFloat(el.style.top)||0; } break; }
                        case 'obj_set_zindex': { const el=document.getElementById(v[0]); if(el) el.style.zIndex=v[1]; break; }
                        case 'obj_set_shadow': { const el=document.getElementById(v[0]); if(el) el.style.boxShadow=\`5px 5px \${v[2]}px \${v[1]}\`; break; }
                        case 'obj_set_blur': { const el=document.getElementById(v[0]); if(el) el.style.filter=\`blur(\${v[1]}px)\`; break; }

                        // --- ТЕКСТ (FONTS ADDED) ---
                        case 'txt_create': { if(document.getElementById(v[0])) break; const d=document.createElement('div'); d.id=v[0]; d.style.position='absolute'; d.style.left=v[1]+'px'; d.style.top=v[2]+'px'; d.dataset.template=v[3]; d.innerText=resolveText(v[3]); d.style.fontSize=v[4]+'px'; d.style.color=v[5]; w.appendChild(d); break; }
                        case 'txt_modify': { 
                            const t=document.getElementById(v[0]); if(!t) break;
                            if(v[1]==='add') t.innerText += resolveText(v[2]);
                            else if(v[1]==='replace') { t.dataset.template=v[2]; t.innerText=resolveText(v[2]); }
                            else if(v[1]==='number') { const m=t.innerText.match(/-?\\d+/); if(m){ const n=parseInt(m[0])+Number(resolveText(v[2])); t.innerText=t.innerText.replace(m[0], n); } }
                            break; 
                        }
                        case 'txt_load_font': {
                            const fontName=v[0]; const fontUrl=getAssetUrl(resolveValue(v[1]));
                            if(!document.getElementById('font-style-'+fontName)){
                                const s=document.createElement('style'); s.id='font-style-'+fontName;
                                s.innerHTML=\`@font-face { font-family: '\${fontName}'; src: url('\${fontUrl}'); }\`;
                                document.head.appendChild(s);
                            }
                            break;
                        }
                        case 'txt_set_font': { const t=document.getElementById(v[0]); if(t) t.style.fontFamily=v[1]; break; }
                        
                        // --- АНИМАЦИЯ (ADDED) ---
                        case 'anim_move_to': { const el=document.getElementById(v[0]); if(el){ el.style.transition=\`all \${v[3]}s ease-in-out\`; el.offsetHeight; el.style.left=v[1]+'px'; el.style.top=v[2]+'px'; } break; }
                        case 'anim_rotate_to': { const el=document.getElementById(v[0]); if(el){ el.style.transition=\`transform \${v[2]}s ease-in-out\`; el.style.transform=\`rotate(\${v[1]}deg)\`; } break; }
                        case 'anim_scale_to': { const el=document.getElementById(v[0]); if(el){ el.style.transition=\`transform \${v[3]}s ease-in-out\`; el.style.transform=\`scale(\${v[1]}, \${v[2]})\`; } break; }
                        case 'anim_fade': { const el=document.getElementById(v[0]); if(el){ el.style.transition=\`opacity \${v[2]}s ease-in-out\`; el.style.opacity=v[1]; } break; }
                        case 'anim_stop': { const el=document.getElementById(v[0]); if(el){ const s=window.getComputedStyle(el); el.style.left=s.left; el.style.top=s.top; el.style.transform=s.transform; el.style.opacity=s.opacity; el.style.transition='none'; } break; }
                        
                        // --- ЗВУК (ADDED) ---
                        case 'snd_load': { 
                            const id=v[0]; const src=getAssetUrl(resolveValue(v[1]));
                            if(id && src) {
                                const audio = new Audio(src); audio.preload='auto'; loadedSounds[id]=audio;
                                let resolved = false;
                                const finish = () => { if(!resolved){ resolved=true; resolve(); } };
                                audio.oncanplaythrough = finish;
                                audio.onerror = finish;
                                setTimeout(finish, 2000); // Timeout
                                return; // Wait for event
                            }
                            break; 
                        }
                        case 'snd_play': { const s=loadedSounds[v[0]]; if(s){ s.currentTime=0; s.play().catch(e=>{}); } break; }
                        case 'snd_stop': { const s=loadedSounds[v[0]]; if(s){ s.pause(); s.currentTime=0; } break; }
                        case 'snd_loop': { const s=loadedSounds[v[0]]; if(s) s.loop=(v[1]==='1'||v[1]==='true'); break; }
                        case 'snd_stop_all': { Object.values(loadedSounds).forEach(s=>{s.pause(); s.currentTime=0;}); break; }
                        
                        // --- UI (ADDED) ---
                        case 'ui_panel': { if(document.getElementById(v[0])) break; const p=document.createElement('div'); p.id=v[0]; p.className='ui-element'; p.style.left=v[1]+'px'; p.style.top=v[2]+'px'; p.style.width=v[3]+'px'; p.style.height=v[4]+'px'; p.style.backgroundColor=v[5]; p.style.borderRadius='12px'; ui.appendChild(p); break; }
                        case 'ui_button_create': { if(document.getElementById(v[0])) break; const b=document.createElement('button'); b.id=v[0]; b.className='ui-element ui-btn'; b.innerText=v[1]; b.style.left=v[2]+'px'; b.style.top=v[3]+'px'; b.style.width=v[4]+'px'; b.style.height=v[5]+'px'; b.style.fontSize=parseInt(v[5])*0.4+'px'; ui.appendChild(b); break; }
                        case 'ui_progressbar': { 
                            let bar=document.getElementById(v[0]); let val=parseFloat(resolveText(v[1])); if(val>100)val=100; if(val<0)val=0;
                            if(!bar) { bar=document.createElement('div'); bar.id=v[0]; bar.className='ui-element ui-progress-bg'; bar.style.left=v[2]+'px'; bar.style.top=v[3]+'px'; bar.style.width=v[4]+'px'; bar.style.height=v[5]+'px'; const fill=document.createElement('div'); fill.className='ui-progress-fill'; fill.style.width=val+'%'; bar.appendChild(fill); ui.appendChild(bar); }
                            else { bar.querySelector('.ui-progress-fill').style.width=val+'%'; }
                            break; 
                        }
                        case 'ui_slider': {
                             if(document.getElementById(v[0])) break; const s=document.createElement('input'); s.type='range'; s.id=v[0]; s.className='ui-element ui-slider';
                             const vName=v[1]; s.min=v[2]; s.max=v[3]; s.style.left=v[4]+'px'; s.style.top=v[5]+'px'; s.style.width='150px';
                             s.oninput=(e)=>{ gameVariables[vName]=e.target.value; updateDynamicText(); }; ui.appendChild(s); break;
                        }
                        case 'ui_toggle': { const el=document.getElementById(v[0]); if(el) { if(v[1]==='show') el.style.display='block'; else if(v[1]==='hide') el.style.display='none'; else el.style.display = (el.style.display==='none' ? 'block' : 'none'); } break; }

                        // --- СЦЕНЫ ---
                        case 'scene_load': { const next = PROJECT.scenes.find(s=>s.name===v[0]); if(next) loadScene(next.id); break; }
                        case 'scene_reload': { loadScene(currentSceneId); break; }
                        
                        // --- ДАННЫЕ (LocalStorage) ---
                        case 'data_save': { localStorage.setItem('ecrous_data_'+PROJECT.settings.name+'_'+v[0], resolveValue(v[1])); break; }
                        case 'data_load': { const val=localStorage.getItem('ecrous_data_'+PROJECT.settings.name+'_'+v[0]); if(val!==null){ gameVariables[v[1]]=isNaN(val)?val:parseFloat(val); updateDynamicText(); } break; }
                        
                        // --- ФИЗИКА ---
                        case 'phys_enable': { const el=document.getElementById(v[0]); if(el) physicsObjects[v[0]]={ vx:0, vy:0, mass:parseFloat(v[1]), bounce:0, collideWorld:false, width:el.offsetWidth, height:el.offsetHeight }; break; }
                        case 'phys_set_gravity': { worldGravity.x=parseFloat(v[0]); worldGravity.y=parseFloat(v[1]); break; }
                        case 'phys_add_force': { const p=physicsObjects[v[0]]; if(p&&p.mass>0){p.vx+=parseFloat(v[1]); p.vy+=parseFloat(v[2]);} break; }
                        case 'phys_collide_world': { const p=physicsObjects[v[0]]; if(p) p.collideWorld=(v[1]==='1'); break; }
                        
                        // --- КАМЕРА ---
                        case 'cam_follow': { cameraState.target=v[0]; cameraState.lerp=parseFloat(v[1]); break; }
                        case 'cam_zoom': { cameraState.zoom=parseFloat(v[0]); break; }
                        case 'cam_shake': { cameraState.shakeInfo={ power:parseFloat(v[0]), time:parseFloat(v[1]) }; break; }
                        case 'cam_zoom_to': { const w=document.getElementById('game-world'); if(w){ w.style.transition=\`transform \${v[1]}s ease-in-out\`; cameraState.zoom=parseFloat(v[0]); } break; }

                        // --- JS EXEC ---
                        case 'sys_exec_js': { 
                            try { const func=new Function('gameVariables','container','window','document', v[0]); func(gameVariables, document.getElementById('game-stage'), window, document); updateDynamicText(); } 
                            catch(e){ console.error(e); } 
                            break; 
                        }
                        
                        // --- WAIT (Требует async/await) ---
                        case 'evt_wait': { await new Promise(r => setTimeout(r, parseFloat(v[0]) * 1000)); break; }
                    }
                    resolve();
                }, 10);
            });
        }

        // --- GAME LOOP & PHYSICS ---
        function gameLoop() {
            if (!isRunning) return;
            const now = performance.now();
            const dt = Math.min((now - lastTime) / 1000, 0.05);
            lastTime = now;
            if(!isGamePaused) {
                updatePhysics(dt);
                updateCamera(dt);
            }
            requestAnimationFrame(gameLoop);
        }

        function updatePhysics(dt) {
            const ids = Object.keys(physicsObjects);
            if(ids.length === 0) return;
            const objects = ids.map(id => {
                const el = document.getElementById(id); if(!el) return null;
                const phys = physicsObjects[id];
                return { id, el, phys, x: parseFloat(el.style.left)||0, y: parseFloat(el.style.top)||0, w: phys.width, h: phys.height, isStatic: phys.mass===0 };
            }).filter(o=>o);

            objects.forEach(obj => {
                if(obj.isStatic) return;
                const p = obj.phys;
                p.vx += worldGravity.x; p.vy += worldGravity.y;
                p.vx *= 0.90; p.vy *= 0.99;
                if(Math.abs(p.vx)<0.1) p.vx=0; if(Math.abs(p.vy)<0.1) p.vy=0;
                
                obj.x += p.vx;
                if(checkCollisions(obj, objects)) { obj.x -= p.vx; p.vx = 0; }
                obj.y += p.vy;
                if(checkCollisions(obj, objects)) { obj.y -= p.vy; p.vy = 0; }

                if(p.collideWorld) {
                    const GW = gameConfig.width; const GH = gameConfig.height;
                    if(obj.x<0){obj.x=0; p.vx=0;}
                    if(obj.x+obj.w>GW){obj.x=GW-obj.w; p.vx=0;}
                    if(obj.y<0){obj.y=0; p.vy=0;}
                    if(obj.y+obj.h>GH){ obj.y=GH-obj.h; p.vy=0; }
                }
                obj.el.style.left = obj.x+'px'; obj.el.style.top = obj.y+'px';
            });

            const currentFrameCollisions = new Set();
            for (let i = 0; i < objects.length; i++) {
                for (let j = i + 1; j < objects.length; j++) {
                    const a = objects[i]; const b = objects[j];
                    if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
                        const pairId = [a.id, b.id].sort().join(':');
                        currentFrameCollisions.add(pairId);
                        if (!activeCollisionsPair.has(pairId)) triggerCollisionEvent(a.id, b.id);
                    }
                }
            }
            activeCollisionsPair = currentFrameCollisions;
        }

        function checkCollisions(me, all) {
            for(let o of all) {
                if(me.id===o.id) continue;
                if(me.x < o.x + o.w && me.x + me.w > o.x && me.y < o.y + o.h && me.y + me.h > o.y) { if(o.isStatic) return true; }
            }
            return false;
        }

        function triggerCollisionEvent(id1, id2) {
            if (!globalCurrentSceneData) return;
            const objectsData = globalCurrentSceneData.objects;
            objectsData.forEach(obj => {
                if (!obj.scripts) return;
                if (obj.id === id1 || obj.id === id2) {
                    obj.scripts.filter(b => b.type === 'evt_collision').forEach(evt => {
                        const targetName = evt.values[1];
                        const otherId = obj.id === id1 ? id2 : id1;
                        const otherObjDef = objectsData.find(o => o.id === otherId);
                        const isMatch = !targetName || (otherObjDef && otherObjDef.name === targetName) || targetName === otherId;
                        if (isMatch) executeChain(evt, obj.scripts, obj.connections||[]);
                    });
                }
            });
        }

        function updateCamera(dt) {
            const world = document.getElementById('game-world');
            if (cameraState.target) {
                const t = document.getElementById(cameraState.target);
                if (t) {
                    const winW = gameConfig.width; const winH = gameConfig.height; 
                    const tX = parseFloat(t.style.left) + t.offsetWidth / 2;
                    const tY = parseFloat(t.style.top) + t.offsetHeight / 2;
                    const camX = tX - winW / 2 / cameraState.zoom;
                    const camY = tY - winH / 2 / cameraState.zoom;
                    cameraState.x += (camX - cameraState.x) * cameraState.lerp;
                    cameraState.y += (camY - cameraState.y) * cameraState.lerp;
                }
            }
            let sx=0, sy=0;
            if(cameraState.shakeInfo.time>0){
                cameraState.shakeInfo.time-=dt;
                sx=(Math.random()-0.5)*cameraState.shakeInfo.power;
                sy=(Math.random()-0.5)*cameraState.shakeInfo.power;
            }
            if(world) { world.style.transformOrigin = 'top left'; world.style.transform = \`scale(\${cameraState.zoom}) translate(\${-cameraState.x+sx}px, \${-cameraState.y+sy}px)\`; }
        }
    `

	// 4. HTML
	return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>${projectData.settings?.name || 'Ecrous Game'}</title>
    <style>
        :root { --accent: #2979FF; --dark: #0a0a0a; }
        body { 
            margin: 0; background: #000; overflow: hidden; 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            user-select: none; touch-action: none;
            height: 100vh; display: flex; align-items: center; justify-content: center;
        }
        #game-container { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        #game-stage { 
            width: 800px; height: 600px; background: #1a1a1a; overflow: hidden; position: absolute; 
            box-shadow: 0 0 100px rgba(0,0,0,0.8); 
        }
        #game-world { width: 100%; height: 100%; position: absolute; transform-origin: 0 0; will-change: transform; }
        
        .ui-element { position: absolute; box-sizing: border-box; pointer-events: auto; }
        .ui-btn { border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 600; background: var(--accent); color: white; transition: 0.1s; }
        .ui-btn:active { transform: scale(0.95); opacity: 0.9; }
        .ui-progress-bg { background: rgba(0,0,0,0.5); border-radius: 10px; overflow: hidden; border: 2px solid rgba(255,255,255,0.1); }
        .ui-progress-fill { height: 100%; background: #00E676; width: 50%; transition: width 0.2s; }
        .ui-slider { -webkit-appearance: none; height: 6px; background: #444; border-radius: 3px; outline: none; }
        .ui-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; background: #2979FF; border-radius: 50%; cursor: pointer; }

        /* SPLASH */
        #ecrous-splash {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: radial-gradient(circle at center, #1e1e24 0%, #000000 100%);
            z-index: 10000;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: white; cursor: pointer;
        }
        .splash-content { display: flex; flex-direction: column; align-items: center; animation: slideUp 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .logo-box {
            width: 90px; height: 90px;
            background: linear-gradient(135deg, #2979FF, #00B0FF);
            border-radius: 20px;
            display: flex; align-items: center; justify-content: center;
            font-size: 55px; font-weight: 900; color: white;
            box-shadow: 0 20px 60px rgba(41, 121, 255, 0.3);
            margin-bottom: 25px; position: relative;
            animation: pulse 3s infinite ease-in-out;
        }
        .logo-box::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 20px; border: 2px solid rgba(255,255,255,0.2); }
        .title-main { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; background: linear-gradient(to right, #fff, #888); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 5px; }
        .title-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 4px; color: #555; font-weight: 600; }
        
        #splash-loader { width: 200px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 60px; overflow: hidden; transition: opacity 0.5s; }
        #splash-bar-fill { width: 0%; height: 100%; background: #2979FF; transition: width 1.5s cubic-bezier(0.2, 0.8, 0.2, 1); }
        #splash-start-msg { margin-top: 60px; font-size: 13px; color: #888; letter-spacing: 1px; opacity: 0; transform: translateY(10px); transition: all 0.5s; display: none; }
        #splash-start-msg.visible { display: block; opacity: 1; transform: translateY(0); animation: blink 2s infinite; }

        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); box-shadow: 0 20px 60px rgba(41, 121, 255, 0.3); } 50% { transform: scale(1.05); box-shadow: 0 30px 80px rgba(41, 121, 255, 0.5); } }
        @keyframes blink { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
    </style>
</head>
<body>
    <div id="ecrous-splash">
        <div class="splash-content">
            <div class="logo-box">E</div>
            <div class="title-main">Ecrous Engine</div>
            <div class="title-sub">Powered by You</div>
        </div>
        <div id="splash-loader"><div id="splash-bar-fill"></div></div>
        <div id="splash-start-msg">НАЖМИТЕ, ЧТОБЫ НАЧАТЬ</div>
    </div>

    <div id="game-container"><div id="game-stage"><div id="game-world"></div></div></div>
    <script>${runtimeScript}<\/script>
</body>
</html>`
}

async function exportMobileBundle(platform) {
	if (typeof JSZip === 'undefined') {
		alert('Ошибка: Библиотека JSZip не подключена. Экспорт в ZIP невозможен.')
		return
	}
	const btn = document.getElementById(
		platform === 'iOS' ? 'exportIOS' : 'exportAndroid'
	)
	const oldText = btn.innerHTML
	btn.innerHTML = 'Сборка...'

	const zip = new JSZip()
	const html = generateGameHTML()

	const manifest = {
		name: projectData.settings?.name || 'Game',
		short_name: 'Game',
		start_url: './index.html',
		display: 'standalone',
		orientation: 'landscape',
		background_color: '#000000',
		theme_color: '#000000',
		icons: [{ src: 'icon.png', sizes: '512x512', type: 'image/png' }],
	}

	zip.file('index.html', html)
	zip.file('manifest.json', JSON.stringify(manifest))

	const cvs = document.createElement('canvas')
	cvs.width = 512
	cvs.height = 512
	const ctx = cvs.getContext('2d')
	ctx.fillStyle = '#2979FF'
	ctx.fillRect(0, 0, 512, 512)
	ctx.fillStyle = 'white'
	ctx.font = '100px sans-serif'
	ctx.textAlign = 'center'
	ctx.fillText('GAME', 256, 280)
	const iconBlob = await new Promise(r => cvs.toBlob(r))
	zip.file('icon.png', iconBlob)

	zip.generateAsync({ type: 'blob' }).then(content => {
		downloadFile(`Game_${platform}.zip`, content, 'application/zip')
		btn.innerHTML = oldText
	})
}

function exportProjectAsEcr() {
	if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace()
	const dataStr = JSON.stringify(projectData, null, 2)
	const fileName = (projectData.settings?.name || 'MyGame').replace(/\s+/g, '_')
	downloadFile(`${fileName}.ecr`, dataStr, 'application/json')
}

function exportProjectAsExe() {
	alert(
		'Экспорт в EXE требует внешнего упаковщика (например, Electron). Сейчас будет скачан HTML билд.'
	)
	const html = generateGameHTML()
	downloadFile('index.html', html, 'text/html')
}

function downloadFile(filename, content, mimeType) {
	const blob = new Blob([content], { type: mimeType })
	const a = document.createElement('a')
	a.href = URL.createObjectURL(blob)
	a.download = filename
	a.click()
}

async function exportMobileBundle(platform) {
	if (typeof JSZip === 'undefined') {
		alert('Ошибка: Библиотека JSZip не подключена. Экспорт в ZIP невозможен.')
		return
	}
	const btn = document.getElementById(
		platform === 'iOS' ? 'exportIOS' : 'exportAndroid'
	)
	const oldText = btn.innerHTML
	btn.innerHTML = 'Сборка...'

	const zip = new JSZip()
	const html = generateGameHTML()

	const manifest = {
		name: projectData.settings?.name || 'Game',
		short_name: 'Game',
		start_url: './index.html',
		display: 'standalone',
		orientation: 'landscape',
		background_color: '#000000',
		theme_color: '#000000',
		icons: [{ src: 'icon.png', sizes: '512x512', type: 'image/png' }],
	}

	zip.file('index.html', html)

	if (projectData.assets) {
		for (const asset of projectData.assets) {
			if (asset.data.startsWith('data:')) {
				// Декодируем base64
				const [, base64] = asset.data.split('base64,')
				const binary = atob(base64) // Base64 → строка binary
				const array = new Uint8Array(binary.length)
				for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
				const blob = new Blob([array], { type: asset.type })

				// Добавляем в ZIP как файл (имя = asset.name)
				zip.file(`assets/${asset.name}`, blob)
			}
		}
	}
    
	zip.file('manifest.json', JSON.stringify(manifest))

	const cvs = document.createElement('canvas')
	cvs.width = 512
	cvs.height = 512
	const ctx = cvs.getContext('2d')
	ctx.fillStyle = '#2979FF'
	ctx.fillRect(0, 0, 512, 512)
	ctx.fillStyle = 'white'
	ctx.font = '100px sans-serif'
	ctx.textAlign = 'center'
	ctx.fillText('GAME', 256, 280)
	const iconBlob = await new Promise(r => cvs.toBlob(r))
	zip.file('icon.png', iconBlob)

	zip.generateAsync({ type: 'blob' }).then(content => {
		downloadFile(`Game_${platform}.zip`, content, 'application/zip')
		btn.innerHTML = oldText
	})
}

function exportProjectAsEcr() {
	if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace()
	const dataStr = JSON.stringify(projectData, null, 2)
	const fileName = (projectData.settings?.name || 'MyGame').replace(/\s+/g, '_')
	downloadFile(`${fileName}.ecr`, dataStr, 'application/json')
}

function exportProjectAsExe() {
	alert(
		'Экспорт в EXE требует внешнего упаковщика (например, Electron). Сейчас будет скачан HTML билд.'
	)
	const html = generateGameHTML()
	downloadFile('index.html', html, 'text/html')
}

function downloadFile(filename, content, mimeType) {
	const blob = new Blob([content], { type: mimeType })
	const a = document.createElement('a')
	a.href = URL.createObjectURL(blob)
	a.download = filename
	a.click()
}
