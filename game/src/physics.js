// physics.js — the arcade flight model. Throttle sets a target speed,
// pitch trades speed for altitude, bank turns the plane, and below the
// stall speed the wing gives up and the plane sinks. Fuel drains with
// throttle; empty tanks mean a glide. Terrain, water and the runway are
// checked every frame so landings and crashes read as what happened.

import { CONFIG } from './config.js';

// The plane's live state. Position is metres, speed is m/s, angles radians.
export function createFlightState(start) {
  return {
    x: start.x,
    y: start.y,
    z: start.z,
    heading: start.heading, // 0 = +Z, grows clockwise seen from above
    pitch: 0,
    bank: 0,
    speed: 0,
    verticalSpeed: 0,
    throttle: 0,
    fuel: CONFIG.fuelCapacity,
    damage: 0,
    airborne: false,
    onGround: true,
  };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// One physics step. Returns an event string for the game loop:
// 'stall' when the wing is stalling, 'ground' on a runway touch, or ''.
export function stepFlight(s, input, world, dt) {
  const rw = CONFIG.runway;
  // Throttle: Shift up, Control down, eased toward its target.
  if (input.throttleUp()) s.throttle = clamp(s.throttle + 0.7 * dt, 0, 1);
  if (input.throttleDown()) s.throttle = clamp(s.throttle - 0.7 * dt, 0, 1);
  if (s.fuel <= 0) s.throttle = 0;
  if (input.brake()) s.throttle = clamp(s.throttle - 1.6 * dt, 0, 1);
  // Mouse wheel trims the throttle in small steps (about 4% a notch).
  if (input.takeWheel) {
    const wheel = input.takeWheel();
    if (wheel !== 0) s.throttle = clamp(s.throttle + wheel * 0.04, 0, 1);
  }

  // Speed chases the throttle target; drag grows with the square of speed.
  const target = s.throttle * CONFIG.maxSpeed;
  const drag = 0.12 + (s.speed / CONFIG.maxSpeed) * 0.5;
  s.speed += (target - s.speed) * clamp(CONFIG.accelRate * drag * dt * 2, 0, 1);
  if (s.speed < 0) s.speed = 0;

  // Pitch and bank ease toward what the stick asks for, so the plane
  // feels weighty but answers at every speed.
  const pitchIn = input.pitchInput();
  const rollIn = input.rollInput();
  const targetPitch = pitchIn * CONFIG.maxPitch;
  const targetBank = rollIn * CONFIG.maxBank;
  s.pitch += (targetPitch - s.pitch) * Math.min(1, 3.2 * dt);
  s.bank += (targetBank - s.bank) * Math.min(1, 4.0 * dt);

  // Bank turns the plane; the turn tightens with speed.
  s.heading += s.bank * s.speed * CONFIG.turnFactor * dt;

  // Vertical speed: pitch converts speed into climb, and a stalled wing sinks.
  const stalling = s.speed < CONFIG.stallSpeed && s.y > 4;
  let vs = s.speed * Math.sin(s.pitch);
  if (stalling) vs -= (CONFIG.stallSpeed - s.speed) * (CONFIG.stallSink / CONFIG.stallSpeed);
  if (!s.airborne && s.speed < CONFIG.stallSpeed * 0.9) vs = Math.max(0, vs);
  s.verticalSpeed = vs;

  // Move along the heading, climbing or sinking.
  const fx = Math.sin(s.heading);
  const fz = Math.cos(s.heading);
  s.x += fx * s.speed * Math.cos(s.pitch) * dt;
  s.z += fz * s.speed * Math.cos(s.pitch) * dt;
  s.y += vs * dt;

  // Keep the plane inside the world.
  const R = CONFIG.islandRadius + 420;
  const rr = Math.hypot(s.x, s.z);
  if (rr > R) {
    s.x *= R / rr;
    s.z *= R / rr;
    s.heading += Math.PI;
  }
  if (s.y > 420) {
    s.y = 420;
    if (s.pitch > 0) s.pitch = 0;
  }

  // Fuel: full throttle burns fast, idling sips.
  const burn = CONFIG.fuelBurnIdle + (CONFIG.fuelBurnFull - CONFIG.fuelBurnIdle) * s.throttle;
  s.fuel = Math.max(0, s.fuel - burn * dt);

  // Ground and water contact. The plane rests on its wheels, 1.8 m below
  // its centre, so the ground line is the terrain height plus 1.8.
  const ground = world.heightAt(s.x, s.z);
  const overRunway =
    Math.abs(s.x - rw.x) < rw.width / 2 + 2 &&
    Math.abs(s.z - rw.z) < rw.length / 2 + 2;
  const overWater = ground <= CONFIG.waterLevel + 0.5 && !overRunway;
  let event = stalling ? 'stall' : '';
  // Ditching in the sea is worse than a hard field landing.
  if (overWater && s.y <= CONFIG.waterLevel + 1.8) {
    s.damage = Math.min(CONFIG.damageCrash, s.damage + CONFIG.waterHitDamage);
    s.y = CONFIG.waterLevel + 1.8;
    s.speed *= 0.3;
    event = 'ditch';
  } else if (s.y <= ground + 1.8) {
    s.y = ground + 1.8;
    if (s.airborne) {
      // Touching down: a gentle, slow touch on the strip is a landing.
      if (overRunway && Math.abs(vs) <= CONFIG.runwayLandingMaxSink && s.speed <= CONFIG.runwayLandingMaxSpeed) {
        event = 'landed';
        s.onGround = true;
        s.airborne = false;
        s.pitch = 0;
        s.bank *= 0.3;
      } else {
        // A hard touch: damage, and a bounce that keeps the sortie honest.
        s.damage = Math.min(CONFIG.damageCrash, s.damage + CONFIG.terrainHitDamage);
        s.speed *= 0.45;
        s.y = ground + 3;
        event = 'hard-hit';
      }
    } else {
      s.onGround = true;
    }
  } else if (s.y > ground + 2) {
    s.onGround = false;
    if (s.speed > CONFIG.stallSpeed * 0.8) s.airborne = true;
  }
  return event;
}

// Heading in compass degrees (0 = north/+Z here, clockwise).
export function headingDegrees(heading) {
  const d = ((heading * 180) / Math.PI) % 360;
  return (d + 360) % 360;
}

// A 16-point compass label for the HUD.
export function compassLabel(deg) {
  const pts = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return pts[Math.round(deg / 22.5) % 16];
}
