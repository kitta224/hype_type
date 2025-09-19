// Upgrade UI Manager
// Handles upgrade overlay display, node management, and UI interactions

import { updatePauseMenu } from './uiManager.js';

let upgradeData = null;
let upgradePoints = 0;
let acquiredUpgrades = new Set();

// デバッグ用にグローバルに公開
window.hypeType = window.hypeType || {};
window.hypeType.upgradePoints = upgradePoints;
window.hypeType.acquiredUpgrades = acquiredUpgrades;

class UpgradeUI {
    constructor() {
        this.overlay = null;
        this.sidePanel = null;
        this.nodesRoot = null;
        this.edgesSvg = null;
        this.closeBtn = null;
        this.protocolSidebar = null;
        this.protocolList = null;
        this.upgradePointsEl = null;
        this.canvasWrap = null;
        this.scale = 1;
        this.ox = 0;
        this.oy = 0;
        this.dragging = false;
        this.sx = 0;
        this.sy = 0;
        this.tree = null;
        this.cards = null;
        this.byId = null;
    }

    async init() {
        // Load upgrade data
        await this.loadUpgradeData();

        // DOM elements
        this.overlay = document.getElementById('upgradeOverlay');
        this.sidePanel = document.getElementById('protocolSidebar');
        this.nodesRoot = document.getElementById('upgradeNodes');
        this.edgesSvg = document.getElementById('upgradeEdges');
        this.closeBtn = document.getElementById('closeUpgrade');
        this.protocolList = document.getElementById('protocolList');
        this.upgradePointsEl = document.getElementById('upgradePoints');
        this.canvasWrap = document.getElementById('upgradeCanvasWrap');

        // Event listeners
        if (this.closeBtn) this.closeBtn.onclick = () => this.closeUpgradeOverlay();
        if (this.canvasWrap) {
            this.canvasWrap.onwheel = (ev) => this.handleWheel(ev);
            this.canvasWrap.onmousedown = (ev) => this.startDrag(ev);
            window.onmouseup = () => this.endDrag();
            window.onmousemove = (ev) => this.handleDrag(ev);
        }
    }

    async loadUpgradeData() {
        try {
            const res = await fetch('jsons/upgrades.json');
            upgradeData = await res.json();
        } catch (e) {
            console.error('Failed to load upgrades.json', e);
            upgradeData = { trees: [] };
        }
    }

    // Upgrade overlay functions
    openUpgradeOverlay() {
        if (!this.overlay) return;
        this.overlay.style.display = 'block';
        window.gamePaused = true;
        this.updateUpgradeSidePanel();
        // アップグレード画面を開くたびにUIを再構築して最新の状態を反映
        this.buildUpgradeUI();
        // BGM一時停止と効果音再生
        if (typeof bgmManager !== 'undefined' && bgmManager.pause) {
            bgmManager.pause();
        }
        if (typeof se !== 'undefined' && se.play) {
            se.play('info.mp3');
        }
    }

    toggleProtocols() {
        if (!this.sidePanel) return;
        this.sidePanel.style.display = (this.sidePanel.style.display === 'none' || !this.sidePanel.style.display) ? 'block' : 'none';
    }

    closeUpgradeOverlay() {
        if (!this.overlay) return;
        this.overlay.style.display = 'none';
        window.gamePaused = false;
        // BGM再開
        if (typeof bgmManager !== 'undefined' && bgmManager.resume) {
            bgmManager.resume();
        }
    }

    updateUpgradeSidePanel() {
        if (this.upgradePointsEl) this.upgradePointsEl.textContent = String(upgradePoints);
    }

