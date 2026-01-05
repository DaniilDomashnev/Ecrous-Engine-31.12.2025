// ==========================================
// EXPORT LOGIC (Ecrous Engine) - FIX
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

	const exportWinBtn = document.getElementById('exportWindows') // Web Build
	const exportExeBtn = document.getElementById('exportExe')
	const exportAndroidBtn = document.getElementById('exportAndroid')
	const exportIOSBtn = document.getElementById('exportIOS')
	const exportEcrBtn = document.getElementById('exportEcr')

	if (btnExport) {
		btnExport.addEventListener('click', e => {
			e.stopPropagation()
			if (menuFile) menuFile.classList.remove('open')
			openExportModal()
		})
	}

	if (closeExport && exportOverlay) {
		closeExport.onclick = () => {
			exportOverlay.classList.remove('active')
			setTimeout(() => exportOverlay.classList.add('hidden'), 200)
		}
	}

	// --- HTML EXPORT ---
	if (exportWinBtn)
		exportWinBtn.onclick = async () => {
			try {
				const btn = exportWinBtn
				const oldText = btn.innerHTML
				btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i>'
				const html = await generateGameHTML()
				downloadFile('index.html', html, 'text/html')
				btn.innerHTML = oldText
			} catch (err) {
				alert('Ошибка экспорта: ' + err.message)
				console.error(err)
				exportWinBtn.innerHTML = 'Ошибка'
			}
		}

	// --- EXE (Placeholder) ---
	if (exportExeBtn) exportExeBtn.onclick = () => exportProjectAsExe()

	// --- ANDROID (ZIP Bundle) ---
	if (exportAndroidBtn)
		exportAndroidBtn.onclick = async () => {
			try {
				await exportMobileBundle('Android')
			} catch (err) {
				alert('Ошибка Android экспорта: ' + err.message)
			}
		}

	// --- iOS (ZIP Bundle) ---
	if (exportIOSBtn)
		exportIOSBtn.onclick = async () => {
			try {
				await exportMobileBundle('iOS')
			} catch (err) {
				alert('Ошибка iOS экспорта: ' + err.message)
			}
		}

	// --- ECR PROJECT ---
	if (exportEcrBtn) exportEcrBtn.onclick = () => exportProjectAsEcr()
})

// --- ПОЛУЧЕНИЕ ИКОНКИ ---
async function getProjectIconData() {
	if (projectData.settings && projectData.settings.icon) {
		return projectData.settings.icon
	}
	try {
		const response = await fetch('export/EcrousLogo.jpg')
		if (response.ok) {
			const blob = await response.blob()
			return new Promise(resolve => {
				const reader = new FileReader()
				reader.onloadend = () => resolve(reader.result)
				reader.readAsDataURL(blob)
			})
		}
	} catch (e) {
		console.warn('Logo file not found, using fallback.')
	}
	const cvs = document.createElement('canvas')
	cvs.width = 512
	cvs.height = 512
	const ctx = cvs.getContext('2d')
	ctx.fillStyle = '#2979FF'
	ctx.fillRect(0, 0, 512, 512)
	ctx.fillStyle = 'white'
	ctx.font = 'bold 300px sans-serif'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.fillText('E', 256, 256 + 20)
	return cvs.toDataURL('image/png')
}

