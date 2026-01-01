// ==========================================
// EXPORT LOGIC (Ecrous Engine) - FINAL & FIXED
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

	const exportWinBtn = document.getElementById('exportWindows')
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

	// --- ОБРАБОТЧИКИ С ВЫВОДОМ ОШИБОК ---
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
				if (exportWinBtn) exportWinBtn.innerHTML = 'Ошибка'
			}
		}

	if (exportExeBtn) exportExeBtn.onclick = () => exportProjectAsExe()

	if (exportAndroidBtn)
		exportAndroidBtn.onclick = async () => {
			try {
				await exportMobileBundle('Android')
			} catch (err) {
				alert('Ошибка Android экспорта: ' + err.message)
			}
		}

	if (exportIOSBtn)
		exportIOSBtn.onclick = async () => {
			try {
				await exportMobileBundle('iOS')
			} catch (err) {
				alert('Ошибка iOS экспорта: ' + err.message)
			}
		}

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

	// --------------------------------------------------------
	// ВНУТРЕННИЙ JS ДВИЖОК
	// --------------------------------------------------------
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

        function getAssetUrl(input) {
            if (!input) return '';
            if (input.startsWith('{') && input.endsWith('}')) return resolveValue(input);
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

        function gameLoop() {
            if (!isRunning) return;

            // --- 1. ФИЗИКА (2D) ---
            Object.keys(physicsObjects).forEach(id => {
                const obj = physicsObjects[id];
                const el = document.getElementById(id);
                if (!el) return;
                obj.vx += worldGravity.x;
                obj.vy += worldGravity.y;
                let x = parseFloat(el.style.left || 0);
                let y = parseFloat(el.style.top || 0);
                x += obj.vx;
                y += obj.vy;
                if (obj.collideWorld) {
                    if (y + obj.height > gameConfig.height) { y = gameConfig.height - obj.height; obj.vy *= -obj.bounce; }
                    if (x + obj.width > gameConfig.width) { x = gameConfig.width - obj.width; obj.vx *= -obj.bounce; }
                    if (x < 0) { x = 0; obj.vx *= -obj.bounce; }
                }
                el.style.left = x + 'px';
                el.style.top = y + 'px';
            });

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
                     
                     world.style.transform = 'translate(' + (-cameraState.x + cx + shakeX) + 'px, ' + (-cameraState.y + cy + shakeY) + 'px) scale(' + cameraState.zoom + ')';
                }
            }
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
            document.getElementById('game-world').innerHTML = '';
            document.querySelectorAll('[id^="pp-overlay-"]').forEach(el => el.remove());
            const ui = document.getElementById('game-ui');
            if(ui) ui.innerHTML = ''; else createUIContainer();
            Object.values(loadedSounds).forEach(s => { try{s.pause(); s.currentTime=0;}catch(e){} });
            document.title = scene.name;
            if(updateInterval) clearInterval(updateInterval);
            activeTimers.forEach(t => clearInterval(t));
            activeTimers = [];
            const allScripts = scene.objects.flatMap(o => o.scripts || []);

            allScripts.filter(b => b.type === 'evt_start').forEach(block => {
                if (block.disabled) return;
                const owner = scene.objects.find(o => o.scripts.some(s => s.id === block.id));
                executeChain(block, owner.scripts, owner.connections || []);
            });

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
            if (connections && connections.length > 0) {
                 const conn = connections.find(c => c.from === block.id);
                 if (conn) return allBlocks.find(b => b.id === conn.to);
            }
            return null;
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

        function executeBlockLogic(block) {
            return new Promise(resolve => {
                if (!isRunning) return resolve();
                
                setTimeout(async () => {
                    const v = block.values;
                    const w = document.getElementById('game-world');
                    const ui = document.getElementById('game-ui');
                    const stage = document.getElementById('game-stage');

                    switch (block.type) {
                        // --- 3D МИР ---
                        case 'scene_3d_init': {
                            const perspective = v[0];
                            if (stage && w) {
                                stage.style.perspective = perspective + 'px';
                                stage.style.overflow = 'hidden';
                                w.style.transformStyle = 'preserve-3d';
                                w.style.width = "100%";
                                w.style.height = "100%";
                            }
                            if (!document.getElementById('css-3d-styles')) {
                                const style = document.createElement('style');
                                style.id = 'css-3d-styles';
                                style.innerHTML = \`
                                    .ecr-cube { position: absolute; transform-style: preserve-3d; }
                                    .ecr-face { position: absolute; width: 100%; height: 100%; border: 1px solid rgba(0,0,0,0.1); display:flex; align-items:center; justify-content:center; font-size:20px; color:rgba(255,255,255,0.5); }
                                    .ecr-face.front  { transform: rotateY(  0deg) translateZ(calc(var(--s) / 2)); }
                                    .ecr-face.back   { transform: rotateY(180deg) translateZ(calc(var(--s) / 2)); }
                                    .ecr-face.right  { transform: rotateY( 90deg) translateZ(calc(var(--s) / 2)); }
                                    .ecr-face.left   { transform: rotateY(-90deg) translateZ(calc(var(--s) / 2)); }
                                    .ecr-face.top    { transform: rotateX( 90deg) translateZ(calc(var(--s) / 2)); }
                                    .ecr-face.bottom { transform: rotateX(-90deg) translateZ(calc(var(--s) / 2)); }
                                    .ecr-plane { position: absolute; transform-style: preserve-3d; }
                                    .ecr-cylinder-group { position: absolute; transform-style: preserve-3d; }
                                \`;
                                document.head.appendChild(style);
                            }
                            break;
                        }
                        case 'obj_3d_create_cube': {
                            const id = v[0]; if (document.getElementById(id)) break;
                            const size = parseInt(resolveValue(v[1]));
                            const color = resolveValue(v[2]);
                            const x = resolveValue(v[3]); const y = resolveValue(v[4]); const z = resolveValue(v[5]);
                            const cube = document.createElement('div');
                            cube.id = id; cube.className = 'ecr-cube';
                            cube.style.width = size + 'px'; cube.style.height = size + 'px';
                            cube.style.setProperty('--s', size + 'px');
                            cube.style.transform = \`translate3d(\${x}px, \${y}px, \${z}px)\`;
                            const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
                            const shades = [1, 0.8, 0.6, 0.6, 1.2, 0.4]; 
                            faces.forEach((face, i) => {
                                const el = document.createElement('div');
                                el.className = \`ecr-face \${face}\`;
                                el.style.backgroundColor = color;
                                el.style.filter = \`brightness(\${shades[i]})\`; el.style.opacity = '0.9'; 
                                cube.appendChild(el);
                            });
                            w.appendChild(cube);
                            break;
                        }
                        case 'obj_3d_create_plane': {
                            const id = v[0]; if (document.getElementById(id)) break;
                            const wVal=resolveValue(v[1]); const hVal=resolveValue(v[2]); const color=resolveValue(v[3]);
                            const x=resolveValue(v[4]); const y=resolveValue(v[5]); const z=resolveValue(v[6]); const rx=resolveValue(v[7]);
                            const plane = document.createElement('div');
                            plane.id = id; plane.className = 'ecr-plane';
                            plane.style.position = 'absolute'; plane.style.width = wVal + 'px'; plane.style.height = hVal + 'px';
                            plane.style.backgroundColor = color;
                            plane.style.transform = \`translate3d(\${x}px, \${y}px, \${z}px) rotateX(\${rx}deg)\`;
                            plane.style.transformOrigin = 'center center';
                            w.appendChild(plane);
                            break;
                        }
                        case 'obj_3d_create_cylinder': {
                            const id = v[0]; if (document.getElementById(id)) break;
                            const height=parseFloat(resolveValue(v[1])); const diameter=parseFloat(resolveValue(v[2])); const sides=parseInt(resolveValue(v[3]))||8;
                            const color=resolveValue(v[4]); const x=resolveValue(v[5]); const y=resolveValue(v[6]); const z=resolveValue(v[7]);
                            const container = document.createElement('div');
                            container.id = id; container.className = 'ecr-cylinder-group';
                            container.style.width = '0px'; container.style.height = '0px';
                            container.style.transform = \`translate3d(\${x}px, \${y}px, \${z}px)\`;
                            const angleStep = 360 / sides; const radius = diameter / 2;
                            const stripWidth = (2 * radius * Math.tan(Math.PI / sides)) + 1;
                            for (let i = 0; i < sides; i++) {
                                const strip = document.createElement('div');
                                strip.style.position = 'absolute'; strip.style.height = height + 'px'; strip.style.width = stripWidth + 'px';
                                strip.style.backgroundColor = color;
                                if (i % 2 === 0) strip.style.filter = 'brightness(0.9)';
                                const angle = i * angleStep;
                                strip.style.transform = \`rotateY(\${angle}deg) translateZ(\${radius}px)\`;
                                strip.style.left = (-stripWidth / 2) + 'px'; strip.style.top = (-height / 2) + 'px';
                                container.appendChild(strip);
                            }
                            w.appendChild(container);
                            break;
                        }
                        case 'obj_3d_billboard': {
                            const id = v[0]; if (document.getElementById(id)) break;
                            const url = getAssetUrl(resolveValue(v[1]));
                            const wVal=resolveValue(v[2]); const hVal=resolveValue(v[3]);
                            const x=resolveValue(v[4]); const y=resolveValue(v[5]); const z=resolveValue(v[6]);
                            const sprite = document.createElement('div');
                            sprite.id = id; sprite.style.position = 'absolute';
                            sprite.style.width = wVal + 'px'; sprite.style.height = hVal + 'px';
                            sprite.style.backgroundImage = \`url('\${url}')\`;
                            sprite.style.backgroundSize = 'contain'; sprite.style.backgroundRepeat = 'no-repeat';
                            sprite.style.backgroundPosition = 'center bottom'; sprite.style.transformStyle = 'preserve-3d';
                            sprite.style.transform = \`translate3d(\${x}px, \${y}px, \${z}px) translate(-50%, -100%)\`; 
                            sprite.dataset.pos3d = JSON.stringify({x, y, z});
                            w.appendChild(sprite);
                            break;
                        }
                        case 'obj_3d_transform': {
                            const el = document.getElementById(v[0]);
                            if (el) {
                                const x = resolveValue(v[1]); const y = resolveValue(v[2]); const z = resolveValue(v[3]);
                                const rx = resolveValue(v[4]); const ry = resolveValue(v[5]); const rz = resolveValue(v[6]);
                                el.style.transform = \`translate3d(\${x}px, \${y}px, \${z}px) rotateX(\${rx}deg) rotateY(\${ry}deg) rotateZ(\${rz}deg)\`;
                            }
                            break;
                        }
                        case 'obj_3d_rotate_anim': {
                             const id = v[0];
                             const sx = parseFloat(resolveValue(v[1])); const sy = parseFloat(resolveValue(v[2])); const sz = parseFloat(resolveValue(v[3]));
                             if(!window.anim3d) window.anim3d = {};
                             if(!window.anim3d[id]) window.anim3d[id] = {rx:0, ry:0, rz:0};
                             const el = document.getElementById(id);
                             if(el) {
                                 if(el.rotateInterval) clearInterval(el.rotateInterval);
                                 el.rotateInterval = setInterval(() => {
                                     if(!document.getElementById(id) || !isRunning) { clearInterval(el.rotateInterval); return; }
                                     const state = window.anim3d[id];
                                     state.rx += sx; state.ry += sy; state.rz += sz;
                                     const currentTrans = el.style.transform.match(/translate3d\([^)]+\)/);
                                     const posStr = currentTrans ? currentTrans[0] : 'translate3d(0px,0px,0px)';
                                     el.style.transform = \`\${posStr} rotateX(\${state.rx}deg) rotateY(\${state.ry}deg) rotateZ(\${state.rz}deg)\`;
                                 }, 16);
                             }
                             break;
                        }
                        case 'cam_3d_move': {
                            const x = resolveValue(v[0]); const y = resolveValue(v[1]); const z = resolveValue(v[2]); const rotY = resolveValue(v[3]);
                            const world = document.getElementById('game-world');
                            if (world) {
                                world.style.transform = \`translateZ(\${z}px) rotateY(\${-rotY}deg) translate3d(\${-x}px, \${-y}px, 0px)\`;
                            }
                            break;
                        }
                        case 'cam_3d_look_at': {
                            const targetId = v[0]; const el = document.getElementById(targetId);
                            if (el) {
                                const world = document.getElementById('game-world');
                                let camRotY = 0;
                                if (world.style.transform) {
                                    const match = world.style.transform.match(/rotateY\(([-\d.]+)deg\)/);
                                    if (match) camRotY = parseFloat(match[1]);
                                }
                                let bx = 0, by = 0, bz = 0;
                                if (el.dataset.pos3d) {
                                    const p = JSON.parse(el.dataset.pos3d);
                                    bx = p.x; by = p.y; bz = p.z;
                                }
                                el.style.transform = \`translate3d(\${bx}px, \${by}px, \${bz}px) rotateY(\${-camRotY}deg) translate(-50%, -100%)\`;
                            }
                            break;
                        }
                        case 'obj_3d_set_face': {
                             const cubeId = v[0]; const faceClass = v[1]; const url = getAssetUrl(resolveValue(v[2]));
                             const cube = document.getElementById(cubeId);
                             if (cube) {
                                 const face = cube.querySelector(\`.ecr-face.\${faceClass}\`);
                                 if (face) {
                                     face.style.backgroundImage = \`url('\${url}')\`; face.style.backgroundSize = 'cover';
                                     face.style.backgroundColor = 'transparent'; face.innerHTML = ''; face.style.border = 'none';
                                 }
                             }
                             break;
                        }

                        // --- СТАНДАРТНЫЕ БЛОКИ ---
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

                        case 'grp_add': { const el=document.getElementById(v[0]); if(el) el.classList.add('grp_'+v[1]); break; }
                        case 'grp_remove': { const el=document.getElementById(v[0]); if(el) el.classList.remove('grp_'+v[1]); break; }
                        case 'grp_move': { document.querySelectorAll('.grp_'+v[0]).forEach(el=>{ el.style.left=(parseFloat(el.style.left)||0)+parseFloat(v[1])+'px'; el.style.top=(parseFloat(el.style.top)||0)+parseFloat(v[2])+'px'; }); break; }
                        case 'grp_state': { document.querySelectorAll('.grp_'+v[0]).forEach(el=>{ el.style.display=(v[1]==='hide'?'none':'block'); }); break; }
                        case 'grp_delete': { document.querySelectorAll('.grp_'+v[0]).forEach(el=>el.remove()); break; }

                        case 'win_set_title': { document.title = resolveValue(v[0]); break; }
                        case 'win_bg_color': { stage.style.background = v[0]; break; }
                        case 'win_bg_image': { const url=getAssetUrl(resolveValue(v[0])); stage.style.backgroundImage=\`url('\${url}')\`; stage.style.backgroundSize='cover'; break; }
                        case 'win_scale_mode': { gameConfig.scaleMode = v[0]; resizeGame(); break; }
                        case 'win_set_cursor': { stage.style.cursor = v[0]; break; }
                        case 'win_fullscreen': { 
                             if(v[0]==='1') { if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); }
                             else { if(document.exitFullscreen) document.exitFullscreen(); }
                             break;
                        }
                        case 'win_set_size': {
                            const w = parseInt(v[0]); const h = parseInt(v[1]);
                            gameConfig.width = w; gameConfig.height = h;
                            resizeGame(); 
                            break;
                        }

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

                        case 'input_mouse_pos': { gameVariables[v[0]] = window.mouseX || 0; gameVariables[v[1]] = window.mouseY || 0; break; }
                        case 'input_touch': { gameVariables[v[0]] = window.isTouching ? 1 : 0; break; }

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
                        
                        case 'obj_set_border_adv': {
                            const targetId = v[0]; const el = document.getElementById(targetId);
                            if (el) {
                                let width = parseFloat(resolveValue(v[1])); if (isNaN(width)) width = 0;
                                let style = resolveValue(v[2]);
                                const validStyles = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none', 'hidden'];
                                if (!style || !validStyles.includes(style)) style = 'solid';
                                let color = resolveValue(v[3]);
                                if (!color || color === '0' || color === 0) color = '#ffffff';
                                let radius = resolveValue(v[4]);
                                el.style.boxSizing = 'border-box';
                                if (width > 0 && style !== 'none') {
                                    el.style.borderWidth = width + 'px'; el.style.borderStyle = style; el.style.borderColor = color;
                                } else { el.style.borderStyle = 'none'; el.style.borderWidth = '0px'; }
                                if (radius !== undefined && radius !== '' && radius !== '0' && radius !== 0) {
                                    if (!isNaN(parseFloat(radius)) && isFinite(radius)) { el.style.borderRadius = radius + 'px'; } else { el.style.borderRadius = radius; }
                                }
                            }
                            break;
                        }

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
                        
                        case 'anim_move_to': { const el=document.getElementById(v[0]); if(el){ el.style.transition=\`all \${v[3]}s ease-in-out\`; el.offsetHeight; el.style.left=v[1]+'px'; el.style.top=v[2]+'px'; } break; }
                        case 'anim_rotate_to': { const el=document.getElementById(v[0]); if(el){ el.style.transition=\`transform \${v[2]}s ease-in-out\`; el.style.transform=\`rotate(\${v[1]}deg)\`; } break; }
                        case 'anim_scale_to': { const el=document.getElementById(v[0]); if(el){ el.style.transition=\`transform \${v[3]}s ease-in-out\`; el.style.transform=\`scale(\${v[1]}, \${v[2]})\`; } break; }
                        case 'anim_fade': { const el=document.getElementById(v[0]); if(el){ el.style.transition=\`opacity \${v[2]}s ease-in-out\`; el.style.opacity=v[1]; } break; }
                        case 'anim_stop': { const el=document.getElementById(v[0]); if(el){ const s=window.getComputedStyle(el); el.style.left=s.left; el.style.top=s.top; el.style.transform=s.transform; el.style.opacity=s.opacity; el.style.transition='none'; } break; }
                        
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
                        case 'ui_dialog_show': {
                            let dlg=document.getElementById('game-dialog'); if(!dlg){ dlg=document.createElement('div'); dlg.id='game-dialog'; dlg.style.cssText='position:absolute; bottom:20px; left:50%; transform:translateX(-50%); width:80%; background:rgba(0,0,0,0.85); border:2px solid #fff; border-radius:10px; padding:15px; color:#fff; z-index:10000; display:flex; gap:15px; align-items:center;'; stage.appendChild(dlg); }
                            const nm=resolveValue(v[0]); const tx=resolveValue(v[1]); const av=resolveValue(v[2]);
                            dlg.innerHTML=\`\${av ? \`<img src="\${av}" style="width:50px; height:50px; border-radius:50%; object-fit:cover;">\` : ''}<div style="flex:1;"><div style="color:#ff9800;font-weight:bold;margin-bottom:5px;">\${nm}</div><div style="font-size:14px;line-height:1.4;">\${tx}</div></div><div style="font-size:10px;opacity:0.7;">Нажми чтобы закрыть</div>\`;
                            dlg.style.display='flex'; dlg.onclick=()=>{dlg.style.display='none';};
                            break;
                        }
                        case 'ui_dialog_hide': { const d=document.getElementById('game-dialog'); if(d) d.style.display='none'; break; }
                        
                        case 'ui_anchor': {
                            const el=document.getElementById(v[0]); const anc=v[1]; const ox=parseFloat(resolveValue(v[2]))||0; const oy=parseFloat(resolveValue(v[3]))||0;
                            if(el){
                                el.style.left='auto'; el.style.right='auto'; el.style.top='auto'; el.style.bottom='auto'; el.style.transform='none'; el.style.position='absolute'; el.style.margin='0';
                                switch(anc){
                                    case 'top-left': el.style.left=ox+'px'; el.style.top=oy+'px'; break;
                                    case 'top-center': el.style.left='50%'; el.style.top=oy+'px'; el.style.transform=\`translateX(calc(-50% + \${ox}px))\`; break;
                                    case 'top-right': el.style.right=ox+'px'; el.style.top=oy+'px'; break;
                                    case 'center-left': el.style.left=ox+'px'; el.style.top='50%'; el.style.transform=\`translateY(calc(-50% + \${oy}px))\`; break;
                                    case 'center': el.style.left='50%'; el.style.top='50%'; el.style.transform=\`translate(calc(-50% + \${ox}px), calc(-50% + \${oy}px))\`; break;
                                    case 'center-right': el.style.right=ox+'px'; el.style.top='50%'; el.style.transform=\`translateY(calc(-50% + \${oy}px))\`; break;
                                    case 'bottom-left': el.style.left=ox+'px'; el.style.bottom=oy+'px'; break;
                                    case 'bottom-center': el.style.left='50%'; el.style.bottom=oy+'px'; el.style.transform=\`translateX(calc(-50% + \${ox}px))\`; break;
                                    case 'bottom-right': el.style.right=ox+'px'; el.style.bottom=oy+'px'; break;
                                    case 'stretch-full': el.style.left='0'; el.style.top='0'; el.style.width='100%'; el.style.height='100%'; break;
                                }
                            }
                            break;
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
                        case 'video_control': {
                            const vid=document.getElementById(v[0]); const act=v[1];
                            if(vid){ if(act==='play')vid.play().catch(e=>{}); else if(act==='pause')vid.pause(); else if(act==='stop'){vid.pause();vid.currentTime=0;} else if(act==='remove')vid.remove(); }
                            break;
                        }
                        case 'video_settings': {
                            const vid=document.getElementById(v[0]);
                            if(vid){ vid.volume=parseFloat(resolveValue(v[1])); vid.loop=(v[2]==='1'||v[2]==='true'); vid.style.opacity=resolveValue(v[3]); }
                            break;
                        }

                        case 'game_pause': {
                            isGamePaused=(v[0]==='1'||v[0]==='true');
                            if(isGamePaused) stage.style.filter='grayscale(100%)'; else stage.style.filter='none';
                            break;
                        }
                        case 'game_restart': {
                            const cur=PROJECT.scenes.find(s=>s.id===currentSceneId);
                            if(cur){ gameVariables={}; activeKeys={}; loadScene(cur.id); return; }
                            break;
                        }
                        case 'game_over_screen': {
                            isGamePaused=true;
                            const scr=document.createElement('div'); scr.style.cssText='position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:9999; color:white;';
                            scr.innerHTML=\`<h1 style="font-size:60px; color:#ff3d00; margin-bottom:20px;">\${resolveValue(v[0])}</h1><button id="btn-restart-go" style="padding:15px 30px; font-size:24px; cursor:pointer; background:#fff; color:#000; border:none; border-radius:5px;">RETRY</button>\`;
                            stage.appendChild(scr);
                            document.getElementById('btn-restart-go').onclick=()=>{ scr.remove(); isGamePaused=false; const cur=PROJECT.scenes.find(s=>s.id===currentSceneId); if(cur){gameVariables={}; loadScene(cur.id);} };
                            break;
                        }

                        case 'pp_filter_set': {
                            const type=v[0]; const val=parseFloat(resolveValue(v[1]));
                            if(w){
                                let f=''; if(type==='blur')f=\`blur(\${val}px)\`; else if(type==='hue-rotate')f=\`hue-rotate(\${val}deg)\`; else if(['contrast','brightness','saturate'].includes(type)) f=\`\${type}(\${val}%)\`; else f=\`\${type}(\${val}%)\`;
                                w.style.filter=f;
                            }
                            break;
                        }
                        case 'pp_vignette': {
                             const on=(v[0]==='1'||v[0]==='true'); const str=parseFloat(resolveValue(v[1])); const col=v[2];
                             const old=document.getElementById('pp-overlay-vignette'); if(old)old.remove();
                             if(on){ const d=document.createElement('div'); d.id='pp-overlay-vignette'; d.style.cssText=\`position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:800; background:radial-gradient(circle, transparent 50%, \${col} 100%); opacity:\${str}; mix-blend-mode:multiply;\`; stage.appendChild(d); }
                             break;
                        }
                        case 'pp_crt_effect': {
                             const on=(v[0]==='1'||v[0]==='true'); const op=parseFloat(resolveValue(v[1]));
                             const old=document.getElementById('pp-overlay-crt'); if(old)old.remove();
                             if(on){ const d=document.createElement('div'); d.id='pp-overlay-crt'; d.style.cssText=\`position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9990; background:linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06)); background-size:100% 4px, 6px 100%; opacity:\${op};\`; stage.appendChild(d); }
                             break;
                        }
                        case 'pp_chromatic': {
                            const on=(v[0]==='1'||v[0]==='true'); const sh=resolveValue(v[1]);
                            if(w){ if(on) w.style.filter=\`drop-shadow(\${sh}px 0 0 rgba(255,0,0,0.5)) drop-shadow(-\${sh}px 0 0 rgba(0,0,255,0.5))\`; else w.style.filter='none'; }
                            break;
                        }
                        case 'pp_bloom_fake': {
                            const on=(v[0]==='1'||v[0]==='true'); const val=parseFloat(resolveValue(v[1]));
                            if(w){ if(on) w.style.filter=\`brightness(\${val}) contrast(1.1) saturate(1.2)\`; else w.style.filter='none'; }
                            break;
                        }
                        case 'pp_clear_all': {
                            if(w){w.style.filter='none'; w.style.textShadow='none';}
                            ['pp-overlay-vignette','pp-overlay-crt'].forEach(id=>{const el=document.getElementById(id); if(el)el.remove();});
                            break;
                        }

                        case 'combat_damage': {
                            const tid=v[0]; const dmg=parseFloat(resolveValue(v[1])); const cnm=v[2];
                            if(!window.entityComponents[tid]) window.entityComponents[tid]={};
                            let hp=window.entityComponents[tid][cnm]; if(hp===undefined)hp=100;
                            window.entityComponents[tid][cnm]=hp-dmg;
                            const el=document.getElementById(tid); if(el){ const of=el.style.filter; el.style.filter='sepia(1) hue-rotate(-50deg) saturate(5)'; setTimeout(()=>el.style.filter=of, 100); }
                            break;
                        }
                        case 'logic_chance': {
                             const p=parseFloat(resolveValue(v[0])); const r=Math.random()*100;
                             gameVariables[v[1]] = (r<p) ? 1 : 0;
                             break;
                        }
                        case 'ai_patrol': {
                            const el=document.getElementById(v[0]); const min=parseFloat(resolveValue(v[1])); const max=parseFloat(resolveValue(v[2])); const spd=parseFloat(resolveValue(v[3]));
                            if(el){
                                let dir=parseFloat(el.dataset.patrolDir||1); let cx=parseFloat(el.style.left||0);
                                cx+=spd*dir;
                                if(cx>=max){ cx=max; dir=-1; el.style.transform='scaleX(-1)'; }
                                else if(cx<=min){ cx=min; dir=1; el.style.transform='scaleX(1)'; }
                                el.style.left=cx+'px'; el.dataset.patrolDir=dir;
                            }
                            break;
                        }

                        case 'scene_load': { const next = PROJECT.scenes.find(s=>s.name===v[0]); if(next) loadScene(next.id); break; }
                        case 'scene_reload': { loadScene(currentSceneId); break; }
                        case 'scene_next': { 
                            const idx = PROJECT.scenes.findIndex(s => s.id === currentSceneId);
                            if (idx !== -1 && idx < PROJECT.scenes.length - 1) loadScene(PROJECT.scenes[idx + 1].id);
                            break;
                        }
                        case 'scene_save_state': {
                             const sn = v[0] || 'autosave'; const sd = { vars: gameVariables, timestamp: Date.now() };
                             localStorage.setItem('ecrous_save_'+PROJECT.settings.name+'_'+sn, JSON.stringify(sd));
                             break;
                        }
                        case 'scene_load_state': {
                             const sn = v[0] || 'autosave'; const raw = localStorage.getItem('ecrous_save_'+PROJECT.settings.name+'_'+sn);
                             if (raw) { const d = JSON.parse(raw); gameVariables = d.vars || {}; updateDynamicText(); }
                             break;
                        }
                        
                        case 'data_save': { localStorage.setItem('ecrous_data_'+PROJECT.settings.name+'_'+v[0], resolveValue(v[1])); break; }
                        case 'data_load': { const val=localStorage.getItem('ecrous_data_'+PROJECT.settings.name+'_'+v[0]); if(val!==null){ gameVariables[v[1]]=isNaN(val)?val:parseFloat(val); updateDynamicText(); } break; }
                        case 'data_clear': { Object.keys(localStorage).forEach(k=>{if(k.startsWith('ecrous_data_'+PROJECT.settings.name))localStorage.removeItem(k);}); break; }
                        
                        case 'phys_enable': { const el=document.getElementById(v[0]); if(el) physicsObjects[v[0]]={ vx:0, vy:0, mass:parseFloat(v[1]), bounce:0, collideWorld:false, width:el.offsetWidth, height:el.offsetHeight }; break; }
                        case 'phys_set_gravity': { worldGravity.x=parseFloat(v[0]); worldGravity.y=parseFloat(v[1]); break; }
                        case 'phys_add_force': { const p=physicsObjects[v[0]]; if(p&&p.mass>0){p.vx+=parseFloat(v[1]); p.vy+=parseFloat(v[2]);} break; }
                        case 'phys_set_velocity': { const p=physicsObjects[v[0]]; if(p){p.vx=parseFloat(v[1]); p.vy=parseFloat(v[2]);} break; }
                        case 'phys_set_bounce': { const p=physicsObjects[v[0]]; if(p) p.bounce=parseFloat(v[1]); break; }
                        case 'phys_collide_world': { const p=physicsObjects[v[0]]; if(p) p.collideWorld=(v[1]==='1'); break; }
                        
                        case 'cam_follow': { cameraState.target=v[0]; cameraState.lerp=parseFloat(v[1]); break; }
                        case 'cam_set_pos': { cameraState.target=null; cameraState.x=parseFloat(v[0]); cameraState.y=parseFloat(v[1]); break; }
                        case 'cam_zoom': { cameraState.zoom=parseFloat(v[0]); break; }
                        case 'cam_shake': { cameraState.shakeInfo={ power:parseFloat(v[0]), time:parseFloat(v[1]) }; break; }
                        case 'cam_reset': { cameraState={x:0,y:0,zoom:1,target:null,lerp:0.1,shakeInfo:{power:0,time:0}}; break; }
                        case 'cam_zoom_to': { const w=document.getElementById('game-world'); if(w){ w.style.transition=\`transform \${v[1]}s ease-in-out\`; cameraState.zoom=parseFloat(v[0]); } break; }

                        case 'sys_exec_js': { 
                            try { const func=new Function('gameVariables','container','window','document', v[0]); func(gameVariables, document.getElementById('game-stage'), window, document); updateDynamicText(); } 
                            catch(e){ console.error(e); } 
                            break; 
                        }
                        
                        case 'logic_obj_exists': { gameVariables[v[1]] = document.getElementById(v[0]) ? 1 : 0; break; }
                        case 'logic_is_visible': { const el=document.getElementById(v[0]); if(!el)gameVariables[v[1]]=0; else { const s=window.getComputedStyle(el); gameVariables[v[1]] = (s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0')?1:0; } break; }
                        case 'interact_dist': { 
                            const a=document.getElementById(v[0]); const b=document.getElementById(v[1]);
                            if(a&&b){ const r1=a.getBoundingClientRect(); const r2=b.getBoundingClientRect(); const dist=Math.sqrt(Math.pow((r2.left+r2.width/2)-(r1.left+r1.width/2),2) + Math.pow((r2.top+r2.height/2)-(r1.top+r1.height/2),2)); gameVariables[v[2]]=dist; }
                            else gameVariables[v[2]]=999999;
                            break;
                        }
                        case 'zone_check': {
                             const me=document.getElementById(v[0]); const zn=document.getElementById(v[1]); let res=0;
                             if(me&&zn){ const r1=me.getBoundingClientRect(); const r2=zn.getBoundingClientRect(); if(!(r2.left>r1.right || r2.right<r1.left || r2.top>r1.bottom || r2.bottom<r1.top)) res=1; }
                             gameVariables[v[2]]=res; break;
                        }
                        
                        case 'state_set': { const el=document.getElementById(v[0]); if(el) el.dataset.state=v[1]; break; }
                        case 'state_get': { const el=document.getElementById(v[0]); gameVariables[v[1]] = el ? el.dataset.state||'' : ''; break; }
                        case 'tag_add': { const el=document.getElementById(v[0]); if(el) el.classList.add('tag_'+v[1]); break; }
                        case 'tag_check': { const el=document.getElementById(v[0]); gameVariables[v[2]] = (el && el.classList.contains('tag_'+v[1])) ? 1 : 0; break; }
                        
                        case 'ai_move_to': {
                             const me=document.getElementById(v[0]); const trg=document.getElementById(v[1]); const sp=parseFloat(v[2]);
                             if(me&&trg){
                                 const mx=parseFloat(me.style.left||0); const my=parseFloat(me.style.top||0);
                                 const tx=parseFloat(trg.style.left||0); const ty=parseFloat(trg.style.top||0);
                                 const dx=tx-mx; const dy=ty-my; const d=Math.sqrt(dx*dx+dy*dy);
                                 if(d>sp){ me.style.left=mx+(dx/d)*sp+'px'; me.style.top=my+(dy/d)*sp+'px'; }
                             }
                             break;
                        }
                        case 'ai_flee': {
                             const me=document.getElementById(v[0]); const trg=document.getElementById(v[1]); const sp=parseFloat(v[2]);
                             if(me&&trg){
                                 const mx=parseFloat(me.style.left||0); const my=parseFloat(me.style.top||0);
                                 const tx=parseFloat(trg.style.left||0); const ty=parseFloat(trg.style.top||0);
                                 const dx=mx-tx; const dy=my-ty; const d=Math.sqrt(dx*dx+dy*dy);
                                 if(d>0){ me.style.left=mx+(dx/d)*sp+'px'; me.style.top=my+(dy/d)*sp+'px'; }
                             }
                             break;
                        }
                        
                        case 'input_axis': { let val=0; if(activeKeys[v[0]])val-=1; if(activeKeys[v[1]])val+=1; gameVariables[v[2]]=val; break; }
                        
                        case 'fx_screen_color': {
                            const col=v[0]; const tm=parseFloat(v[1])*1000;
                            let ov=document.getElementById('fx-overlay-color');
                            if(!ov){ ov=document.createElement('div'); ov.id='fx-overlay-color'; ov.style.cssText='position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9999; transition:background '+tm/2+'ms'; stage.appendChild(ov); }
                            ov.style.background=col; setTimeout(()=>ov.style.background='transparent', tm);
                            break;
                        }
                        case 'fx_shake': {
                             const el=document.getElementById(v[0]); const p=parseFloat(v[1]); const dur=parseFloat(v[2])*1000;
                             if(el){
                                 const start=Date.now(); const org=el.style.transform;
                                 const i=setInterval(()=>{
                                     if(Date.now()-start>dur){ clearInterval(i); el.style.transform=org; return; }
                                     el.style.transform=\`\${org} translate(\${(Math.random()-0.5)*p}px, \${(Math.random()-0.5)*p}px)\`;
                                 }, 16);
                             }
                             break;
                        }
                        
                        case 'obj_spawn_clone': {
                             const org=document.getElementById(v[0]); const nm=resolveValue(v[1]); const x=parseFloat(resolveValue(v[2])); const y=parseFloat(resolveValue(v[3]));
                             if(org){ const c=org.cloneNode(true); c.id=nm; c.style.left=x+'px'; c.style.top=y+'px'; c.style.display='block'; c.classList.remove('ui-draggable','ui-draggable-handle'); w.appendChild(c); }
                             break;
                        }
                        
                        case 'comp_add': case 'comp_set': { if(!window.entityComponents[v[0]])window.entityComponents[v[0]]={}; window.entityComponents[v[0]][v[1]]=resolveValue(v[2]); break; }
                        case 'comp_get': { gameVariables[v[2]] = (window.entityComponents[v[0]] && window.entityComponents[v[0]][v[1]] !== undefined) ? window.entityComponents[v[0]][v[1]] : 0; break; }
                        case 'comp_has': { gameVariables[v[2]] = (window.entityComponents[v[0]] && window.entityComponents[v[0]][v[1]] !== undefined) ? 1 : 0; break; }
                        
                        case 'evt_message_send': {
                             const en=resolveValue(v[0]); gameVariables['event_param']=resolveValue(v[1]);
                             if(globalCurrentSceneData){
                                 globalCurrentSceneData.objects.forEach(o=>{
                                     if(!o.scripts)return;
                                     o.scripts.filter(b=>b.type==='evt_message_receive'&&b.values[0]===en).forEach(bl=>executeChain(bl,o.scripts,o.connections||[]));
                                 });
                             }
                             break;
                        }
                        
                        case 'gfx_light_ambient': { const a=1.0-parseFloat(v[0]); let l=document.getElementById('gfx-ambient'); if(!l){ l=document.createElement('div'); l.id='gfx-ambient'; l.style.cssText='position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:500; mix-blend-mode:multiply;'; stage.appendChild(l); } l.style.backgroundColor=\`rgba(0,0,0,\${a})\`; break; }
                        
                        case 'gfx_light_point': { const el=document.getElementById(v[0]); if(el){ const rad=v[2]+'px'; el.style.boxShadow=\`0 0 \${rad} \${parseFloat(rad)/4}px \${v[1]}\`; el.style.zIndex='501'; } break; }
                        
                        case 'gfx_particles': {
                             const x=parseFloat(v[0]); const y=parseFloat(v[1]); const col=v[2]; const cnt=parseInt(v[3]);
                             for(let i=0;i<cnt;i++){
                                 const p=document.createElement('div'); p.style.cssText=\`position:absolute; left:\${x}px; top:\${y}px; width:4px; height:4px; background:\${col}; border-radius:50%; pointer-events:none; z-index:1000;\`; stage.appendChild(p);
                                 const ang=Math.random()*Math.PI*2; const spd=Math.random()*50+20;
                                 const tx=Math.cos(ang)*spd; const ty=Math.sin(ang)*spd;
                                 p.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:\`translate(\${tx}px,\${ty}px) scale(0)\`,opacity:0}],{duration:500+Math.random()*500,easing:'ease-out'}).onfinish=()=>p.remove();
                             }
                             break;
                        }
                        
                        case 'inv_add': { const i=resolveValue(v[0]); if(!window.gameInventory.includes(i)) window.gameInventory.push(i); break; }
                        case 'inv_has': { gameVariables[v[1]] = window.gameInventory.includes(resolveValue(v[0]))?1:0; break; }
                        case 'quest_set': { window.gameQuests[v[0]]=resolveValue(v[1]); break; }

                        case 'evt_wait': { await new Promise(r => setTimeout(r, parseFloat(v[0]) * 1000)); break; }
                    }
                    resolve();
                }, 10);
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

	// --- ПРИМЕНЕНИЕ НАСТРОЕК ---
	const orient = projectData.settings?.orientation || 'landscape'
	const pkgId = projectData.settings?.packageId || 'com.ecrous.game'
	const appName = projectData.settings?.name || 'Game'

	// Формируем манифест
	const manifest = {
		name: appName,
		short_name: appName,
		id: pkgId, // Используем Package ID
		start_url: './index.html',
		display: 'standalone',
		orientation: orient, // Применяем ориентацию (portrait/landscape/any)
		background_color: '#000000',
		theme_color: '#000000',
		icons: [{ src: 'icon.png', sizes: '512x512', type: 'image/png' }],
	}

	zip.file('index.html', html)

	if (projectData.assets) {
		for (const asset of projectData.assets) {
			if (asset.data.startsWith('data:')) {
				const [, base64] = asset.data.split('base64,')
				const binary = atob(base64)
				const array = new Uint8Array(binary.length)
				for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
				const blob = new Blob([array], { type: asset.type })
				zip.file(`assets/${asset.name}`, blob)
			}
		}
	}

	zip.file('manifest.json', JSON.stringify(manifest, null, 2))

	const [, iconData] = iconBase64.split('base64,')
	zip.file('icon.png', iconData, { base64: true })

	zip.generateAsync({ type: 'blob' }).then(content => {
		downloadFile(`Game_${platform}.zip`, content, 'application/zip')
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
	alert('Экспорт в EXE требует внешнего упаковщика. Скачан HTML.')
	document.getElementById('exportWindows').click()
}

function downloadFile(filename, content, mimeType) {
	const blob = new Blob([content], { type: mimeType })
	const a = document.createElement('a')
	a.href = URL.createObjectURL(blob)
	a.download = filename
	a.click()
}