    buildUpgradeUI() {
        if (!this.nodesRoot || !this.edgesSvg || !upgradeData || !upgradeData.trees || !upgradeData.trees.length) return;
        this.nodesRoot.innerHTML = '';
        this.edgesSvg.innerHTML = '';

        const tree = upgradeData.trees[0];

        // Fixed logical layout size
        const LAYOUT_W = 1000, LAYOUT_H = 600;
        this.nodesRoot.style.width = LAYOUT_W + 'px';
        this.nodesRoot.style.height = LAYOUT_H + 'px';

        // Zoom/Pan support
        this.applyTransform();

        // Map for ids + compute layers and layout positions
        const byId = new Map();
        tree.nodes.forEach(n => byId.set(n.id, n));
        const layerCache = new Map();
        function getLayer(n) {
            if (!n) return 0;
            if (layerCache.has(n.id)) return layerCache.get(n.id);
            const req = n.requires || {};
            let deps = [];
            if (Array.isArray(req)) {
                deps = req; // 旧形式
            } else if (req.and) {
                deps = req.and;
            } else if (req.or) {
                deps = req.or;
            }
            let L = 0;
            if (deps.length > 0) {
                L = Math.max(0, ...deps.map(pid => getLayer(byId.get(pid)))) + 1;
            }
            layerCache.set(n.id, L);
            return L;
        }
        tree.nodes.forEach(n => getLayer(n));
        const maxLayer = Math.max(0, ...Array.from(layerCache.values()));
        const layoutPos = new Map();
        for (let L = 0; L <= maxLayer; L++) {
            const group = tree.nodes.filter(n => layerCache.get(n.id) === L);
            const count = Math.max(1, group.length);
            // ノード間の距離を大幅に広げる
            const marginX = 150, marginY = 120;
            // レイヤーごとに固定の高さ間隔を使用
            const layerHeight = 180; // 各レイヤーの高さ間隔
            const y = marginY + L * layerHeight;
            group.forEach((n, idx) => {
                // ノードごとに固定の幅間隔を使用
                const nodeSpacing = 250; // ノード間の最小間隔
                const totalWidth = (count - 1) * nodeSpacing;
                const startX = (LAYOUT_W - totalWidth) / 2;
                const x = startX + idx * nodeSpacing;
                layoutPos.set(n.id, { x, y });
            });
        }

        // Create nodes
        const cards = [];
        tree.nodes.forEach(n => {
            const card = document.createElement('div');
            card.className = 'node-card';
            card.dataset.nodeId = n.id;
            const pos = layoutPos.get(n.id);
            card.style.left = pos.x + 'px';
            card.style.top = pos.y + 'px';

            const head = document.createElement('div');
            head.className = 'head';
            const title = document.createElement('div');
            title.className = 'title';
            title.textContent = n.name;
            const icon = document.createElement('div');
            icon.className = 'icon';
            icon.textContent = n.icon || '';
            head.appendChild(title);
            head.appendChild(icon);

            const body = document.createElement('div');
            body.className = 'body';
            body.textContent = n.description || '';

            const foot = document.createElement('div');
            foot.className = 'footer';
            const btn = document.createElement('button');
            btn.className = 'btn';
            const costText = n.cost ? ` (${n.cost})` : '';
            btn.textContent = acquiredUpgrades.has(n.id) ? 'OWNED' : (this.canPurchaseNode(n) ? `SELECT${costText}` : `LOCKED${costText}`);
            btn.disabled = !this.canPurchaseNode(n) || acquiredUpgrades.has(n.id);
            btn.addEventListener('click', () => {
                if (!this.canPurchaseNode(n)) return;
                this.acquireNode(n);
                this.buildUpgradeUI();
                this.updateUpgradeSidePanel();
            });
            foot.appendChild(btn);

            card.appendChild(head);
            card.appendChild(body);
            card.appendChild(foot);

            if (!this.canPurchaseNode(n)) card.classList.add('locked');
            if (acquiredUpgrades.has(n.id)) card.classList.add('acquired');

            this.nodesRoot.appendChild(card);
            // Center anchor
            const cw = card.offsetWidth || 240, ch = card.offsetHeight || 120;
            card.style.left = (parseFloat(card.style.left) - cw / 2) + 'px';
            card.style.top = (parseFloat(card.style.top) - ch / 2) + 'px';
            cards.push(card);
        });

        this.tree = tree;
        this.cards = cards;
        this.byId = byId;
        this.runLayout(cards);
        this.drawEdges();
    }

