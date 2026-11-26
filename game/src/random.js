// random.js — a tiny seeded random source and a 2D value-noise field, so
// the island, the ring course and the beacon field are identical for a
// given seed (and the ?shot=...&seed=N screenshots always match).

// mulberry32: a small, fast, seedable PRNG with a long period.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A deterministic hash of integer grid coordinates, in [0, 1).
function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 974634211) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

// 2D value noise: bilinear interpolation of hashed grid corners, smoothed.
export function valueNoise(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  const ux = smooth(fx);
  const uz = smooth(fz);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

// Fractal (multi-octave) value noise in [0, 1], for rolling terrain.
export function fbmNoise(x, z, seed, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq, z * freq, seed + o * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

// A seeded value in [min, max), for scattering objects deterministically.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Pick one element of an array with the seeded RNG.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
