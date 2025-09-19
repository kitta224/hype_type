// Upgrade Tree Editor (Browser)
// - Load from game jsons/upgrades.json (same origin)
// - Open local file
// - Save as download
// - Graphical editing of nodes (drag to move, inspector to edit)
// - Parents (requires) and effects editable

let data = { trees: [ { id: 'main', name: 'Main', nodes: [] } ] };
let currentTreeIndex = 0;
let selectedNodeId = null;

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const nodesRoot = $('#nodes');
const edgesSvg = $('#edges');
const treeSelect = $('#treeSelect');

const propId = $('#propId');
const propName = $('#propName');
const propIcon = $('#propIcon');
const propDesc = $('#propDesc');
const propCost = $('#propCost');
const propMaxLv = $('#propMaxLv');
const requiresList = $('#requiresList');
const reqLogic = $('#reqLogic');
const effectsList = $('#effectsList');

const tplNode = document.getElementById('tplNode');
const tplEffect = document.getElementById('tplEffect');

const LAYOUT_W = 1000, LAYOUT_H = 600;
let view = { scale: 1, ox: 0, oy: 0 };

function getTree(){ return data.trees[currentTreeIndex]; }
function getNodeById(id){ return getTree().nodes.find(n => n.id === id); }

function refreshTreeSelect(){
  treeSelect.innerHTML = '';
  data.trees.forEach((t, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = t.name || t.id || `Tree ${i+1}`;
    treeSelect.appendChild(opt);
  });
  treeSelect.value = String(currentTreeIndex);
  $('#treeName').value = getTree().name || '';
  $('#lblTreeName').textContent = getTree().name || getTree().id || '';
}

function rebuildNodes(){
   nodesRoot.innerHTML = '';
   nodesRoot.style.width = LAYOUT_W + 'px';
   nodesRoot.style.height = LAYOUT_H + 'px';
   const t = getTree();

   // レイヤー計算（upgradeUI.js と同じロジック）
   const byId = new Map();
   t.nodes.forEach(n => byId.set(n.id, n));
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
   t.nodes.forEach(n => getLayer(n));
   const maxLayer = Math.max(0, ...Array.from(layerCache.values()));
   const layoutPos = new Map();
   for (let L = 0; L <= maxLayer; L++) {
       const group = t.nodes.filter(n => layerCache.get(n.id) === L);
       const count = Math.max(1, group.length);
       const marginX = 150, marginY = 120;
       const layerHeight = 180;
       const y = marginY + L * layerHeight;
       group.forEach((n, idx) => {
           const nodeSpacing = 250;
           const totalWidth = (count - 1) * nodeSpacing;
           const startX = (LAYOUT_W - totalWidth) / 2;
           const x = startX + idx * nodeSpacing;
           layoutPos.set(n.id, { x, y });
       });
   }

   // create cards
   const cards = [];
   t.nodes.forEach(n => {
       // init defaults
       if (Array.isArray(n.requires)) {
           // 旧形式を新形式に変換
           n.requires = { and: n.requires };
       }
       n.requires = n.requires || { and: [] };
       n.effects = n.effects || [];

       const el = tplNode.content.firstElementChild.cloneNode(true);
       el.dataset.nodeId = n.id;
       el.querySelector('.title').textContent = n.name || n.id;
       el.querySelector('.icon').textContent = n.icon || '⚙️';
       el.querySelector('.body').textContent = n.description || '';

       // 自動配置を使用
       const pos = layoutPos.get(n.id);
       if (pos) {
           el.style.left = `${pos.x}px`;
           el.style.top = `${pos.y}px`;
       } else {
           el.style.left = `${LAYOUT_W / 2}px`;
           el.style.top = `${LAYOUT_H / 2}px`;
       }

       el.addEventListener('mousedown', startDrag);
       el.addEventListener('click', () => selectNode(n.id));

       nodesRoot.appendChild(el);
       cards.push(el);
   });

   // 自動レイアウト実行
   runLayout(cards);
   drawEdges();
   updateStats();
}

function runLayout(cards) {
    // Skip if not visible
    if (nodesRoot.offsetWidth === 0 || nodesRoot.offsetHeight === 0) return;
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
}

function drawEdges(){
  edgesSvg.innerHTML = '';
  const cardById = new Map();
  $$('#nodes .node-card').forEach(el => cardById.set(el.dataset.nodeId, el));

  const pt = edgesSvg.createSVGPoint();
  const toSvg = (x,y) => {
    pt.x = x; pt.y = y;
    const ctm = edgesSvg.getScreenCTM();
    if (!ctm) {
      // SVGがまだレンダリングされていない場合、相対座標を使用
      const rect = edgesSvg.getBoundingClientRect();
      return { x: x - rect.left, y: y - rect.top };
    }
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const t = getTree();
  t.nodes.forEach(n => {
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
      const toEl = cardById.get(n.id);
      if (!toEl) return;
      const tr = toEl.getBoundingClientRect();
      const c2 = toSvg(tr.left + tr.width/2, tr.top + tr.height/2);
      const toRadius = Math.min(tr.width, tr.height) / 2 * 0.8;
      deps.forEach(pid => {
          const fromEl = cardById.get(pid);
          if (!fromEl) return;
          const fr = fromEl.getBoundingClientRect();
          const c1 = toSvg(fr.left + fr.width/2, fr.top + fr.height/2);
          const fromRadius = Math.min(fr.width, fr.height) / 2 * 0.8;

          const dx = c2.x - c1.x;
          const dy = c2.y - c1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) return;

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
          edgesSvg.appendChild(path);
      });
  });
}

