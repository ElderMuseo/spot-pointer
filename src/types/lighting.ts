export interface Fixture {
  id: number;
  x: number; // Real world X position in meters
  y: number; // Real world Y position in meters
  z: number; // Height in meters
  pan: number; // Pan angle in degrees
  tilt: number; // Tilt angle in degrees
  dimmer: number; // 0-100%
  color: {
    r: number; // 0-255
    g: number; // 0-255
    b: number; // 0-255
  };
  gobo: number; // Gobo index
  zoom: number; // Beam angle/zoom
  isSelected: boolean;
  // Individual target point for this fixture
  targetX: number;
  targetY: number;
  // Calibration settings
  panRange: { min: number; max: number };
  tiltRange: { min: number; max: number };
  panOffset: number;
  tiltOffset: number;
  panInverted: boolean;
  tiltInverted: boolean;
}

export interface FloorPlan {
  image: string | null; // Base64 image data
  width: number; // Real world width in meters
  height: number; // Real world height in meters
  calibrationPoints: CalibrationPoint[];
  pixelsPerMeter: number;
}

export interface CalibrationPoint {
  pixelX: number;
  pixelY: number;
  realX: number;
  realY: number;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  fixtures: Omit<Fixture, 'isSelected'>[];
}

export interface TelnetConfig {
  ip: string;
  port: number;
  connected: boolean;
  reconnecting: boolean;
}

export interface LightingState {
  fixtures: Fixture[];
  floorPlan: FloorPlan;
  selectedFixtures: number[];
  presets: Preset[];
  telnetConfig: TelnetConfig;
  targetPoint: { x: number; y: number } | null;
}