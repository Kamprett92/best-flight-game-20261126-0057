// missions.js — the three sorties. Each mission owns its targets, its
// progress and its score, and reports events the game loop turns into HUD
// messages and sounds: a ring passed, a beacon collected, a landing made,
// a clock run out.

import { CONFIG, MISSIONS } from './config.js';

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[0];
}

// A fresh mission state for the chosen mission id.
export function createMission(id, world) {
  const def = missionById(id);
  const state = {
    id: def.id,
    name: def.name,
    goal: def.goal,
    score: 0,
    done: false,
    failed: false,
    message: '',
    time: 0,
    timeLeft: def.id === 'beacons' ? CONFIG.beaconTimeLimit : 0,
    ringIndex: 0,
    beaconsLeft: CONFIG.beaconCount,
    landed: false,
    // Per-target hit flags, so a ring or beacon only scores once.
    ringHit: world.rings.map(() => false),
    beaconHit: world.beacons.map(() => false),
    nextRing: world.rings[0] || null,
    nextBeacon: null,
  };
  return state;
}

const dist3 = (a, b) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// One mission step. Returns an event: 'ring', 'beacon', 'landed',
// 'timeout', 'complete', or ''.
export function stepMission(m, s, world, dt) {
  if (m.done || m.failed) return '';
  m.time += dt;
  if (m.id === 'beacons') {
    m.timeLeft -= dt;
    if (m.timeLeft <= 0) {
      m.failed = true;
      m.message = 'Out of time — the beacons went dark.';
      return 'timeout';
    }
  }
  const p = { x: s.x, y: s.y, z: s.z };

  if (m.id === 'rings') {
    const i = m.ringIndex;
    if (i < world.rings.length) {
      const ring = world.rings[i];
      const d = dist3(p, ring);
      if (d < CONFIG.ringRadius + 2) {
        m.ringHit[i] = true;
        m.ringIndex++;
        m.score += CONFIG.ringPoints;
        m.nextRing = world.rings[m.ringIndex] || null;
        if (m.ringIndex >= world.rings.length) {
          m.done = true;
          m.score += Math.max(0, Math.round((300 - m.time) * CONFIG.timeBonusPerSecond));
          m.message = 'Ring course complete!';
          return 'complete';
        }
        m.message = `Ring ${m.ringIndex} of ${world.rings.length} — next one ahead`;
        return 'ring';
      }
      // A near miss still tells the pilot how close they were.
      if (d < CONFIG.ringRadius + 30 && !m.nearRing) {
        m.nearRing = true;
        m.message = 'Ring just ahead — thread it!';
      } else if (d >= CONFIG.ringRadius + 30) {
        m.nearRing = false;
      }
    }
    return '';
  }

  if (m.id === 'landing') {
    // The plane must actually have flown before a landing counts: without
    // this, sitting on the runway at the start would "complete" the mission.
    if (s.airborne) m.tookOff = true;
    // The flight model reports the landing; here we score it once the
    // plane has rolled to a stop.
    if (m.tookOff && s.onGround && s.airborne === false && s.speed < 12 && m.time > 8) {
      if (!m.landed) {
        m.landed = true;
        m.done = true;
        m.score += CONFIG.landingBonus;
        m.message = 'Touchdown! A textbook landing.';
        return 'complete';
      }
    }
    return '';
  }

  if (m.id === 'beacons') {
    for (let i = 0; i < world.beacons.length; i++) {
      if (m.beaconHit[i]) continue;
      if (dist3(p, world.beacons[i]) < 16) {
        m.beaconHit[i] = true;
        m.beaconsLeft--;
        m.score += CONFIG.beaconPoints;
        if (m.beaconsLeft === 0) {
          m.done = true;
          m.score += Math.max(0, Math.round(m.timeLeft * CONFIG.timeBonusPerSecond));
          m.message = 'All beacons collected!';
          return 'complete';
        }
        m.message = `Beacon ${CONFIG.beaconCount - m.beaconsLeft} of ${CONFIG.beaconCount}`;
        return 'beacon';
      }
    }
    return '';
  }
  return '';
}

// Where the pilot should fly next: the next ring, the nearest beacon, or
// the runway. The HUD arrow and the in-world marker use this.
export function currentTarget(m, world) {
  if (m.id === 'rings') return m.nextRing;
  if (m.id === 'landing') return { x: CONFIG.runway.x, y: 6, z: CONFIG.runway.z };
  if (m.id === 'beacons') {
    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < world.beacons.length; i++) {
      if (m.beaconHit[i]) continue;
      const b = world.beacons[i];
      const d = b.x * b.x + b.z * b.z;
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }
  return null;
}