function selectNode(id){
  selectedNodeId = id;
  $$('#nodes .node-card').forEach(el => el.classList.toggle('selected', el.dataset.nodeId === id));
  const n = getNodeById(id);
  if (!n) return;
  propId.value = n.id || '';
  propName.value = n.name || '';
  propIcon.value = n.icon || '';
  propDesc.value = n.description || '';
  propCost.value = n.cost != null ? n.cost : 0;
  propMaxLv.value = n.maxLevel != null ? n.maxLevel : 1;
  reqLogic.value = n.requires && n.requires.or ? 'or' : 'and';
  buildRequiresEditor(n);
  buildEffectsEditor(n);
  $('#btnRemoveNode').disabled = false;
}

function buildRequiresEditor(n){
  requiresList.innerHTML = '';
  const t = getTree();
  // 選択中のノード以外を親候補に
  const candidates = t.nodes.filter(x => x.id !== n.id);
  const logic = reqLogic.value; // 'and' or 'or'
  const reqList = n.requires[logic] || [];
  candidates.forEach(c => {
    const row = document.createElement('div');
    row.className = 'req-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = reqList.includes(c.id);
    const label = document.createElement('label'); label.textContent = c.name || c.id;
    cb.addEventListener('change', ()=>{
      const currentLogic = reqLogic.value;
      n.requires = n.requires || { and: [], or: [] };
      const list = n.requires[currentLogic] || [];
      if (cb.checked) {
        if (!list.includes(c.id)) list.push(c.id);
      } else {
        n.requires[currentLogic] = list.filter(x => x !== c.id);
      }
      drawEdges();
      saveInspector();
    });
    row.appendChild(cb); row.appendChild(label);
    requiresList.appendChild(row);
  });
}

function buildEffectsEditor(n){
  effectsList.innerHTML = '';
  (n.effects||[]).forEach((e, idx) => addEffectRow(e, idx));
}

function addEffectRow(eff = { kind:'stat', target:'weapon.bulletDamage', op:'add', value:1 }, index){
  const node = tplEffect.content.firstElementChild.cloneNode(true);
  node.querySelector('.ef-kind').value = eff.kind || 'stat';
  node.querySelector('.ef-target').value = eff.target || '';
  node.querySelector('.ef-op').value = eff.op || 'add';
  node.querySelector('.ef-value').value = eff.value != null ? eff.value : '';
  node.querySelector('.ef-del').addEventListener('click', ()=>{
    const n = getNodeById(selectedNodeId); if (!n) return;
    (n.effects||[]).splice(index, 1);
    buildEffectsEditor(n);
    saveInspector();
  });
  // listeners
  node.querySelectorAll('select, input').forEach(inp => {
    inp.addEventListener('input', ()=>{
      const n = getNodeById(selectedNodeId); if (!n) return;
      n.effects = n.effects || [];
      n.effects[index] = {
        kind: node.querySelector('.ef-kind').value,
        target: node.querySelector('.ef-target').value,
        op: node.querySelector('.ef-op').value,
        value: parseFloat(node.querySelector('.ef-value').value)
      };
      saveInspector();
    });
  });
  effectsList.appendChild(node);
}

// Drag to move
let dragState = null;
function startDrag(e){
  if (!(e.target.closest('.node-card'))) return;
  const el = e.currentTarget;
  dragState = {
    el,
    startX: e.clientX,
    startY: e.clientY,
    origLeft: el.offsetLeft,
    origTop: el.offsetTop
  };
  el.style.cursor = 'grabbing';
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', endDrag);
}
function onDrag(e){
  if (!dragState) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  const nx = dragState.origLeft + dx;
  const ny = dragState.origTop + dy;
  dragState.el.style.left = nx + 'px';
  dragState.el.style.top = ny + 'px';
  drawEdges();
}
function endDrag(){
   if (!dragState) return;
   dragState.el.style.cursor = 'grab';
   dragState = null;
   drawEdges();
}

// Zoom/Pan
const wrap = document.getElementById('canvasWrap');
wrap.addEventListener('wheel', (ev)=>{
  ev.preventDefault();
  const ds = Math.exp(-ev.deltaY * 0.001);
  view.scale = Math.max(0.6, Math.min(2.0, view.scale * ds));
  applyView();
});
let pan = null;
wrap.addEventListener('mousedown', (ev)=>{
  if (ev.target.closest('.node-card')) return; // ignore when dragging node
  pan = { x: ev.clientX, y: ev.clientY, ox: view.ox, oy: view.oy };
});
window.addEventListener('mousemove', (ev)=>{
  if (!pan) return;
  view.ox = pan.ox + (ev.clientX - pan.x);
  view.oy = pan.oy + (ev.clientY - pan.y);
  applyView();
});
window.addEventListener('mouseup', ()=> pan = null);
function applyView(){
  nodesRoot.style.transform = `translate(${view.ox}px, ${view.oy}px) scale(${view.scale})`;
  drawEdges();
}

