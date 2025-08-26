import { create } from 'zustand';
import { LightingState, Fixture, Preset } from '../types/lighting';
import { calculatePanTilt, degreesToPercent } from '../utils/geometry';
import { GrandMA2ApiClient } from '../utils/grandma2-api';

interface LightingStore extends LightingState {
  // Actions
  selectFixture: (id: number, multi?: boolean) => void;
  selectAllFixtures: () => void;
  clearSelection: () => void;
  selectFixtureById: (id: number) => void;
  updateFixture: (id: number, updates: Partial<Fixture>) => void;
  setTargetPoint: (x: number, y: number) => void;
  aimFixtureAt: (fixtureId: number, x: number, y: number) => void;
  updateDimmer: (fixtureIds: number[], dimmer: number) => void;
  updateColor: (fixtureIds: number[], r: number, g: number, b: number) => void;
  updateGobo: (fixtureIds: number[], gobo: number) => void;
  updateIris: (fixtureIds: number[], iris: number) => void;
  savePreset: (name: string, description: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  updateApiConfig: (baseUrl: string, grandma2Host: string, grandma2Port: number) => void;
  setFloorPlan: (image: string, width: number, height: number) => void;
  updateFixtureHeight: (height: number) => void;
  updateFixturePosition: (id: number, x: number, y: number) => void;
  adjustFixtureSpacing: (spacing: number) => void;
  // API client
  apiClient: GrandMA2ApiClient | null;
  initializeApi: (baseUrl: string, grandma2Host: string, grandma2Port: number) => Promise<boolean>;
}

// Room parameters (matching Python code)
const ROOM_WIDTH_X = 20.67;   // m
const ROOM_LENGTH_Y = 36.70;  // m
const LIGHTS_Y = 19.61;       // m (from bottom edge)
const LIGHTS_Z = 8.45;        // m (height)

// Light X positions with gaps [2.0, 2.0, 3.0, 2.0, 2.0] centered in width
const GAPS = [2.0, 2.0, 3.0, 2.0, 2.0];
const computeLightPositionsX = () => {
  const xCenter = ROOM_WIDTH_X / 2.0;
  const totalSpan = GAPS.reduce((sum, gap) => sum + gap, 0); // 11m
  const xLeft = xCenter - totalSpan / 2.0; // starting position
  const positions = [xLeft];
  for (const gap of GAPS) {
    positions.push(positions[positions.length - 1] + gap);
  }
  return positions; // 6 positions
};

const lightXPositions = computeLightPositionsX();

const defaultFixtures: Fixture[] = lightXPositions.map((x, index) => ({
  id: index + 1,
  x,
  y: LIGHTS_Y,
  z: LIGHTS_Z,
  pan: 0,
  tilt: 0,
  dimmer: 0,
  color: { r: 255, g: 255, b: 255 },
  gobo: 0,
  zoom: 15,
  iris: 50,
  isSelected: false,
  targetX: x,
  targetY: ROOM_LENGTH_Y / 2, // Default target at room center
  panRange: { min: -270, max: 270 },
  tiltRange: { min: -134, max: 134 },
  panOffset: 0,
  tiltOffset: 0,
  panInverted: false,
  tiltInverted: true // Match Python INVERT_TILT = True
}));

export const useLightingStore = create<LightingStore>((set, get) => ({
  fixtures: defaultFixtures,
  floorPlan: {
    image: null,
    width: ROOM_WIDTH_X,
    height: ROOM_LENGTH_Y,
    calibrationPoints: [],
    pixelsPerMeter: 20
  },
  selectedFixtures: [],
  presets: [],
  apiConfig: {
    baseUrl: 'http://localhost:8000',
    grandma2Host: '192.168.1.100',
    grandma2Port: 30000,
  },
  targetPoint: null,
  apiClient: null,

  selectFixture: (id, multi = false) => set(state => {
    if (multi) {
      // Multi-selection mode - toggle the fixture
      const isCurrentlySelected = state.selectedFixtures.includes(id);
      if (isCurrentlySelected) {
        // Remove from selection
        return {
          selectedFixtures: state.selectedFixtures.filter(fId => fId !== id),
          fixtures: state.fixtures.map(f => ({
            ...f,
            isSelected: f.id === id ? false : f.isSelected
          }))
        };
      } else {
        // Add to selection
        return {
          selectedFixtures: [...state.selectedFixtures, id],
          fixtures: state.fixtures.map(f => ({
            ...f,
            isSelected: f.id === id ? true : f.isSelected
          }))
        };
      }
    } else {
      // Single selection mode
      const isCurrentlyOnlySelected = state.selectedFixtures.includes(id) && state.selectedFixtures.length === 1;
      if (isCurrentlyOnlySelected) {
        // If this fixture is the only one selected, deselect it
        return {
          selectedFixtures: [],
          fixtures: state.fixtures.map(f => ({ ...f, isSelected: false }))
        };
      } else {
        // Select only this fixture
        return {
          selectedFixtures: [id],
          fixtures: state.fixtures.map(f => ({ ...f, isSelected: f.id === id }))
        };
      }
    }
  }),

  selectAllFixtures: () => set(state => ({
    selectedFixtures: state.fixtures.map(f => f.id),
    fixtures: state.fixtures.map(f => ({ ...f, isSelected: true }))
  })),

  clearSelection: () => set(state => ({
    selectedFixtures: [],
    fixtures: state.fixtures.map(f => ({ ...f, isSelected: false }))
  })),

  selectFixtureById: (id: number) => set(state => ({
    selectedFixtures: [id],
    fixtures: state.fixtures.map(f => ({ ...f, isSelected: f.id === id }))
  })),

  updateFixture: (id, updates) => set(state => ({
    fixtures: state.fixtures.map(f => 
      f.id === id ? { ...f, ...updates } : f
    )
  })),

  setTargetPoint: (x, y) => set({ targetPoint: { x, y } }),

  aimFixtureAt: (fixtureId, x, y) => {
    const state = get();
    const fixture = state.fixtures.find(f => f.id === fixtureId);
    if (!fixture) return;

    // Calculate pan/tilt with floor level target (z=0) and fixture height
    const { pan, tilt } = calculatePanTilt(fixture, x, y, 0);
    
    // Convert to percentages for API
    const panPercent = degreesToPercent(pan, fixture.panRange.min, fixture.panRange.max);
    const tiltPercent = degreesToPercent(tilt, fixture.tiltRange.min, fixture.tiltRange.max);
    
    // Send pan/tilt to API if connected
    if (get().apiClient) {
      get().apiClient.sendPanTilt(fixtureId, panPercent, tiltPercent);
    }
    
    // Update local state - only update this fixture's target and position
    set(state => ({
      fixtures: state.fixtures.map(f => 
        f.id === fixtureId ? { ...f, pan, tilt, targetX: x, targetY: y } : f
      ),
      targetPoint: { x, y }
    }));
  },

  updateDimmer: (fixtureIds, dimmer) => {
    // Send dimmer command to API if connected
    if (get().apiClient) {
      get().apiClient.sendDimmer(fixtureIds, dimmer);
    }
    
    set(state => ({
      fixtures: state.fixtures.map(f => 
        fixtureIds.includes(f.id) ? { ...f, dimmer } : f
      )
    }));
  },

  updateColor: (fixtureIds, r, g, b) => {
    // Send color command to API if connected
    if (get().apiClient) {
      get().apiClient.sendColor(fixtureIds, r, g, b);
    }
    
    set(state => ({
      fixtures: state.fixtures.map(f => 
        fixtureIds.includes(f.id) ? { ...f, color: { r, g, b } } : f
      )
    }));
  },

  updateGobo: (fixtureIds, gobo) => {
    // Send gobo command to API if connected
    if (get().apiClient) {
      get().apiClient.sendGobo(fixtureIds, gobo);
    }
    
    set(state => ({
      fixtures: state.fixtures.map(f => 
        fixtureIds.includes(f.id) ? { ...f, gobo } : f
      )
    }));
  },

  updateIris: (fixtureIds, iris) => {
    // Send iris command to API if connected
    if (get().apiClient) {
      get().apiClient.sendIris(fixtureIds, iris);
    }
    
    set(state => ({
      fixtures: state.fixtures.map(f => 
        fixtureIds.includes(f.id) ? { ...f, iris } : f
      )
    }));
  },

  savePreset: (name, description) => {
    const state = get();
    const preset: Preset = {
      id: Date.now().toString(),
      name,
      description,
      createdAt: new Date().toISOString(),
      fixtures: state.fixtures.map(({ isSelected, ...fixture }) => fixture)
    };
    
    set(state => ({
      presets: [...state.presets, preset]
    }));
  },

  loadPreset: (presetId) => {
    const state = get();
    const preset = state.presets.find(p => p.id === presetId);
    if (!preset) return;
    
    set({
      fixtures: preset.fixtures.map(f => ({ ...f, isSelected: false }))
    });
  },

  deletePreset: (presetId) => set(state => ({
    presets: state.presets.filter(p => p.id !== presetId)
  })),

  updateApiConfig: (baseUrl, grandma2Host, grandma2Port) => set(state => ({
    apiConfig: { baseUrl, grandma2Host, grandma2Port }
  })),

  setFloorPlan: (image, width, height) => set(state => ({
    floorPlan: {
      ...state.floorPlan,
      image,
      width,
      height,
      pixelsPerMeter: 500 / Math.max(width, height) // Approximate scaling
    }
  })),

  updateFixtureHeight: (height) => set(state => ({
    fixtures: state.fixtures.map(f => ({ ...f, z: height }))
  })),

  updateFixturePosition: (id, x, y) => set(state => ({
    fixtures: state.fixtures.map(f => 
      f.id === id ? { ...f, x, y } : f
    )
  })),

  adjustFixtureSpacing: (spacing) => set(state => {
    // Recalculate positions based on new spacing but maintain the centered layout
    const newGaps = Array(5).fill(spacing);
    const xCenter = ROOM_WIDTH_X / 2.0;
    const totalSpan = newGaps.reduce((sum, gap) => sum + gap, 0);
    const xLeft = xCenter - totalSpan / 2.0;
    const newPositions = [xLeft];
    for (const gap of newGaps) {
      newPositions.push(newPositions[newPositions.length - 1] + gap);
    }
    
    return {
      fixtures: state.fixtures.map((f, index) => ({
        ...f, 
        x: newPositions[index] || f.x
      }))
    };
  }),

  initializeApi: async (baseUrl: string, grandma2Host: string, grandma2Port: number) => {
    const { apiClient } = get();
    
    // Disconnect existing client
    if (apiClient) {
      apiClient.disconnect();
    }

    // Create new client
    const newClient = new GrandMA2ApiClient(
      baseUrl,
      (connected) => {
        console.log(`GrandMA2 API connection: ${connected ? 'connected' : 'disconnected'}`);
      },
      (message) => {
        console.log(`GrandMA2 API log: ${message}`);
      }
    );

    // Update GrandMA2 configuration first
    try {
      await newClient.updateConfig({
        host: grandma2Host,
        port: grandma2Port
      });
    } catch (error) {
      console.error('Failed to update GrandMA2 config:', error);
    }

    // Try to connect
    const connected = await newClient.connect();
    
    if (connected) {
      set((state) => ({
        ...state,
        apiClient: newClient,
        apiConfig: { baseUrl, grandma2Host, grandma2Port }
      }));
    }

    return connected;
  },
}));