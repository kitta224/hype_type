// hype_typeのデバッグAPI
// コンソールコマンドを提供する 例: window.hypeType.cmd('debug on')
// このファイルは、コアロジックをクリーンに保つためにscript.jsから抽出された。

window.hypeType = window.hypeType || {};
window.hypeType.debug = window.hypeType.debug || false;
window.hypeType.logDamage = (typeof window.hypeType.logDamage === 'boolean') ? window.hypeType.logDamage : true;

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