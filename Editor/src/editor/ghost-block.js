function createBlockGhost(typeId, label, color, icon) {
	const ghost = document.createElement('div')
	ghost.className = 'node-block'
	ghost.style.position = 'absolute'
	ghost.style.top = '-1000px'
	ghost.style.left = '-1000px'
	ghost.style.zIndex = '9999'
	document.body.appendChild(ghost)

	const def = BLOCK_DEFINITIONS.find(b => b.id === typeId)

	if (def) {
		let inputsHTML = ''
		if (def.inputs) {
			def.inputs.forEach(inp => {
				inputsHTML += `<div class="input-row"><span>${
					inp.label || inp.name
				}</span><input type="text" class="node-input" value="${
					inp.default
				}" disabled></div>`
			})
		}

		ghost.innerHTML = `
            <div class="node-header" style="border-left: 4px solid ${def.color}">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i class="${def.icon}"></i> <span>${def.label}</span>
                </div>
            </div>
            <div class="node-content">${inputsHTML}</div>
        `
	} else {
		ghost.innerHTML = `
            <div class="node-header" style="border-left: 4px solid ${color}">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i class="${icon}"></i> <span>${label}</span>
                </div>
            </div>
            <div class="node-content">
                <div class="input-row" style="justify-content:center; color:var(--text-soft)">
                    <i class="ri-stack-line"></i> Группа блоков
                </div>
            </div>
        `
	}
	return ghost
}