// ==========================================
// ГЕНЕРАЦИЯ ДВИЖКА (RUNTIME)
// ==========================================
async function generateGameHTML() {
	if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace()

	let startId = projectData.scenes[0].id
	if (projectData.settings && projectData.settings.startSceneId) {
		if (
			projectData.scenes.find(s => s.id === projectData.settings.startSceneId)
		) {
			startId = projectData.settings.startSceneId
		}
	}

	const currentConfig = window.gameConfig || {
		width: 800,
		height: 600,
		scaleMode: 'fit',
	}
	const authorName = projectData.settings?.author || 'Powered by You'
	const gameStatus = projectData.settings?.status || ''
	const disableSplash = projectData.settings?.disableSplash === true
	const iconBase64 = await getProjectIconData()

	const buildData = {
		project: projectData,
		startSceneId: startId,
		config: currentConfig,
		disableSplash: disableSplash,
		exportedAt: new Date().toISOString(),
	}

    // Мы берем логику из main.js, но т.к. мы в браузере, нам нужно внедрить её как строку.
    // ВНИМАНИЕ: Здесь вставлен обновленный код из вашего main.js
	const runtimeScript = `
        const PROJECT = ${JSON.stringify(buildData.project)};
        const START_SCENE_ID = "${buildData.startSceneId}";
        const DISABLE_SPLASH = ${buildData.disableSplash}; 
        
        let gameConfig = ${JSON.stringify(buildData.config)};
        
        let gameVariables = {};
        let physicsObjects = {};
        let activeKeys = {};
        let loadedSounds = {};
        let worldGravity = { x: 0, y: 0 };
        let cameraState = { x: 0, y: 0, zoom: 1, target: null, lerp: 0.1, shakeInfo: { power: 0, time: 0 } };
        
        let matterEngine = null;
        let bodyMap = new Map();

        window.entityComponents = {}; 
        window.gameInventory = [];
        window.gameQuests = {};
        window.globalEvents = {};
        window.anim3d = {};
        
        let isRunning = false;
        let isGamePaused = false;
        let lastTime = performance.now();
        let currentSceneId = null;
        let currentSessionId = 0; 
        let activeCollisionsPair = new Set();
        let globalCurrentSceneData = null;
        let updateInterval = null;
        let activeTimers = [];
        let showFps = false;

        function getAssetUrl(input) {
            if (!input) return '';
            // Если это dataURL или внешняя ссылка
            if (input.startsWith('data:') || input.startsWith('http')) return input;
            
            // Если переменная
            if (input.startsWith('{') && input.endsWith('}')) return resolveValue(input);
            
            // Если ID из ассетов проекта
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
            const splash = document.getElementById('ecrous-splash');
            const startMsg = document.getElementById('splash-start-msg');
            const loader = document.getElementById('splash-loader');
            const bar = document.getElementById('splash-bar-fill');

            resizeGame();
            window.addEventListener('resize', resizeGame);

            if (DISABLE_SPLASH) {
                if(splash) splash.style.display = 'none';
                startGame();
                return;
            }

            if(bar) setTimeout(() => { bar.style.width = '100%'; }, 100);

            if(loader) setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                    if(startMsg) {
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
                    } else {
                        // Автостарт если нет сообщения
                        splash.style.display = 'none';
                        startGame();
                    }
                }, 500);
            }, 1000); 
        };

        function startGame() {
            gameVariables = {};
            physicsObjects = {};
            activeKeys = {};
            window.entityComponents = {};
            window.anim3d = {};
            worldGravity = { x: 0, y: 0 };
            activeCollisionsPair.clear();
            
            // Matter JS Init
            if(typeof Matter !== 'undefined') {
                const Engine = Matter.Engine, World = Matter.World;
                matterEngine = Engine.create();
                matterEngine.world.gravity.y = 1;
                Matter.Events.on(matterEngine, 'collisionStart', event => {
                    event.pairs.forEach(pair => {
                        triggerCollisionEvent(pair.bodyA.label, pair.bodyB.label);
                    });
                });
            } else {
                console.warn('Matter.js physics engine not loaded.');
            }

            const audioUnlock = new Audio();
            audioUnlock.play().catch(e => {});

            isRunning = true;
            resizeGame();
            
            window.addEventListener('mousemove', e => {
                const stage = document.getElementById('game-stage');
                if(stage) {
                    const rect = stage.getBoundingClientRect();
                    const currentWidth = rect.width;
                    const currentHeight = rect.height;
                    const scaleX = gameConfig.width / currentWidth;
                    const scaleY = gameConfig.height / currentHeight;
                    window.mouseX = (e.clientX - rect.left) * scaleX;
                    window.mouseY = (e.clientY - rect.top) * scaleY;
                }
            });
            window.addEventListener('touchstart', () => window.isTouching = true);
            window.addEventListener('touchend', () => window.isTouching = false);
            
            loadScene(START_SCENE_ID);
            requestAnimationFrame(gameLoop);
        }

        function triggerCollisionEvent(id1, id2) {
            if (!globalCurrentSceneData) return;
            const objectsData = globalCurrentSceneData.objects;
            objectsData.forEach(obj => {
                if (!obj.scripts) return;
                if (obj.id === id1 || obj.id === id2) {
                    const events = obj.scripts.filter(b => b.type === 'evt_collision');
                    events.forEach(evt => {
                        const targetName = evt.values[1];
                        const otherId = obj.id === id1 ? id2 : id1;
                        const otherObjDef = objectsData.find(o => o.id === otherId);
                        const isMatch = !targetName || (otherObjDef && otherObjDef.name === targetName) || targetName === otherId;
                        if (isMatch) executeChain(evt, obj.scripts, obj.connections);
                    });
                }
            });
        }

        function gameLoop() {
            if (!isRunning) return;
            const now = performance.now();
            const dt = Math.min(now - lastTime, 50);

            // --- 1. ФИЗИКА (Matter) ---
            if(matterEngine) {
                Matter.Engine.update(matterEngine, dt);
                bodyMap.forEach((body, domId) => {
                    const el = document.getElementById(domId);
                    if (!el) return;
                    const w = body.bounds.max.x - body.bounds.min.x;
                    const h = body.bounds.max.y - body.bounds.min.y;
                    const x = body.position.x - w / 2;
                    const y = body.position.y - h / 2;
                    const angleDeg = body.angle * (180 / Math.PI);
                    el.style.left = \`\${x}px\`;
                    el.style.top = \`\${y}px\`;
                    el.style.transform = \`rotate(\${angleDeg}deg)\`;
                });
            }
            
            // --- 1.1 ФИЗИКА (Simple 2D Update Loop) ---
            // Здесь можно добавить простую физику, если она используется

            // --- 2. КАМЕРА (2D Follow & Shake) ---
            const world = document.getElementById('game-world');
            const is3D = world && world.style.transformStyle === 'preserve-3d';

            if (!is3D && world) {
                 if (cameraState.target) {
                    const targetEl = document.getElementById(cameraState.target);
                    if (targetEl) {
                        const tx = parseFloat(targetEl.style.left || 0);
                        const ty = parseFloat(targetEl.style.top || 0);
                        cameraState.x += (tx - cameraState.x) * cameraState.lerp;
                        cameraState.y += (ty - cameraState.y) * cameraState.lerp;
                    }
                }
                let shakeX = 0, shakeY = 0;
                if (cameraState.shakeInfo.time > 0) {
                     cameraState.shakeInfo.time -= 0.016;
                     const p = cameraState.shakeInfo.power;
                     shakeX = (Math.random() - 0.5) * p;
                     shakeY = (Math.random() - 0.5) * p;
                }
                if (cameraState.target || cameraState.x !== 0 || cameraState.y !== 0) {
                     const cx = gameConfig.width / 2;
                     const cy = gameConfig.height / 2;
                     // Округление для четкости
                     const fx = Math.round(-cameraState.x + cx + shakeX);
                     const fy = Math.round(-cameraState.y + cy + shakeY);
                     
                     world.style.transform = \`translate(\${fx}px, \${fy}px) scale(\${cameraState.zoom})\`;
                     
                     // Параллакс
                     document.querySelectorAll('[data-parallax]').forEach(el => {
                        const factor = parseFloat(el.dataset.parallax) || 1;
                        if (factor !== 1) {
                            const offsetX = -fx * (1 - factor);
                            const offsetY = -fy * (1 - factor);
                            el.style.transform = \`translate(\${offsetX}px, \${offsetY}px)\`;
                        }
                     });
                }
            }
            
            lastTime = now;
            requestAnimationFrame(gameLoop);
        }

        function resizeGame() {
            const stage = document.getElementById('game-stage');
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            stage.style.width = gameConfig.width + 'px';
            stage.style.height = gameConfig.height + 'px';
            stage.style.transformOrigin = 'center center';
            stage.style.position = 'absolute';
            stage.style.left = '50%';
            stage.style.top = '50%';
            let scaleX = winW / gameConfig.width;
            let scaleY = winH / gameConfig.height;
            let transformCmd = 'translate(-50%, -50%)';
            if (gameConfig.scaleMode === 'fixed') { stage.style.transform = transformCmd; } 
            else if (gameConfig.scaleMode === 'stretch' || gameConfig.scaleMode === 'full') { stage.style.transform = \`\${transformCmd} scale(\${scaleX}, \${scaleY})\`; }
            else if (gameConfig.scaleMode === 'fill') { const scale = Math.max(scaleX, scaleY); stage.style.transform = \`\${transformCmd} scale(\${scale})\`; }
            else { const scale = Math.min(scaleX, scaleY); stage.style.transform = \`\${transformCmd} scale(\${scale})\`; }
        }

        function loadScene(sceneId) {
            const scene = PROJECT.scenes.find(s => s.id === sceneId);
            if(!scene) return;
            currentSessionId++;
            currentSceneId = sceneId;
            globalCurrentSceneData = scene;
            
            // Очистка
            document.getElementById('game-world').innerHTML = '';
            document.querySelectorAll('[id^="pp-overlay-"]').forEach(el => el.remove());
            const ui = document.getElementById('game-ui');
            if(ui) ui.innerHTML = ''; else createUIContainer();
            
            // Сброс MatterJS
            if(matterEngine) { Matter.World.clear(matterEngine.world); Matter.Engine.clear(matterEngine); matterEngine = Matter.Engine.create(); matterEngine.world.gravity.y = 1; }
            bodyMap.clear();
            
            Object.values(loadedSounds).forEach(s => { try{s.pause(); s.currentTime=0;}catch(e){} });
            document.title = scene.name;
            if(updateInterval) clearInterval(updateInterval);
            activeTimers.forEach(t => clearInterval(t));
            activeTimers = [];
            
            const allScripts = scene.objects.flatMap(o => o.scripts || []);

            // Загрузка звуков заранее (если нужно)
            // ...

            // Start
            allScripts.filter(b => b.type === 'evt_start').forEach(block => {
                if (block.disabled) return;
                const owner = scene.objects.find(o => o.scripts.some(s => s.id === block.id));
                executeChain(block, owner.scripts, owner.connections || []);
            });

            // Update Loop
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

            // Timers
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
                const inputVars = allScripts.filter(b => b.type === 'input_key_down');
                inputVars.forEach(block => { if(e.code === block.values[0]) gameVariables[block.values[1]] = 1; });
            };
            window.onkeyup = (e) => {
                activeKeys[e.code] = false;
                const inputVars = allScripts.filter(b => b.type === 'input_key_down');
                inputVars.forEach(block => { if(e.code === block.values[0]) gameVariables[block.values[1]] = 0; });
            };
            document.getElementById('game-stage').onclick = (e) => {
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

            // --- LOGIC: IF / ELSE / REPEAT ---
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
            else if (currentBlock.type === 'flow_else') { skipToBlock = findClosingBlock(currentBlock, allBlocks, connections); }
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
            if (nextBlock && currentSessionId === mySession) { await executeChain(nextBlock, allBlocks, connections); }
        }

        function getNextBlock(block, allBlocks, connections) {
             // Ищем по связям (Nodes)
             if (connections && connections.length > 0) {
                 const conn = connections.find(c => c.from === block.id);
                 if (conn) return allBlocks.find(b => b.id === conn.to);
             }
             // Fallback для Stack (по вертикали)
             const SEARCH_HEIGHT = 500;
             const ALIGN_TOLERANCE = 50;
             let candidates = allBlocks.filter(b => {
                if (b.id === block.id) return false;
                const dy = b.y - block.y;
                const dx = Math.abs(b.x - block.x);
                return dy > 0 && dy < SEARCH_HEIGHT && dx < ALIGN_TOLERANCE;
             });
             candidates.sort((a, b) => a.y - b.y);
             return candidates[0];
        }

        function findElseBlock(startBlock, allBlocks, connections) {
            let depth = 0; let curr = getNextBlock(startBlock, allBlocks, connections); let steps = 0;
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
            let depth = 1; let curr = getNextBlock(startBlock, allBlocks, connections); let steps = 0;
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
                curr = getNextBlock(curr, allBlocks, conns);
            }
        }
        
        // --- ПРОСТАЯ ФУНКЦИЯ ДЛЯ ПОИСКА ПУТИ (A* Mini) ---
        function findPath(mapData, sx, sy, tx, ty) { return []; } // Заглушка, если нужна полная - скопировать из main.js

        // --- ГЛАВНАЯ ЛОГИКА БЛОКОВ (Синхронизировано с Main.js) ---
        function executeBlockLogic(block) {
            return new Promise(resolve => {
                if (!isRunning) return resolve();
                
                // Используем setTimeout 0 для асинхронности
                setTimeout(async () => {
                    const v = block.values;
                    const w = document.getElementById('game-world');
                    const ui = document.getElementById('game-ui');
                    const stage = document.getElementById('game-stage');

                    switch (block.type) {
                        // --- ИСПРАВЛЕННЫЙ СПИСОК БЛОКОВ (3D, Video, FX, и т.д.) ---
                        
                        // 1. ДВИЖЕНИЕ
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
                                const width = el.offsetWidth; const height = el.offsetHeight;
                                if(v[1]==='center'){ el.style.left=(GW/2 - width/2)+'px'; el.style.top=(GH/2 - height/2)+'px'; }
                                else if(v[1]==='left') el.style.left='0px';
                                else if(v[1]==='right') el.style.left=(GW - width)+'px';
                                else if(v[1]==='top') el.style.top='0px';
                                else if(v[1]==='bottom') el.style.top=(GH - height)+'px';
                            } 
                            break; 
                        }

                        // 2. ГРУППЫ
                        case 'grp_add': { const el=document.getElementById(v[0]); if(el) el.classList.add('grp_'+v[1]); break; }
                        case 'grp_remove': { const el=document.getElementById(v[0]); if(el) el.classList.remove('grp_'+v[1]); break; }
                        case 'grp_move': { document.querySelectorAll('.grp_'+v[0]).forEach(el=>{ el.style.left=(parseFloat(el.style.left)||0)+parseFloat(v[1])+'px'; el.style.top=(parseFloat(el.style.top)||0)+parseFloat(v[2])+'px'; }); break; }
                        case 'grp_state': { document.querySelectorAll('.grp_'+v[0]).forEach(el=>{ el.style.display=(v[1]==='hide'?'none':'block'); }); break; }
                        case 'grp_delete': { document.querySelectorAll('.grp_'+v[0]).forEach(el=>el.remove()); break; }

                        // 3. ОКНО
                        case 'win_set_title': { document.title = resolveValue(v[0]); break; }
                        case 'win_bg_color': { stage.style.background = v[0]; break; }
                        case 'win_bg_image': { const url=getAssetUrl(resolveValue(v[0])); stage.style.backgroundImage=\`url('\${url}')\`; stage.style.backgroundSize='cover'; break; }
                        case 'win_scale_mode': { gameConfig.scaleMode = v[0]; resizeGame(); break; }
                        case 'win_set_cursor': { stage.style.cursor = v[0]; break; }
                        case 'win_fullscreen': { if(v[0]==='1') { if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); } else { if(document.exitFullscreen) document.exitFullscreen(); } break; }
                        case 'win_console_state': { /* игнор в экспорте */ break; }

                        // 4. ПЕРЕМЕННЫЕ
                        case 'var_set': { gameVariables[v[0]] = resolveValue(v[1]); updateDynamicText(); break; }
                        case 'var_change': { gameVariables[v[0]] = (parseFloat(gameVariables[v[0]] || 0)) + parseFloat(resolveValue(v[1])); updateDynamicText(); break; }
                        case 'log_print': { console.log('[LOG]:', resolveValue(v[0])); break; }
                        case 'var_math': {
                            const val1 = parseFloat(resolveValue(v[1]))||0; const op = v[2]; const val2 = parseFloat(resolveValue(v[3]))||0;
                            let res = 0;
                            if(op==='+')res=val1+val2; else if(op==='-')res=val1-val2; else if(op==='*')res=val1*val2; else if(op==='/')res=val2!==0?val1/val2:0; else if(op==='%')res=val1%val2; else if(op==='^')res=Math.pow(val1,val2);
                            else if(op==='random')res=Math.random()*(val2-val1)+val1;
                            else if(op==='min')res=Math.min(val1,val2); else if(op==='max')res=Math.max(val1,val2);
                            else if(op==='sin')res=Math.sin(val1); else if(op==='cos')res=Math.cos(val1);
                            gameVariables[v[0]] = res; updateDynamicText();
                            break;
                        }
                        case 'var_random': { gameVariables[v[0]] = Math.floor(Math.random() * (parseFloat(v[2]) - parseFloat(v[1]) + 1)) + parseFloat(v[1]); break; }

                        // 5. ОБЪЕКТЫ
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
                        case 'obj_set_visible': { const el=document.getElementById(v[0]); if(el){ if(v[1]==='show')el.style.display='block'; else if(v[1]==='hide')el.style.display='none'; else el.style.display=(el.style.display==='none'?'block':'none'); } break; }

                        case 'obj_set_border_adv': {
                            const targetId = v[0]; const el = document.getElementById(targetId);
                            if (el) {
                                let width = parseFloat(resolveValue(v[1])); if (isNaN(width)) width = 0;
                                let style = resolveValue(v[2]) || 'solid';
                                let color = resolveValue(v[3]) || '#ffffff';
                                let radius = resolveValue(v[4]);
                                el.style.boxSizing = 'border-box';
                                if (width > 0 && style !== 'none') {
                                    el.style.borderWidth = width + 'px'; el.style.borderStyle = style; el.style.borderColor = color;
                                } else { el.style.borderStyle = 'none'; }
                                if (radius) {
                                    if (!isNaN(parseFloat(radius)) && isFinite(radius)) el.style.borderRadius = radius + 'px'; else el.style.borderRadius = radius;
                                }
                            }
                            break;
                        }

                        // 6. ТЕКСТ
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
                        case 'txt_show': { const t=document.getElementById(v[0]); if(t) t.style.display='block'; break; }
                        case 'txt_hide': { const t=document.getElementById(v[0]); if(t) t.style.display='none'; break; }
                        case 'txt_set_opacity': { const t=document.getElementById(v[0]); if(t) t.style.opacity=v[1]; break; }
                        
                        // 7. АНИМАЦИЯ
                        case 'anim_move_to': { const el=document.getElementById(v[0]); if(el){ el.style.transition=\`all \${v[3]}s ease-in-out\`; el.offsetHeight; el.style.left=v[1]+'px'; el.style.top=v[2]+'px'; } break; }
                        case 'anim_rotate_to': { const el=document.getElementById(v[0]); if(el){ el.style.transition=\`transform \${v[2]}s ease-in-out\`; el.style.transform=\`rotate(\${v[1]}deg)\`; } break; }
                        case 'anim_scale_to': { const el=document.getElementById(v[0]); if(el){ el.style.transition=\`transform \${v[3]}s ease-in-out\`; el.style.transform=\`scale(\${v[1]}, \${v[2]})\`; } break; }
                        case 'anim_fade': { const el=document.getElementById(v[0]); if(el){ el.style.transition=\`opacity \${v[2]}s ease-in-out\`; el.style.opacity=v[1]; } break; }
                        case 'anim_stop': { const el=document.getElementById(v[0]); if(el){ const s=window.getComputedStyle(el); el.style.left=s.left; el.style.top=s.top; el.style.transform=s.transform; el.style.opacity=s.opacity; el.style.transition='none'; } break; }
                        
                        // 8. ЗВУК
                        case 'snd_load': { 
                            const id=v[0]; const src=getAssetUrl(resolveValue(v[1]));
                            if(id && src) {
                                const audio = new Audio(src); audio.preload='auto'; loadedSounds[id]=audio;
                                let resolved = false;
                                const finish = () => { if(!resolved){ resolved=true; resolve(); } };
                                audio.oncanplaythrough = finish; audio.onerror = finish;
                                setTimeout(finish, 2000); return; 
                            }
                            break; 
                        }
                        case 'snd_play': { const s=loadedSounds[v[0]]; if(s){ s.currentTime=0; s.play().catch(e=>{}); } break; }
                        case 'snd_stop': { const s=loadedSounds[v[0]]; if(s){ s.pause(); s.currentTime=0; } break; }
                        case 'snd_loop': { const s=loadedSounds[v[0]]; if(s) s.loop=(v[1]==='1'||v[1]==='true'); break; }
                        case 'snd_stop_all': { Object.values(loadedSounds).forEach(s=>{s.pause(); s.currentTime=0;}); break; }
                        case 'snd_set_volume': { const s=loadedSounds[v[0]]; if(s){ let vol=parseFloat(resolveValue(v[1])); if(vol<0)vol=0;if(vol>1)vol=1; s.volume=vol; } break; }
                        
                        // 9. UI
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
                        case 'ui_anchor': {
                            const el=document.getElementById(v[0]); const anc=v[1]; const ox=parseFloat(resolveValue(v[2]))||0; const oy=parseFloat(resolveValue(v[3]))||0;
                            if(el){
                                el.style.left='auto'; el.style.right='auto'; el.style.top='auto'; el.style.bottom='auto'; el.style.position='absolute'; el.style.margin='0';
                                let tr = el.style.transform || '';
                                tr = tr.replace(/translate\\([^)]+\\)/g, '').replace(/translateX\\([^)]+\\)/g, '').replace(/translateY\\([^)]+\\)/g, '').trim();
                                let nt = '';
                                switch(anc){
                                    case 'top-left': el.style.left=ox+'px'; el.style.top=oy+'px'; break;
                                    case 'top-center': el.style.left='50%'; el.style.top=oy+'px'; nt=\`translateX(calc(-50% + \${ox}px))\`; break;
                                    case 'top-right': el.style.right=ox+'px'; el.style.top=oy+'px'; break;
                                    case 'center-left': el.style.left=ox+'px'; el.style.top='50%'; nt=\`translateY(calc(-50% + \${oy}px))\`; break;
                                    case 'center': el.style.left='50%'; el.style.top='50%'; nt=\`translate(calc(-50% + \${ox}px), calc(-50% + \${oy}px))\`; break;
                                    case 'center-right': el.style.right=ox+'px'; el.style.top='50%'; nt=\`translateY(calc(-50% + \${oy}px))\`; break;
                                    case 'bottom-left': el.style.left=ox+'px'; el.style.bottom=oy+'px'; break;
                                    case 'bottom-center': el.style.left='50%'; el.style.bottom=oy+'px'; nt=\`translateX(calc(-50% + \${ox}px))\`; break;
                                    case 'bottom-right': el.style.right=ox+'px'; el.style.bottom=oy+'px'; break;
                                    case 'stretch-full': el.style.left='0'; el.style.top='0'; el.style.width='100%'; el.style.height='100%'; break;
                                }
                                el.style.transform = nt ? \`\${nt} \${tr}\` : tr;
                            }
                            break;
                        }
                        case 'ui_dialog_show': {
                            const nm=resolveValue(v[0]); const tx=resolveValue(v[1]); const av=resolveValue(v[2]); const showAv=v[3]==='yes';
                            const old=document.getElementById('game-dialog-overlay'); if(old)old.remove();
                            const dlg=document.createElement('div'); dlg.id='game-dialog-overlay';
                            dlg.style.cssText='position:absolute; bottom:20px; left:5%; width:90%; background:rgba(0,0,0,0.85); border:2px solid #fff; border-radius:8px; padding:15px; color:#fff; z-index:10000; display:flex; gap:15px; align-items:start; opacity:0; transition:opacity 0.3s; box-sizing:border-box;';
                            dlg.innerHTML=\`\${showAv && av ? \`<img src="\${getAssetUrl(av)}" style="width:60px; height:60px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.2);">\` : ''}<div style="flex:1;"><div style="color:#ff9800;font-weight:bold;margin-bottom:5px;font-size:1.1em;">\${nm}</div><div style="font-size:14px;line-height:1.4;white-space:pre-wrap;">\${tx}</div></div><div style="position:absolute; bottom:5px; right:10px; font-size:10px; opacity:0.5;">▼</div>\`;
                            stage.appendChild(dlg); setTimeout(()=>dlg.style.opacity='1',10);
                            return new Promise(r=>{ dlg.onclick=()=>{ dlg.style.opacity='0'; setTimeout(()=>{dlg.remove(); if(v[7])gameVariables[v[7]]=1; r();},250); }; });
                        }
                        case 'ui_dialog_hide': { const d=document.getElementById('game-dialog-overlay'); if(d)d.remove(); break; }

                        // 10. ФИЗИКА
                        case 'phys_enable': { 
                             const el=document.getElementById(v[0]); 
                             if(el && matterEngine) {
                                const isStatic=v[2]==='1'||v[2]==='true';
                                const w=el.offsetWidth; const h=el.offsetHeight;
                                const x=parseFloat(el.style.left)||0; const y=parseFloat(el.style.top)||0;
                                const body = Matter.Bodies.rectangle(x+w/2, y+h/2, w, h, { isStatic: isStatic, restitution: parseFloat(v[3])||0, label:v[0] });
                                Matter.World.add(matterEngine.world, body); bodyMap.set(v[0], body);
                             }
                             break; 
                        }
                        case 'phys_set_gravity': { worldGravity.x=parseFloat(v[0]); worldGravity.y=parseFloat(v[1]); if(matterEngine) matterEngine.world.gravity.y = worldGravity.y; break; }
                        case 'phys_add_force': { const b=bodyMap.get(v[0]); if(b) Matter.Body.applyForce(b, b.position, {x:parseFloat(v[1])*0.001, y:parseFloat(v[2])*0.001}); break; }
                        case 'phys_set_velocity': { /* для simple physics если нужно */ break; }
                        
                        // 11. 3D & VIDEO & FX (ИЗ ВАШЕГО НОВОГО БЛОКА)
                        case 'scene_3d_init': { 
                            if(stage && w){ stage.style.perspective=v[0]+'px'; stage.style.overflow='hidden'; w.style.transformStyle='preserve-3d'; w.style.width="100%"; w.style.height="100%"; } 
                            if(!document.getElementById('css-3d-s')){const s=document.createElement('style');s.id='css-3d-s';s.innerHTML='.ecr-cube,.ecr-plane{position:absolute;transform-style:preserve-3d;} .ecr-face{position:absolute;width:100%;height:100%;display:flex;align-items:center;justify-content:center;}.ecr-face.front{transform:rotateY(0deg) translateZ(calc(var(--s)/2));}.ecr-face.back{transform:rotateY(180deg) translateZ(calc(var(--s)/2));}.ecr-face.right{transform:rotateY(90deg) translateZ(calc(var(--s)/2));}.ecr-face.left{transform:rotateY(-90deg) translateZ(calc(var(--s)/2));}.ecr-face.top{transform:rotateX(90deg) translateZ(calc(var(--s)/2));}.ecr-face.bottom{transform:rotateX(-90deg) translateZ(calc(var(--s)/2));}';document.head.appendChild(s);}
                            break; 
                        }
                        case 'obj_3d_create_cube': { 
                            const id=v[0]; if(document.getElementById(id))break;
                            const s=parseInt(resolveValue(v[1])); const c=document.createElement('div'); c.id=id; c.className='ecr-cube'; c.style.width=s+'px';c.style.height=s+'px';c.style.setProperty('--s',s+'px');
                            c.style.transform=\`translate3d(\${resolveValue(v[3])}px,\${resolveValue(v[4])}px,\${resolveValue(v[5])}px)\`;
                            ['front','back','right','left','top','bottom'].forEach(f=>{const d=document.createElement('div');d.className='ecr-face '+f;d.style.backgroundColor=resolveValue(v[2]);d.style.opacity='0.9';c.appendChild(d);});
                            w.appendChild(c); break; 
                        }
                        case 'video_load': {
                            const vidId=v[0]; const src=getAssetUrl(resolveValue(v[1]));
                            const old=document.getElementById(vidId); if(old) old.remove();
                            const vid=document.createElement('video'); vid.id=vidId; vid.src=src; vid.style.cssText=\`position:absolute; left:0; top:0; width:\${resolveValue(v[2])}; height:\${resolveValue(v[3])}; object-fit:cover; z-index:\${resolveValue(v[4])};\`;
                            vid.controls=false; 
                            vid.onended=()=>{
                                if(globalCurrentSceneData){
                                    globalCurrentSceneData.objects.forEach(o=>{
                                        if(!o.scripts)return;
                                        o.scripts.filter(b=>b.type==='video_on_end'&&b.values[0]===vidId).forEach(trig=>executeChain(trig,o.scripts,o.connections||[]));
                                    });
                                }
                            };
                            stage.appendChild(vid);
                            break;
                        }
                        case 'video_control': { const vid=document.getElementById(v[0]); const act=v[1]; if(vid){ if(act==='play')vid.play().catch(e=>{}); else if(act==='pause')vid.pause(); else if(act==='stop'){vid.pause();vid.currentTime=0;} else if(act==='remove')vid.remove(); } break; }
                        case 'pp_filter_set': { const t=v[0]; const val=parseFloat(resolveValue(v[1])); if(w){ w.style.filter = (t==='blur')?\`blur(\${val}px)\`:\`\${t}(\${val}%)\`; } break; }
                        case 'pp_vignette': { if(v[0]==='1'){ const d=document.createElement('div'); d.id='pp-vignette'; d.style.cssText=\`position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:800;background:radial-gradient(circle,transparent 50%,\${v[2]} 100%);opacity:\${resolveValue(v[1])};mix-blend-mode:multiply;\`; stage.appendChild(d); } else { const d=document.getElementById('pp-vignette'); if(d)d.remove(); } break; }
                        case 'pp_crt_effect': { if(v[0]==='1'){ const d=document.createElement('div'); d.id='pp-crt'; d.style.cssText=\`position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9990;background:linear-gradient(rgba(18,16,16,0) 50%,rgba(0,0,0,0.25) 50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06));background-size:100% 4px,6px 100%;opacity:\${resolveValue(v[1])};\`; stage.appendChild(d); } else { const d=document.getElementById('pp-crt'); if(d)d.remove(); } break; }

                        // 12. СЦЕНЫ И ДАННЫЕ
                        case 'scene_load': { const next = PROJECT.scenes.find(s=>s.name===v[0]); if(next) loadScene(next.id); break; }
                        case 'scene_reload': { loadScene(currentSceneId); break; }
                        case 'scene_next': { const idx = PROJECT.scenes.findIndex(s => s.id === currentSceneId); if (idx !== -1 && idx < PROJECT.scenes.length - 1) loadScene(PROJECT.scenes[idx + 1].id); break; }
                        case 'scene_save_state': { localStorage.setItem('ecrous_save_'+PROJECT.settings?.name+'_'+(v[0]||'auto'), JSON.stringify({vars:gameVariables})); break; }
                        case 'scene_load_state': { const d=localStorage.getItem('ecrous_save_'+PROJECT.settings?.name+'_'+(v[0]||'auto')); if(d){ gameVariables=JSON.parse(d).vars||{}; updateDynamicText(); } break; }
                        case 'game_pause': { isGamePaused=(v[0]==='1'||v[0]==='true'); stage.style.filter=isGamePaused?'grayscale(100%)':'none'; break; }
                        case 'game_restart': { const cur=PROJECT.scenes.find(s=>s.id===currentSceneId); if(cur){ gameVariables={}; loadScene(cur.id); } break; }

                        case 'evt_wait': { await new Promise(r => setTimeout(r, parseFloat(v[0]) * 1000)); break; }
                    }
                    resolve();
                }, 0);
            });
        }
    `

	// 4. HTML
	return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>${projectData.settings?.name || 'Ecrous Game'}</title>
    <link rel="icon" type="image/png" href="${iconBase64}">
    <script src="https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js"></script>
    <style>
        :root { --accent: #2979FF; --dark: #0a0a0a; }
        body { 
            margin: 0; background: #000; overflow: hidden; 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            user-select: none; touch-action: none;
            height: 100vh; width: 100vw;
            display: flex; align-items: center; justify-content: center;
        }
        #game-container { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        
        #game-stage { 
            width: 800px; height: 600px; 
            background: #1a1a1a; 
            overflow: hidden; 
            position: absolute; 
            left: 50%; top: 50%;
            transform: translate(-50%, -50%);
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
            width: 100px; height: 100px;
            background: url('${iconBase64}') no-repeat center center;
            background-size: cover;
            border-radius: 20px;
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
            <div class="logo-box"></div>
            <div class="title-main">Ecrous Engine</div>
            <div class="title-sub">
                ${authorName} 
                ${
									gameStatus
										? `<span style="opacity:0.5; margin-left:5px;">| ${gameStatus.toUpperCase()}</span>`
										: ''
								}
            </div>
        </div>
        <div id="splash-loader"><div id="splash-bar-fill"></div></div>
        <div id="splash-start-msg">НАЖМИТЕ, ЧТОБЫ НАЧАТЬ</div>
    </div>

    <div id="game-container"><div id="game-stage"><div id="game-world"></div></div></div>
    <script>${runtimeScript}</script>
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

	let oldText = ''
	if (btn) {
		oldText = btn.innerHTML
		btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Сборка...'
	}

	const zip = new JSZip()
	const html = await generateGameHTML()
	const iconBase64 = await getProjectIconData()

	// --- НАСТРОЙКИ ---
	const orient = projectData.settings?.orientation || 'landscape'
	const pkgId = projectData.settings?.packageId || 'com.ecrous.game'
	const appName = projectData.settings?.name || 'Game'
    
    // 1. Основной файл
	zip.file('index.html', html)

    // 2. Иконка
	const [, iconData] = iconBase64.split('base64,')
	zip.file('icon.png', iconData, { base64: true })

    // 3. Манифест (PWA / Android TWA)
	const manifest = {
		name: appName,
		short_name: appName,
		start_url: './index.html',
		display: 'standalone',
		orientation: orient,
		background_color: '#000000',
		theme_color: '#000000',
		icons: [{ src: 'icon.png', sizes: '512x512', type: 'image/png' }],
	}
	zip.file('manifest.json', JSON.stringify(manifest, null, 2))

    // 4. Инструкция для пользователя (так как браузер не делает .apk)
    const readme = `
ECROUS ENGINE - MOBILE EXPORT (${platform})
===========================================

Ваш проект экспортирован как "Web Bundle".
Браузеры не могут создавать .APK или .IPA файлы напрямую.

ЧТО ДЕЛАТЬ ДАЛЬШЕ:
1. Воспользуйтесь онлайн-конвертером (например, websitetoapk.com).
2. Или используйте Cordova / Capacitor.
3. Загрузите содержимое этого архива.

Файлы внутри:
- index.html (Сама игра)
- icon.png (Иконка)
- manifest.json (Настройки)
    `;
    zip.file('README.txt', readme);

	zip.generateAsync({ type: 'blob' }).then(content => {
		downloadFile(`${appName}_${platform}.zip`, content, 'application/zip')
		if (btn) btn.innerHTML = oldText
	})
}

function exportProjectAsEcr() {
	if (typeof saveCurrentWorkspace === 'function') saveCurrentWorkspace()
	const dataStr = JSON.stringify(projectData, null, 2)
	const fileName = (projectData.settings?.name || 'MyGame').replace(/\s+/g, '_')
	downloadFile(`${fileName}.ecr`, dataStr, 'application/json')
}

function exportProjectAsExe() {
	alert('Экспорт в EXE требует внешнего упаковщика (например, Electron). Скачан HTML.')
	document.getElementById('exportWindows').click()
}

function downloadFile(filename, content, mimeType) {
	const blob = new Blob([content], { type: mimeType })
	const a = document.createElement('a')
	a.href = URL.createObjectURL(blob)
	a.download = filename
	a.click()
}