// Inspector save
function saveInspector(){
  if (!selectedNodeId) return;
  const n = getNodeById(selectedNodeId); if (!n) return;
  n.id = propId.value.trim();
  n.name = propName.value.trim();
  n.icon = propIcon.value.trim();
  n.description = propDesc.value;
  n.cost = parseInt(propCost.value||'0', 10);
  n.maxLevel = parseInt(propMaxLv.value||'1', 10);
  // rebuild titles/icons text live
  const el = $(`#nodes .node-card[data-node-id="${CSS.escape(selectedNodeId)}"]`);
  if (el){
    el.querySelector('.title').textContent = n.name || n.id;
    el.querySelector('.icon').textContent = n.icon || '⚙️';
    el.querySelector('.body').textContent = n.description || '';
  }
  drawEdges();
  updateStats();
}

// Effects add
$('#btnAddEffect').addEventListener('click', ()=>{
  const n = getNodeById(selectedNodeId); if (!n) return;
  n.effects = n.effects || [];
  n.effects.push({ kind:'stat', target:'weapon.bulletDamage', op:'add', value:1 });
  buildEffectsEditor(n);
  saveInspector();
});

// Tree add/remove
$('#btnAddTree').addEventListener('click', ()=>{
  data.trees.push({ id: `tree_${Date.now()}`, name: 'New Tree', nodes: [] });
  currentTreeIndex = data.trees.length - 1;
  refreshTreeSelect();
  rebuildNodes();
});
$('#btnRemoveTree').addEventListener('click', ()=>{
  if (data.trees.length <= 1) return;
  data.trees.splice(currentTreeIndex, 1);
  currentTreeIndex = 0;
  refreshTreeSelect();
  rebuildNodes();
});
$('#treeSelect').addEventListener('change', ()=>{
  currentTreeIndex = parseInt(treeSelect.value,10) || 0;
  $('#lblTreeName').textContent = getTree().name || '';
  $('#treeName').value = getTree().name || '';
  rebuildNodes();
});
$('#treeName').addEventListener('input', ()=>{
  getTree().name = $('#treeName').value;
  $('#lblTreeName').textContent = getTree().name || '';
  refreshTreeSelect();
});

// Node add/remove
$('#btnAddNode').addEventListener('click', ()=>{
  const nid = `node_${Math.random().toString(36).slice(2,8)}`;
  const n = { id: nid, name: 'New Node', description: '', icon: '⚙️', position:{x:0.5,y:0.2}, requires:[], cost:1, maxLevel:1, effects:[] };
  getTree().nodes.push(n);
  rebuildNodes();
  selectNode(nid);
});
$('#btnRemoveNode').addEventListener('click', ()=>{
  if (!selectedNodeId) return;
  const t = getTree();
  // remove from requires of others
  t.nodes.forEach(n => { n.requires = (n.requires||[]).filter(id => id !== selectedNodeId); });
  const idx = t.nodes.findIndex(n => n.id === selectedNodeId);
  if (idx>=0) t.nodes.splice(idx,1);
  selectedNodeId = null;
  $('#btnRemoveNode').disabled = true;
  rebuildNodes();
});

// Load/Save
$('#btnLoadGame').addEventListener('click', async ()=>{
  try {
    const res = await fetch('../jsons/upgrades.json');
    const json = await res.json();
    data = json; currentTreeIndex = 0; selectedNodeId = null;
    refreshTreeSelect(); rebuildNodes();
  } catch (e) { alert('Failed to load from game jsons/upgrades.json'); }
});

document.getElementById('fileOpen').addEventListener('change', (ev)=>{
  const f = ev.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try {
      data = JSON.parse(reader.result);
      currentTreeIndex = 0; selectedNodeId = null;
      refreshTreeSelect(); rebuildNodes();
    } catch (e) { alert('Invalid JSON'); }
  };
  reader.readAsText(f);
});

$('#btnSave').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'upgrades.json'; a.click();
  URL.revokeObjectURL(url);
});
$('#btnCopy').addEventListener('click', async ()=>{
  try { await navigator.clipboard.writeText(JSON.stringify(data, null, 2)); alert('Copied'); }
  catch(e){ alert('Copy failed'); }
});

function updateStats(){
  $('#statNodes').textContent = String(getTree().nodes.length);
}

// Inspector bindings
[propId, propName, propIcon, propDesc, propCost, propMaxLv].forEach(inp => inp.addEventListener('input', saveInspector));
reqLogic.addEventListener('change', () => {
  if (selectedNodeId) {
    const n = getNodeById(selectedNodeId);
    if (n) buildRequiresEditor(n);
  }
});

// init
refreshTreeSelect();
rebuildNodes();
