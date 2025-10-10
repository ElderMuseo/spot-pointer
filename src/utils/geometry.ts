import { Fixture } from '../types/lighting';

/**
 * Calculate pan and tilt angles for a fixture to point at a target
 * Following the Python code convention exactly
 */
export function calculatePanTilt(
  fixture: Fixture,
  targetX: number,
  targetY: number,
  targetZ: number = 0
): { pan: number; tilt: number } {
  // Vector from fixture to target
  const dx = targetX - fixture.x;
  const dy = targetY - fixture.y;
  const dz = fixture.z - targetZ; // positive if fixture is above target

  // Calculate pan (azimuth): atan2(dx, dy) - 0° toward +y, positive toward +x
  let pan = Math.atan2(dx, dy) * (180 / Math.PI); // [-180, 180]
  
  // Calculate tilt (elevation): 0° horizontal; >0 toward floor; <0 toward ceiling  
  const h = Math.sqrt(dx * dx + dy * dy);
  let tilt;
  if (h === 0) {
    // Target directly below/above fixture
    tilt = dz > 0 ? 90.0 : -90.0;
  } else {
    tilt = Math.atan2(h, dz) * (180 / Math.PI);
  }

  // Apply inversions (calibration)
  if (fixture.panInverted) pan = -pan;
  if (fixture.tiltInverted) tilt = -tilt;
  
  // Apply offsets
  pan += fixture.panOffset;
  tilt += fixture.tiltOffset;

  // Wrap pan to [-270, 270] range if needed
  const panRange = fixture.panRange.max - fixture.panRange.min;
  if (panRange >= 360.0 - 1e-6) {
    // Normalize to (-180, 180] and then adjust if range is not symmetric
    pan = ((pan + 180.0) % 360.0) - 180.0;
    if (pan < fixture.panRange.min) pan = fixture.panRange.min;
    else if (pan > fixture.panRange.max) pan = fixture.panRange.max;
  } else {
    // Clamp to range
    pan = Math.max(fixture.panRange.min, Math.min(fixture.panRange.max, pan));
  }
  
  // Clamp tilt to range (tilt doesn't usually wrap 360°)
  tilt = Math.max(fixture.tiltRange.min, Math.min(fixture.tiltRange.max, tilt));

  return { pan, tilt };
}

/**
 * Convert degrees to percentage based on fixture range
 */
export function degreesToPercent(
  degrees: number,
  min: number,
  max: number
): number {
  return Math.max(0, Math.min(100, ((degrees - min) / (max - min)) * 100));
}

/**
 * Convert percentage to degrees based on fixture range
 */
export function percentToDegrees(
  percent: number,
  min: number,
  max: number
): number {
  return min + (percent / 100) * (max - min);
}

/**
 * Check if target is within fixture's reach
 */
export function isTargetReachable(
  fixture: Fixture,
  targetX: number,
  targetY: number
): boolean {
  const { pan, tilt } = calculatePanTilt(fixture, targetX, targetY);
  
  const panInRange = pan >= fixture.panRange.min && pan <= fixture.panRange.max;
  const tiltInRange = tilt >= fixture.tiltRange.min && tilt <= fixture.tiltRange.max;
  
  return panInRange && tiltInRange;
}

/**
 * Calculate light cone projection on floor
 */
export function calculateLightCone(
  fixture: Fixture,
  targetX: number,
  targetY: number,
  beamAngle: number = 15
): { centerX: number; centerY: number; radiusX: number; radiusY: number; rotation: number } {
  const distance = Math.sqrt(
    Math.pow(targetX - fixture.x, 2) + 
    Math.pow(targetY - fixture.y, 2)
  );
  
  const { pan } = calculatePanTilt(fixture, targetX, targetY);
  
  // Calculate cone radius at floor level
  const coneRadius = Math.tan((beamAngle * Math.PI) / 180) * fixture.z;
  
  return {
    centerX: targetX,
    centerY: targetY,
    radiusX: coneRadius,
    radiusY: coneRadius * 0.8, // Slightly elliptical for realism
    rotation: pan
  };
}

/**
 * Convert pixel coordinates to real world coordinates
 * With 90° rotation: canvas coordinates are rotated but real coordinates stay the same
 * Bottom-left origin: (0,0) at bottom-left, x goes right, y goes up
 */
export function pixelToReal(
  pixelX: number,
  pixelY: number,
  floorPlan: { width: number; height: number; pixelsPerMeter: number }
): { x: number; y: number } {
  // After 90° rotation: pixelX maps to Y, pixelY maps to X
  const canvasWidth = floorPlan.height * floorPlan.pixelsPerMeter;
  return {
    x: pixelY / floorPlan.pixelsPerMeter,
    y: (canvasWidth - pixelX) / floorPlan.pixelsPerMeter
  };
}

/**
 * Convert real world coordinates to pixel coordinates
 * With 90° rotation: real X maps to pixelY, real Y maps to pixelX
 * Bottom-left origin: (0,0) at bottom-left, x goes right, y goes up
 */
export function realToPixel(
  realX: number,
  realY: number,
  floorPlan: { width: number; height: number; pixelsPerMeter: number }
): { x: number; y: number } {
  // After 90° rotation: realX maps to pixelY, realY maps to pixelX
  const canvasWidth = floorPlan.height * floorPlan.pixelsPerMeter;
  return {
    x: canvasWidth - (realY * floorPlan.pixelsPerMeter),
    y: realX * floorPlan.pixelsPerMeter
  };
}