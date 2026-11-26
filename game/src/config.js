// config.js — every tunable number of Skyline Courier lives here, so the
// flight feel, the missions and the world can be tuned without touching logic.

export const CONFIG = {
  // World
  worldSize: 2400, // terrain plane, metres across
  islandRadius: 1050, // the island fades into the sea beyond this radius
  terrainSegments: 128, // heightmap resolution (128 x 128 quads)
  waterLevel: 0.4,
  maxTerrainHeight: 260,
  fogNear: 500,
  fogFar: 2200,

  // Flight model (pitch and bank ease toward the stick's target; the rates
  // live in physics.js as approach constants, not here)
  maxSpeed: 92, // m/s at full throttle, level flight
  stallSpeed: 20, // below this the wing stops flying and the plane sinks
  stallSink: 26, // extra sink rate (m/s) at a full stall
  accelRate: 0.55, // how fast speed chases the throttle target (per second)
  maxPitch: 0.62,
  maxBank: 1.05,
  turnFactor: 0.011, // heading change per radian of bank per m/s
  gravity: 9.8,

  // Fuel and damage
  fuelCapacity: 100,
  fuelBurnFull: 0.32, // percent per second at full throttle
  fuelBurnIdle: 0.05,
  damageCrash: 100,
  terrainHitDamage: 34, // per hard terrain strike
  waterHitDamage: 60,
  runwayLandingMaxSink: 5.5, // m/s vertical speed allowed for a good landing
  runwayLandingMaxSpeed: 38, // m/s allowed for a good landing

  // Missions
  ringCount: 6,
  ringRadius: 14,
  ringPoints: 100,
  beaconCount: 8,
  beaconPoints: 100,
  beaconTimeLimit: 150, // seconds
  landingBonus: 250,
  timeBonusPerSecond: 4,

  // Runway (a flat strip on the south coast, aligned north-south)
  runway: {
    x: 0,
    z: 620,
    length: 260,
    width: 26,
    heading: 0, // 0 = along +Z
  },

  // Colours (one low-poly palette for terrain, sky and plane)
  colors: {
    sky: 0x8ec9e8,
    fog: 0x9fd0e8,
    water: 0x2e7fb8,
    sand: 0xd9c28a,
    grass: 0x6fae5a,
    rock: 0x8a7f74,
    snow: 0xf2f5f7,
    runway: 0x3a3f45,
    runwayMark: 0xf5f5f0,
    ring: 0xffc93c,
    beacon: 0x39d0ff,
    planeBody: 0xe8483f,
    planeWing: 0xf5efe2,
    planeAccent: 0x2b4c7e,
    canopy: 0x1e3a5f,
  },
};

// The three missions the title screen offers. Each has an id, a display
// name, a one-line brief and the goal text the HUD shows while flying.
export const MISSIONS = [
  {
    id: 'rings',
    name: 'Ring Run',
    brief: 'Thread all six sky rings in order, fast and clean.',
    goal: 'Fly through the rings in order',
  },
  {
    id: 'landing',
    name: 'Runway Return',
    brief: 'Take off, circle the island, and put her down gently on the strip.',
    goal: 'Land on the runway, gently and slow',
  },
  {
    id: 'beacons',
    name: 'Beacon Dash',
    brief: 'Eight beacons are lit over the island. Collect them all before the clock runs out.',
    goal: 'Collect all 8 beacons before time runs out',
  },
];
