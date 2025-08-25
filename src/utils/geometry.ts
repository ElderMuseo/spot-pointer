import { Fixture } from '../types/lighting';

/**
 * Calculate pan and tilt angles for a fixture to point at a target
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
  const dz = targetZ - fixture.z;

  // Calculate pan (horizontal angle)
  let pan = Math.atan2(dy, dx) * (180 / Math.PI);
  
  // Apply pan offset and inversion
  pan += fixture.panOffset;
  if (fixture.panInverted) pan = -pan;
  
  // Normalize to -270 to 270 degrees range
  while (pan > 270) pan -= 360;
  while (pan < -270) pan += 360;

  // Calculate tilt (vertical angle)
  const horizontalDistance = Math.sqrt(dx * dx + dy * dy);
  let tilt = Math.atan2(-dz, horizontalDistance) * (180 / Math.PI);
  
  // Apply tilt offset and inversion
  tilt += fixture.tiltOffset;
  if (fixture.tiltInverted) tilt = -tilt;

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
 */
export function pixelToReal(
  pixelX: number,
  pixelY: number,
  floorPlan: { width: number; height: number; pixelsPerMeter: number }
): { x: number; y: number } {
  return {
    x: pixelX / floorPlan.pixelsPerMeter,
    y: pixelY / floorPlan.pixelsPerMeter
  };
}

/**
 * Convert real world coordinates to pixel coordinates
 */
export function realToPixel(
  realX: number,
  realY: number,
  floorPlan: { width: number; height: number; pixelsPerMeter: number }
): { x: number; y: number } {
  return {
    x: realX * floorPlan.pixelsPerMeter,
    y: realY * floorPlan.pixelsPerMeter
  };
}