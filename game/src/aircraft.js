// aircraft.js — builds the courier plane out of Three.js primitives: a
// cream fuselage with a red nose, white wings, a blue canopy and a spinning
// propeller. It looks built, not drawn, and the propeller speed follows the
// throttle so the plane looks alive on the runway and in the air.

import { CONFIG } from './config.js';

const C = CONFIG.colors;

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

// Build the plane. Its nose points along local +Z; the flight model sets
// rotation with order 'YXZ' (yaw, then pitch, then bank).
export function createAircraft() {
  const plane = new THREE.Group();
  const body = lambert(C.planeBody);
  const wing = lambert(C.planeWing);
  const accent = lambert(C.planeAccent);
  const dark = lambert(0x2a2f36);

  // Fuselage: a tapered cylinder along Z with a rounded nose cone.
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.85, 7.2, 10), body);
  fuselage.rotation.x = Math.PI / 2;
  plane.add(fuselage);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.2, 10), accent);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 4.7;
  plane.add(nose);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.4, 10), body);
  tailCone.rotation.x = -Math.PI / 2;
  tailCone.position.z = -4.8;
  plane.add(tailCone);

  // Main wings: one wide, thin box, slightly swept by tapering the tips.
  const mainWing = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.28, 2.6), wing);
  mainWing.position.set(0, -0.15, 0.6);
  plane.add(mainWing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 2.2), accent);
  wingTipL.position.set(-6.9, -0.15, 0.6);
  plane.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.x = 6.9;
  plane.add(wingTipR);

  // Tail: a horizontal stabiliser and a vertical fin.
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 1.6), wing);
  tailWing.position.set(0, 0.35, -5.2);
  plane.add(tailWing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.4, 1.9), accent);
  fin.position.set(0, 1.35, -5.2);
  plane.add(fin);

  // Canopy: a half-dome on top of the fuselage, dark glass blue.
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    lambert(C.canopy),
  );
  canopy.scale.set(1, 0.85, 1.9);
  canopy.position.set(0, 0.55, 1.4);
  plane.add(canopy);

  // Propeller: a hub and two blades, spinning around the nose axis (Z).
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 8), dark);
  hub.rotation.x = Math.PI / 2;
  prop.add(hub);
  const bladeGeo = new THREE.BoxGeometry(0.55, 3.4, 0.12);
  const blade1 = new THREE.Mesh(bladeGeo, dark);
  prop.add(blade1);
  const blade2 = new THREE.Mesh(bladeGeo, dark);
  blade2.rotation.z = Math.PI / 2;
  prop.add(blade2);
  prop.position.z = 5.9;
  plane.add(prop);

  // Landing gear: three small legs with wheels, visible on the runway.
  const gearMat = dark;
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.1, 6), gearMat);
    leg.position.set(sx * 1.1, -1.25, 1.2);
    plane.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), gearMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(sx * 1.1, -1.8, 1.2);
    plane.add(wheel);
  }
  const tailLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6), gearMat);
  tailLeg.position.set(0, -1.1, -4.6);
  plane.add(tailLeg);

  // Navigation lights: red on the left wingtip, green on the right, white
  // on the tail — the detail that makes the plane look flown at dusk.
  const navMat = (color) => new THREE.MeshBasicMaterial({ color });
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), navMat(0xff2a2a));
  navL.position.set(-7.4, -0.15, 0.6);
  plane.add(navL);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), navMat(0x2aff66));
  navR.position.set(7.4, -0.15, 0.6);
  plane.add(navR);
  const navT = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), navMat(0xffffff));
  navT.position.set(0, 0.5, -6.0);
  plane.add(navT);

  plane.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  return { group: plane, prop };
}

// Spin the propeller: faster with throttle, and a slow idle windmill when
// the engine is off but the plane is moving.
export function updateAircraftVisual(aircraft, throttle, speed, dt) {
  const spin = 4 + throttle * 42 + speed * 0.12;
  aircraft.prop.rotation.z += spin * dt;
}
