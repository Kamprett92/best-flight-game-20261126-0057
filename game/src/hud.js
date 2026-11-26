// hud.js — the cockpit instruments. A DOM overlay on top of the canvas:
// altitude, airspeed and heading with a compass strip, throttle and fuel
// gauges, a damage bar, the score, the mission objective and a message
// line. The numbers are big and lit (amber on dark glass) so they read in
// a screenshot at a glance, the way real avionics do.

import { compassLabel, headingDegrees } from './physics.js';

const kmh = (ms) => Math.round(ms * 3.6);

export function createHud() {
  const root = document.getElementById('hud');
  const el = {};
  for (const id of ['alt', 'spd', 'hdg', 'compass', 'thr', 'fuel', 'dmg', 'score', 'goal', 'msg', 'time', 'warn']) {
    el[id] = document.getElementById(`hud-${id}`);
  }
  // Compass strip: a row of ticks with the cardinal points.
  const compassMarks = [];
  for (let d = 0; d < 360; d += 15) {
    const label = d % 90 === 0 ? ['N', 'E', 'S', 'W'][d / 90] : d % 45 === 0 ? String(d) : '';
    compassMarks.push({ d, label });
  }
  return { root, el, compassMarks };
}

function barWidth(el, pct) {
  if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

export function updateHud(hud, s, mission, state) {
  const { el } = hud;
  const hdg = headingDegrees(s.heading);
  if (el.alt) el.alt.textContent = `${Math.max(0, Math.round(s.y))} m`;
  if (el.spd) el.spd.textContent = `${kmh(s.speed)} km/h`;
  if (el.hdg) el.hdg.textContent = `${String(Math.round(hdg)).padStart(3, '0')}° ${compassLabel(hdg)}`;
  if (el.thr) el.thr.textContent = `${Math.round(s.throttle * 100)}%`;
  if (el.score) el.score.textContent = String(mission ? mission.score : 0);
  if (el.goal) el.goal.textContent = mission ? mission.goal : '';
  if (el.time) {
    if (mission && mission.id === 'beacons' && !mission.done) {
      el.time.textContent = `⏱ ${Math.max(0, Math.ceil(mission.timeLeft))}s`;
      el.time.style.display = '';
    } else if (mission && mission.time > 0) {
      const t = Math.floor(mission.time);
      el.time.textContent = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      el.time.style.display = '';
    } else {
      el.time.style.display = 'none';
    }
  }
  barWidth(document.getElementById('hud-fuelbar'), s.fuel);
  barWidth(document.getElementById('hud-dmgbar'), s.damage);
  const fuelEl = document.getElementById('hud-fuelbar');
  if (fuelEl) fuelEl.className = `bar-fill ${s.fuel < 25 ? 'low' : ''}`;
  const dmgEl = document.getElementById('hud-dmgbar');
  if (dmgEl) dmgEl.className = `bar-fill dmg ${s.damage > 60 ? 'low' : ''}`;

  // Compass: shift the strip so the current heading stays centred. The
  // strip is rebuilt only when the heading moved a degree, so the DOM is
  // not rewritten every frame.
  if (el.compass) {
    if (hud._lastHdg === undefined || Math.abs(hdg - hud._lastHdg) >= 1) {
      hud._lastHdg = hdg;
      let html = '';
      for (const m of hud.compassMarks) {
        let rel = ((m.d - hdg + 540) % 360) - 180;
        if (Math.abs(rel) > 60) continue;
        const left = 50 + rel * 0.9;
        html += `<span class="tick" style="left:${left}%">${m.label || '·'}</span>`;
      }
      el.compass.innerHTML = html;
    }
  }

  // Warnings: stall, low fuel, damage, and the state line.
  let warn = '';
  if (state === 'playing') {
    if (s.fuel <= 0) warn = '⛽ OUT OF FUEL — glide to the runway!';
    else if (s.fuel < 20) warn = '⛽ LOW FUEL';
    else if (s.damage > 60) warn = '⚠ HEAVY DAMAGE — land soon';
    else if (s.speed < 20 && s.y > 10) warn = '⚠ STALL — nose down, throttle up';
  }
  if (el.warn) {
    el.warn.textContent = warn;
    el.warn.style.display = warn ? '' : 'none';
  }
}

export function showMessage(hud, text, ms = 2600) {
  const el = hud.el.msg;
  if (!el) return;
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(showMessage._t);
  showMessage._t = setTimeout(() => {
    el.style.opacity = '0';
  }, ms);
}