    runLayout(cards) {
        // Skip if not visible
        if (this.nodesRoot.offsetWidth === 0 || this.nodesRoot.offsetHeight === 0) return;
        for (let iter = 0; iter < 50; iter++) {
            let moved = false;
            for (let i = 0; i < cards.length; i++) {
                for (let j = i + 1; j < cards.length; j++) {
                    const a = cards[i], b = cards[j];
                    const ar = { left: a.offsetLeft, top: a.offsetTop, right: a.offsetLeft + a.offsetWidth, bottom: a.offsetTop + a.offsetHeight };
                    const br = { left: b.offsetLeft, top: b.offsetTop, right: b.offsetLeft + b.offsetWidth, bottom: b.offsetTop + b.offsetHeight };
                    const overlapX = Math.max(0, Math.min(ar.right, br.right) - Math.max(ar.left, br.left));
                    const overlapY = Math.max(0, Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top));
                    if (overlapX > 0 && overlapY > 0) {
                        const dx = (ar.left + ar.right) / 2 - (br.left + br.right) / 2;
                        const dy = (ar.top + ar.bottom) / 2 - (br.top + br.bottom) / 2;
                        // 押し出し距離をさらに増やしてノード間の距離を広げる
                        const pushX = (dx >= 0 ? 1 : -1) * (overlapX / 2 + 20);
                        const pushY = (dy >= 0 ? 1 : -1) * (overlapY / 2 + 20);
                        a.style.left = (a.offsetLeft + pushX) + 'px';
                        a.style.top = (a.offsetTop + pushY) + 'px';
                        b.style.left = (b.offsetLeft - pushX) + 'px';
                        b.style.top = (b.offsetTop - pushY) + 'px';
                        moved = true;
                    }
                }
            }
            if (!moved) break;
        }
        this.drawEdges();
    }

    drawEdges() {
        if (!this.tree || !this.cards || !this.byId) return;
        this.edgesSvg.innerHTML = '';
        const cardElById = new Map();
        this.cards.forEach(el => cardElById.set(el.dataset.nodeId, el));
        const pt = this.edgesSvg.createSVGPoint();
        const toSvg = (x, y) => {
            pt.x = x; pt.y = y;
            const ctm = this.edgesSvg.getScreenCTM();
            if (!ctm) {
                // SVGがまだレンダリングされていない場合、相対座標を使用
                const rect = this.edgesSvg.getBoundingClientRect();
                return { x: x - rect.left, y: y - rect.top };
            }
            const p = pt.matrixTransform(ctm.inverse());
            return { x: p.x, y: p.y };
        };
        this.tree.nodes.forEach(n => {
            const req = n.requires || {};
            let deps = [];
            if (Array.isArray(req)) {
                deps = req; // 旧形式
            } else if (req.and) {
                deps = req.and;
            } else if (req.or) {
                deps = req.or;
            }
            if (deps.length === 0) return;
            const toEl = cardElById.get(n.id);
            if (!toEl) return;
            const tr = toEl.getBoundingClientRect();
            const c2 = toSvg(tr.left + tr.width / 2, tr.top + tr.height / 2);
            const toRadius = Math.min(tr.width, tr.height) / 2 * 0.8; // ノード半径の80%
            deps.forEach(pid => {
                const fromEl = cardElById.get(pid);
                if (!fromEl) return;
                const fr = fromEl.getBoundingClientRect();
                const c1 = toSvg(fr.left + fr.width / 2, fr.top + fr.height / 2);
                const fromRadius = Math.min(fr.width, fr.height) / 2 * 0.8;

                // ノード境界から線を開始/終了する位置を計算
                const dx = c2.x - c1.x;
                const dy = c2.y - c1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist === 0) return; // 同じ位置の場合スキップ

                const startX = c1.x + (dx / dist) * fromRadius;
                const startY = c1.y + (dy / dist) * fromRadius;
                const endX = c2.x - (dx / dist) * toRadius;
                const endY = c2.y - (dy / dist) * toRadius;

                const midx = (startX + endX) / 2;
                const d = `M ${startX} ${startY} L ${midx} ${startY} L ${midx} ${endY} L ${endX} ${endY}`;
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('class', 'edge-path');
                path.setAttribute('d', d);
                // ORロジックの場合に点線を適用
                if (req.or && req.or.includes(pid)) {
                    path.setAttribute('stroke-dasharray', '5,5');
                }
                this.edgesSvg.appendChild(path);
            });
        });
    }

    canPurchaseNode(node) {
        if (acquiredUpgrades.has(node.id)) return false;
        if ((node.cost || 0) > upgradePoints) return false;
        const req = node.requires || [];
        if (Array.isArray(req)) {
            // 旧形式: 配列の場合 (and)
            return req.every(id => acquiredUpgrades.has(id));
        } else if (typeof req === 'object') {
            // 新形式: オブジェクトの場合
            if (req.and) {
                return req.and.every(id => acquiredUpgrades.has(id));
            } else if (req.or) {
                return req.or.some(id => acquiredUpgrades.has(id));
            }
        }
        return true; // 依存なし
    }

    acquireNode(node) {
        upgradePoints -= (node.cost || 0);
        acquiredUpgrades.add(node.id);
        this.applyNodeEffects(node);
        // Append to protocols list
        if (this.protocolList) {
            const li = document.createElement('li');
            li.textContent = node.name;
            this.protocolList.appendChild(li);
        }
    }

    applyNodeEffects(node) {
        if (!node.effects) return;
        node.effects.forEach(e => {
            if (e.kind === 'stat' && e.target && (e.op === 'add' || e.op === 'mul')) {
                // weapon.* stats
                if (e.target.startsWith('weapon.')) {
                    const key = e.target.slice('weapon.'.length);
                    if (e.op === 'add') {
                        window.hypeType.weapon.setBase(key, (window.hypeType.weapon.base[key] || 0) + e.value);
                    } else if (e.op === 'mul') {
                        window.hypeType.weapon.setMul(key, (window.hypeType.weapon.mul[key] || 1) * e.value);
                    }
                }
            } else if (e.kind === 'special') {
                if ((e.type === 'status_tuning' || e.type === 'status_base_add') && e.path) {
                    const [stype, skey] = e.path.split('.');
                    if (e.type === 'status_tuning') {
                        // multiply or add tuning value
                        if (e.op === 'mul') {
                            Enemy.statusTuning[stype][skey] = (Enemy.statusTuning[stype][skey] || 1) * e.value;
                        } else if (e.op === 'add') {
                            Enemy.statusTuning[stype][skey] = (Enemy.statusTuning[stype][skey] || 0) + e.value;
                        }
                    } else if (e.type === 'status_base_add') {
                        // change absolute base
                        if (e.op === 'mul') {
                            Enemy.statusBase[stype][skey] = (Enemy.statusBase[stype][skey] || 0) * e.value;
                        } else if (e.op === 'add') {
                            Enemy.statusBase[stype][skey] = (Enemy.statusBase[stype][skey] || 0) + e.value;
                        }
                    }
                }
            }
        });
    }

    // Zoom/Pan handlers
    handleWheel(ev) {
        ev.preventDefault();
        const ds = Math.exp(-ev.deltaY * 0.001);
        this.scale = Math.max(0.6, Math.min(2.0, this.scale * ds));
        this.applyTransform();
    }

    startDrag(ev) {
        this.dragging = true;
        this.sx = ev.clientX;
        this.sy = ev.clientY;
    }

    endDrag() {
        this.dragging = false;
    }

    handleDrag(ev) {
        if (!this.dragging) return;
        this.ox += ev.clientX - this.sx;
        this.oy += ev.clientY - this.sy;
        this.sx = ev.clientX;
        this.sy = ev.clientY;
        this.applyTransform();
    }

    applyTransform() {
        this.nodesRoot.style.transform = `translate(${this.ox}px, ${this.oy}px) scale(${this.scale})`;
        // Redraw edges
        this.drawEdges();
    }

    // Integration with wave system
    setupWaveIntegration(wave) {
        const __origOnEnemyDefeated = (typeof wave.onEnemyDefeated === 'function') ? wave.onEnemyDefeated.bind(wave) : null;
        wave.onEnemyDefeated = function() {
            if (__origOnEnemyDefeated) __origOnEnemyDefeated();
            upgradePoints += 1;
            this.updateUpgradeSidePanel();
        }.bind(this);
    }

    // 初期ポイントを設定
    setInitialPoints(points) {
        upgradePoints = points;
        this.updateUpgradeSidePanel();
    }
}

const upgradeUI = new UpgradeUI();
export default upgradeUI;
export { upgradeData, upgradePoints, acquiredUpgrades };