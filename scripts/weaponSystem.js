// WeaponSystem: Player weapon stats and firing control
// Provides base and multiplier tuning for all properties and a fire method
// that spawns bullets toward a target.

import { Bullet } from './bullet.js';

function degToRad(d) { return d * Math.PI / 180; }

export default class WeaponSystem {
  constructor(options = {}) {
    // Base values (absolute). Upgrades may adjust these directly.
    this.base = Object.assign({
      bulletDamage: 10,
      fireCooldownMs: 250,
      burstCount: 3,
      shotDelayMs: 100,
      bulletSpeed: 10,
      spreadDeg: 0,
      lifeTimeMs: 2000,
      // Extended properties (not all are wired yet in collisions)
      pierceCount: 0,
      chainCount: 0,
      chainRange: 120,
      splitCount: 0,
      splitAngleDeg: 30,
      aoeRadius: 0,
      homing: { enabled: false, turnRateDegPerSec: 0 },
      ricochetCount: 0,
      statusOnHit: [] // [{ type:'burn'|'chill'|'freeze'|'bleed', opts?:{}, procChance?:0..1 }]
    }, options.base || {});

    // Multipliers (relative). Upgrades should typically modify these.
    this.mul = Object.assign({
      bulletDamage: 1,
      fireCooldownMs: 1,
      burstCount: 1,
      shotDelayMs: 1,
      bulletSpeed: 1,
      spreadDeg: 1,
      lifeTimeMs: 1,
      pierceCount: 1,
      chainCount: 1,
      chainRange: 1,
      splitCount: 1,
      splitAngleDeg: 1,
      aoeRadius: 1,
      homing_turnRateDegPerSec: 1,
      ricochetCount: 1
    }, options.mul || {});

    this.lastFireTime = 0;
  }

  // Helpers to mutate base/multiplier by dotted paths
  setBase(path, value) { this._setByPath(this.base, path, value); }
  setMul(path, value) { this._setByPath(this.mul, path, value); }

  _setByPath(obj, path, value) {
    if (!path) return;
    const keys = String(path).split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in cur) || typeof cur[k] !== 'object') cur[k] = {};
      cur = cur[k];
    }
    cur[keys[keys.length - 1]] = value;
  }

  getStats() {
    const b = this.base, m = this.mul;
    const homing = b.homing || { enabled:false, turnRateDegPerSec:0 };
    return {
      bulletDamage: b.bulletDamage * m.bulletDamage,
      fireCooldownMs: b.fireCooldownMs * m.fireCooldownMs,
      burstCount: Math.max(1, Math.round(b.burstCount * m.burstCount)),
      shotDelayMs: b.shotDelayMs * m.shotDelayMs,
      bulletSpeed: b.bulletSpeed * m.bulletSpeed,
      spreadDeg: b.spreadDeg * m.spreadDeg,
      lifeTimeMs: b.lifeTimeMs * m.lifeTimeMs,
      pierceCount: Math.max(0, Math.floor(b.pierceCount * m.pierceCount)),
      chainCount: Math.max(0, Math.floor(b.chainCount * m.chainCount)),
      chainRange: Math.max(0, b.chainRange * m.chainRange),
      splitCount: Math.max(0, Math.floor(b.splitCount * m.splitCount)),
      splitAngleDeg: b.splitAngleDeg * m.splitAngleDeg,
      aoeRadius: Math.max(0, b.aoeRadius * m.aoeRadius),
      homing: { enabled: !!homing.enabled, turnRateDegPerSec: homing.turnRateDegPerSec * m.homing_turnRateDegPerSec },
      ricochetCount: Math.max(0, Math.floor(b.ricochetCount * m.ricochetCount)),
      statusOnHit: Array.isArray(b.statusOnHit) ? b.statusOnHit.slice() : []
    };
  }

  // Fire toward a specific target enemy. addBullet(bullet) will be called per shot.
  fireAtTarget(player, targetEnemy, addBullet, colors, nowMs = Date.now()) {
    if (!player || !targetEnemy || typeof addBullet !== 'function') return;
    const stats = this.getStats();

    const baseAngle = Math.atan2(targetEnemy.y - player.y, targetEnemy.x - player.x);

    for (let i = 0; i < stats.burstCount; i++) {
      const delay = i * stats.shotDelayMs;
      setTimeout(() => {
        const spread = stats.spreadDeg ? (Math.random() * stats.spreadDeg - stats.spreadDeg / 2) : 0;
        const theta = baseAngle + degToRad(spread);
        const vx = Math.cos(theta) * stats.bulletSpeed;
        const vy = Math.sin(theta) * stats.bulletSpeed;
        const color = (colors && colors.bullet) || '#A9A9A9';
        const b = new Bullet(player.x, player.y, vx, vy, stats.bulletDamage, color);
        b.color = color;
        // Extended properties (to be consumed later in collision/logic)
        b.lifeTimeMs = stats.lifeTimeMs;
        b.pierceCount = stats.pierceCount;
        b.chainCount = stats.chainCount;
        b.chainRange = stats.chainRange;
        b.splitCount = stats.splitCount;
        b.splitAngleDeg = stats.splitAngleDeg;
        b.aoeRadius = stats.aoeRadius;
        b.homing = stats.homing;
        b.ricochetCount = stats.ricochetCount;
        b.statusOnHit = stats.statusOnHit;
        addBullet(b);
      }, delay);
    }

    this.lastFireTime = nowMs;
  }
}
