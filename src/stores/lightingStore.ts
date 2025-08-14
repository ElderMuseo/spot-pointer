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
  savePreset: (name: string, description: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  updateTelnetConfig: (ip: string, port: number) => void;
  setFloorPlan: (image: string, width: number, height: number) => void;
  // Telnet client
  telnetClient: TelnetClient | null;
  initializeTelnet: () => void;
}

const defaultFixtures: Fixture[] = [
  // 1x6 configuration with bigger space in the middle
  { id: 1, x: 1, y: 5, z: 3, pan: 0, tilt: 0, dimmer: 0, color: { r: 255, g: 255, b: 255 }, gobo: 0, zoom: 15, isSelected: false, panRange: { min: 0, max: 360 }, tiltRange: { min: -90, max: 90 }, panOffset: 0, tiltOffset: 0, panInverted: false, tiltInverted: false },
  { id: 2, x: 3, y: 5, z: 3, pan: 0, tilt: 0, dimmer: 0, color: { r: 255, g: 255, b: 255 }, gobo: 0, zoom: 15, isSelected: false, panRange: { min: 0, max: 360 }, tiltRange: { min: -90, max: 90 }, panOffset: 0, tiltOffset: 0, panInverted: false, tiltInverted: false },
  { id: 3, x: 4.5, y: 5, z: 3, pan: 0, tilt: 0, dimmer: 0, color: { r: 255, g: 255, b: 255 }, gobo: 0, zoom: 15, isSelected: false, panRange: { min: 0, max: 360 }, tiltRange: { min: -90, max: 90 }, panOffset: 0, tiltOffset: 0, panInverted: false, tiltInverted: false },
  // Bigger gap in the middle
  { id: 4, x: 6.5, y: 5, z: 3, pan: 0, tilt: 0, dimmer: 0, color: { r: 255, g: 255, b: 255 }, gobo: 0, zoom: 15, isSelected: false, panRange: { min: 0, max: 360 }, tiltRange: { min: -90, max: 90 }, panOffset: 0, tiltOffset: 0, panInverted: false, tiltInverted: false },
  { id: 5, x: 8, y: 5, z: 3, pan: 0, tilt: 0, dimmer: 0, color: { r: 255, g: 255, b: 255 }, gobo: 0, zoom: 15, isSelected: false, panRange: { min: 0, max: 360 }, tiltRange: { min: -90, max: 90 }, panOffset: 0, tiltOffset: 0, panInverted: false, tiltInverted: false },
  { id: 6, x: 10, y: 5, z: 3, pan: 0, tilt: 0, dimmer: 0, color: { r: 255, g: 255, b: 255 }, gobo: 0, zoom: 15, isSelected: false, panRange: { min: 0, max: 360 }, tiltRange: { min: -90, max: 90 }, panOffset: 0, tiltOffset: 0, panInverted: false, tiltInverted: false },
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
      const isSelected = state.selectedFixtures.includes(id);
      return {
        selectedFixtures: isSelected 
          ? state.selectedFixtures.filter(fId => fId !== id)
          : [...state.selectedFixtures, id],
        fixtures: state.fixtures.map(f => ({
          ...f,
          isSelected: f.id === id ? !f.isSelected : f.isSelected
        }))
      };
    } else {
      // Single selection - if clicking same fixture, toggle it. Otherwise select only that one.
      const isCurrentlySelected = state.selectedFixtures.includes(id) && state.selectedFixtures.length === 1;
      if (isCurrentlySelected) {
        return {
          selectedFixtures: [],
          fixtures: state.fixtures.map(f => ({ ...f, isSelected: false }))
        };
      } else {
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
    if (!fixture || !state.telnetClient) return;

    const { pan, tilt } = calculatePanTilt(fixture, x, y);
    
    // Convert to percentages for telnet
    const panPercent = degreesToPercent(pan, fixture.panRange.min, fixture.panRange.max);
    const tiltPercent = degreesToPercent(tilt, fixture.tiltRange.min, fixture.tiltRange.max);
    
    // Send telnet commands
    state.telnetClient.sendPanTilt(fixtureId, panPercent, tiltPercent);
    
    // Update local state
    set(state => ({
      fixtures: state.fixtures.map(f => 
        f.id === fixtureId ? { ...f, pan, tilt } : f
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