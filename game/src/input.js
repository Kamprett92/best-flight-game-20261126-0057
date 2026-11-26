// input.js — keyboard and mouse state for the pilot. Arrow keys (or WASD)
// fly the plane, Shift throttles up, Control throttles down, Space is the
// air brake, P pauses, R restarts, and Enter confirms on the menus. The
// mouse steers the menus and can nudge the camera. Nothing here touches
// the flight model directly; it only reports what the pilot is holding.

export function createInput() {
  const keys = new Set();
  const state = {
    keys,
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    // Edge-triggered actions, consumed by the game loop once per press.
    pressed: new Set(),
  };

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) state.pressed.add(e.code);
    keys.add(e.code);
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function onMouseMove(e) {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
  }
  function onMouseDown() {
    state.mouseDown = true;
  }
  function onMouseUp() {
    state.mouseDown = false;
  }
  // Mouse wheel trims the throttle: a fine control for the final approach.
  function onWheel(e) {
    state.wheelDelta = (state.wheelDelta || 0) + (e.deltaY < 0 ? 1 : -1);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('wheel', onWheel, { passive: true });

  // Control axes, each in [-1, 1]: pitch up is positive, roll right is positive.
  state.pitchInput = () => {
    let v = 0;
    if (keys.has('ArrowDown') || keys.has('KeyS')) v -= 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) v += 1;
    return v;
  };
  state.rollInput = () => {
    let v = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) v -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) v += 1;
    return v;
  };
  state.throttleUp = () => keys.has('ShiftLeft') || keys.has('ShiftRight');
  state.throttleDown = () => keys.has('ControlLeft') || keys.has('ControlRight');
  state.brake = () => keys.has('Space');
  // Wheel steps accumulated since the last frame; the flight model applies
  // them and the loop clears them. One notch is about 4% throttle.
  state.takeWheel = () => {
    const d = state.wheelDelta || 0;
    state.wheelDelta = 0;
    return d;
  };
  // True once for the frame the key went down, then cleared by consume().
  state.wasPressed = (code) => state.pressed.has(code);
  state.consume = () => state.pressed.clear();
  state.detach = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('wheel', onWheel);
  };
  return state;
}
