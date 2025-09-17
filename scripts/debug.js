// hype_typeのデバッグAPI
// コンソールコマンドを提供する 例: window.hypeType.cmd('debug on')
// このファイルは、コアロジックをクリーンに保つためにscript.jsから抽出された。

window.hypeType = window.hypeType || {};
window.hypeType.debug = window.hypeType.debug || false;
window.hypeType.logDamage = (typeof window.hypeType.logDamage === 'boolean') ? window.hypeType.logDamage : true;

// ゲーム内データへのアクセサを受け取るフック
(function setupGameAccessHook(){
  const state = { getEnemies: null, getPlayer: null };
  window.hypeType.__setGameAccess = function(accessors){
    state.getEnemies = accessors && accessors.getEnemies || null;
    state.getPlayer = accessors && accessors.getPlayer || null;
  };

  // 状態効果デバッグAPI
  const allowed = new Set(['burn','chill','freeze','bleed']);
  function withDefaults(type, opts){
    const o = Object.assign({}, opts || {});
    switch(type){
      case 'burn':
        if (o.durationSec == null) o.durationSec = 3.0;
        if (o.dps == null) o.dps = 4.0;
        break;
      case 'chill':
        if (o.durationSec == null) o.durationSec = 4.0;
        if (o.slowFactor == null) o.slowFactor = 0.5;
        if (o.baseDps == null) o.baseDps = 0.5;
        if (o.dpsGrowthPerSec == null) o.dpsGrowthPerSec = 0.5;
        break;
      case 'freeze':
        if (o.durationSec == null) o.durationSec = 1.5;
        break;
      case 'bleed':
        if (o.durationSec == null) o.durationSec = 6.0;
        if (o.percentPerSec == null) o.percentPerSec = 0.05;
        if (o.minRatio == null) o.minRatio = 0.1;
        break;
    }
    return o;
  }

  function getEnemies(){ return (typeof state.getEnemies === 'function') ? state.getEnemies() : []; }
  function getPlayer(){ return (typeof state.getPlayer === 'function') ? state.getPlayer() : null; }

  function nearestEnemy(){
    const enemies = getEnemies();
    const player = getPlayer();
    if (!enemies.length || !player) return null;
    let best=null, bd=Infinity;
    for(const e of enemies){
      const dx = e.x - player.x, dy = e.y - player.y;
      const d = dx*dx + dy*dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  function applyToEnemy(enemy, type, opts){
    if (!enemy || typeof enemy.applyStatus !== 'function') return false;
    if (!allowed.has(type)) { console.warn('[hypeType] Unknown status type:', type); return false; }
    enemy.applyStatus(type, withDefaults(type, opts));
    if (window.hypeType && window.hypeType.debug) console.log('[hypeType] applied', type, 'to', enemy.word, enemy);
    return true;
  }

  window.hypeType.applyStatusToNearest = function(type, opts){
    const e = nearestEnemy();
    if (!e) return console.warn('[hypeType] no enemies');
    return applyToEnemy(e, type, opts);
  };
  window.hypeType.applyStatusToIndex = function(index, type, opts){
    const enemies = getEnemies();
    const e = enemies[index|0];
    if (!e) return console.warn('[hypeType] enemy index not found:', index);
    return applyToEnemy(e, type, opts);
  };
  window.hypeType.applyStatusToAll = function(type, opts){
    const enemies = getEnemies();
    if (!enemies.length) return console.warn('[hypeType] no enemies');
    let c = 0; enemies.forEach(e => { c += applyToEnemy(e, type, opts) ? 1 : 0; });
    console.log(`[hypeType] applied ${type} to ${c} enemies`);
    return c;
  };
  window.hypeType.listEnemies = function(){
    const enemies = getEnemies();
    const list = enemies.map((e,i)=>({ i, word: e.word, hp: Math.round(e.hp), maxHp: Math.round(e.maxHp), x: Math.round(e.x), y: Math.round(e.y), status: e.status }));
    console.table(list);
    return list;
  };
})();

window.hypeType.setDebug = function (val) {
  this.debug = !!val;
  console.info('[hypeType] debug =', this.debug);
};

window.hypeType.setLogDamage = function (val) {
  this.logDamage = !!val;
  console.info('[hypeType] logDamage =', this.logDamage);
};

window.hypeType.cmd = function (cmd) {
  if (!cmd)
    return console.log(
      'hypeType.cmd: commands: debug on|off, logDamage on|off, status'
    );
  const parts = String(cmd).trim().split(/\s+/);
  const name = parts[0];
  const arg = (parts[1] || '').toLowerCase();
  if (name === 'debug') {
    if (arg === 'on') this.setDebug(true);
    else if (arg === 'off') this.setDebug(false);
    else console.log('usage: debug on|off');
    return;
  }
  if (name === 'logDamage') {
    if (arg === 'on') this.setLogDamage(true);
    else if (arg === 'off') this.setLogDamage(false);
    else console.log('usage: logDamage on|off');
    return;
  }
  if (name === 'status') {
    console.log('[hypeType] status', {
      debug: this.debug,
      logDamage: this.logDamage,
    });
    return;
  }
  console.log(
    'hypeType.cmd: unknown command. supported: debug, logDamage, status'
  );
};