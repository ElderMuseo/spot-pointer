import { create } from 'zustand';
import { LightingState, Fixture, Preset } from '../types/lighting';
import { calculatePanTilt, degreesToPercent } from '../utils/geometry';
import { TelnetClient } from '../utils/telnet';

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
  updateTelnetConfig: (ip: string, port: number) => void;
  setFloorPlan: (image: string, width: number, height: number) => void;
  updateFixtureHeight: (height: number) => void;
  updateFixturePosition: (id: number, x: number, y: number) => void;
  adjustFixtureSpacing: (spacing: number) => void;
  // Telnet client
  telnetClient: TelnetClient | null;
  initializeTelnet: () => void;
}

const defaultFixtures: Fixture[] = [
  // 1x6 configuration with bigger space in the middle
  { id: 1, x: 1, y: 5, z: 3, pan: 0, tilt: 0, dimmer: 0, color: { r: 255, g: 255, b: 255 }, gobo: 0, zoom: 15, iris: 50, isSelected: false, targetX: 1, targetY: 3, panRange: { min: 0, max: 360 }, tiltRange: { min: -90, max: 90 }, panOffset: 0, tiltOffset: 0, panInverted: false, tiltInverted: false },
  { id: 2, x: 3, y: 5, z: 3, pan: 0, tilt: 0, dimmer: 0, color: { r: 255, g: 255, b: 255 }, gobo: 0, zoom: 15, iris: 50, isSelected: false, targetX: 3, targetY: 3, panRange: { min: 0, max: 360 }, tiltRange: { min: -90, max: 90 }, panOffset: 0, tiltOffset: 0, panInverted: false, tiltInverted: false },
  { id: 3, x: 4.5, y: 5, z: 3, pan: 0, tilt: 0, dimmer: 0, color: { r: 255, g: 255, b: 255 }, gobo: 0, zoom: 15, iris: 50, isSelected: false, targetX: 4.5, targetY: 3, panRange: { min: 0, max: 360 }, tiltRange: { min: -90, max: 90 }, panOffset: 0, tiltOffset: 0, panInverted: false, tiltInverted: false },
  // Bigger gap in the middle
  { id: 4, x: 6.5, y: 5, z: 3, pan: 0, tilt: 0, dimmer: 0, color: { r: 255, g: 255, b: 255 }, gobo: 0, zoom: 15, iris: 50, isSelected: false, targetX: 6.5, targetY: 3, panRange: { min: 0, max: 360 }, tiltRange: { min: -90, max: 90 }, panOffset: 0, tiltOffset: 0, panInverted: false, tiltInverted: false },
  { id: 5, x: 8, y: 5, z: 3, pan: 0, tilt: 0, dimmer: 0, color: { r: 255, g: 255, b: 255 }, gobo: 0, zoom: 15, iris: 50, isSelected: false, targetX: 8, targetY: 3, panRange: { min: 0, max: 360 }, tiltRange: { min: -90, max: 90 }, panOffset: 0, tiltOffset: 0, panInverted: false, tiltInverted: false },
  { id: 6, x: 10, y: 5, z: 3, pan: 0, tilt: 0, dimmer: 0, color: { r: 255, g: 255, b: 255 }, gobo: 0, zoom: 15, iris: 50, isSelected: false, targetX: 10, targetY: 3, panRange: { min: 0, max: 360 }, tiltRange: { min: -90, max: 90 }, panOffset: 0, tiltOffset: 0, panInverted: false, tiltInverted: false },
];

export const useLightingStore = create<LightingStore>((set, get) => ({
  fixtures: defaultFixtures,
  floorPlan: {
    image: null,
    width: 12,
    height: 8,
    calibrationPoints: [],
    pixelsPerMeter: 50
  },
  selectedFixtures: [],
  presets: [],
  telnetConfig: {
    ip: '192.168.1.100',
    port: 23,
    connected: false,
    reconnecting: false
  },
  targetPoint: null,
  telnetClient: null,

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
    
    // Convert to percentages for telnet
    if (state.telnetClient) {
      const panPercent = degreesToPercent(pan, fixture.panRange.min, fixture.panRange.max);
      const tiltPercent = degreesToPercent(tilt, fixture.tiltRange.min, fixture.tiltRange.max);
      state.telnetClient.sendPanTilt(fixtureId, panPercent, tiltPercent);
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
    const state = get();
    if (state.telnetClient) {
      state.telnetClient.sendDimmer(fixtureIds, dimmer);
    }
    
    set(state => ({
      fixtures: state.fixtures.map(f => 
        fixtureIds.includes(f.id) ? { ...f, dimmer } : f
      )
    }));
  },

  updateColor: (fixtureIds, r, g, b) => {
    const state = get();
    if (state.telnetClient) {
      state.telnetClient.sendColor(fixtureIds, r, g, b);
    }
    
    set(state => ({
      fixtures: state.fixtures.map(f => 
        fixtureIds.includes(f.id) ? { ...f, color: { r, g, b } } : f
      )
    }));
  },

  updateGobo: (fixtureIds, gobo) => {
    const state = get();
    if (state.telnetClient) {
      state.telnetClient.sendGobo(fixtureIds, gobo);
    }
    
    set(state => ({
      fixtures: state.fixtures.map(f => 
        fixtureIds.includes(f.id) ? { ...f, gobo } : f
      )
    }));
  },

  updateIris: (fixtureIds, iris) => {
    const state = get();
    // Note: Iris telnet command could be added to TelnetClient later
    // if (state.telnetClient) {
    //   state.telnetClient.sendIris(fixtureIds, iris);
    // }
    
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

  updateTelnetConfig: (ip, port) => set(state => ({
    telnetConfig: { ...state.telnetConfig, ip, port }
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
    const fixtures = [...state.fixtures].sort((a, b) => a.x - b.x);
    const baseY = fixtures[0]?.y || 5;
    const startX = 1;
    
    return {
      fixtures: state.fixtures.map(f => {
        const index = fixtures.findIndex(fix => fix.id === f.id);
        return { ...f, x: startX + (index * spacing), y: baseY };
      })
    };
  }),

  initializeTelnet: () => {
    const state = get();
    if (state.telnetClient) {
      state.telnetClient.disconnect();
    }
    
    const client = new TelnetClient(
      state.telnetConfig.ip,
      state.telnetConfig.port,
      (connected) => set(state => ({
        telnetConfig: { ...state.telnetConfig, connected, reconnecting: false }
      })),
      (message) => console.log('[Telnet]', message)
    );
    
    set({ telnetClient: client });
    client.connect();
  }
}));
