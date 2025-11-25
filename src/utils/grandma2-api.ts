export class GrandMA2ApiClient {
  private baseUrl: string;
  private connected = false;
  private grandma2Host: string = '';
  private grandma2Port: number = 30000;

  constructor(
    private apiBaseUrl: string = 'http://localhost:8000',
    private onConnectionChange?: (connected: boolean) => void,
    private onLog?: (message: string) => void
  ) {
    this.baseUrl = apiBaseUrl;
  }

  /**
   * Check API health and connection status
   * Automatically fetches GrandMA2 configuration from the API
   */
  async connect(): Promise<boolean> {
    try {
      this.log('Checking API connection...');
      
      const healthResponse = await fetch(`${this.baseUrl}/health`);
      if (!healthResponse.ok) {
        throw new Error('API not responding');
      }

      const health = await healthResponse.json();
      if (health.status === 'ok') {
        // Store the GrandMA2 configuration from the health endpoint
        this.grandma2Host = health.host;
        this.grandma2Port = health.port;
        
        this.connected = true;
        this.onConnectionChange?.(true);
        this.log(`Connected to GrandMA2 API successfully (${health.host}:${health.port})`);
        return true;
      } else {
        throw new Error('API health check failed');
      }
    } catch (error) {
      this.log(`Connection failed: ${error}`);
      this.connected = false;
      this.onConnectionChange?.(false);
      return false;
    }
  }

  /**
   * Get the GrandMA2 host and port from the last successful connection
   */
  getGrandMA2Config(): { host: string; port: number } {
    return {
      host: this.grandma2Host,
      port: this.grandma2Port
    };
  }

  /**
   * Send pan and tilt commands for a single fixture
   * @param fixtureId - Fixture ID
   * @param pan - Pan value in degrees (e.g., -270 to +270)
   * @param tilt - Tilt value in degrees (e.g., -134 to +134)
   */
  async sendPanTilt(fixtureId: number, pan: number, tilt: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/move/fixture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixture: fixtureId,
          pan,
          tilt
        })
      });

      const result = await response.json();
      if (result.ok) {
        this.log(`Pan/Tilt sent for fixture ${fixtureId}: Pan=${pan}°, Tilt=${tilt}°`);
      } else {
        throw new Error('Command failed');
      }
    } catch (error) {
      this.log(`Pan/Tilt error: ${error}`);
    }
  }

  /**
   * Send pan and tilt commands for multiple fixtures in a single request
   * @param items - Array of {fixture, pan?, tilt?} objects
   */
  async sendPanTiltBatch(items: Array<{ fixture: number; pan?: number; tilt?: number }>): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/move/group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const result = await response.json();
      if (result.ok) {
        const fixtureIds = items.map(i => i.fixture).join(',');
        this.log(`Batch Pan/Tilt sent for fixtures ${fixtureIds}`);
      } else {
        throw new Error('Batch command failed');
      }
    } catch (error) {
      this.log(`Batch Pan/Tilt error: ${error}`);
    }
  }

  /**
   * Send dimmer command for fixtures (0-100%)
   */
  async sendDimmer(fixtureIds: number[], dimmer: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const items = fixtureIds.map(fixture => ({ fixture, value: dimmer }));

      const response = await fetch(`${this.baseUrl}/dim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const result = await response.json();
      if (result.ok) {
        this.log(`Dimmer sent for fixtures ${fixtureIds.join(',')}: ${dimmer}%`);
      } else {
        throw new Error('Dimmer command failed');
      }
    } catch (error) {
      this.log(`Dimmer error: ${error}`);
    }
  }

  /**
   * Send color commands (0-100 for each channel)
   */
  async sendColor(fixtureIds: number[], r: number, g: number, b: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const items = fixtureIds.map(fixture => ({
        fixture,
        r: Math.round((r / 255) * 100),
        g: Math.round((g / 255) * 100),
        b: Math.round((b / 255) * 100)
      }));

      const response = await fetch(`${this.baseUrl}/color`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const result = await response.json();
      if (result.ok) {
        this.log(`Color sent for fixtures ${fixtureIds.join(',')}: RGB(${r},${g},${b})`);
      } else {
        throw new Error('Color command failed');
      }
    } catch (error) {
      this.log(`Color error: ${error}`);
    }
  }

  /**
   * Send gobo command (deprecated - not supported by new API)
   */
  async sendGobo(fixtureIds: number[], gobo: number): Promise<void> {
    this.log(`Gobo command not supported by current API version`);
  }

  /**
   * Send iris command (0-100%)
   */
  async sendIris(fixtureIds: number[], iris: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const items = fixtureIds.map(fixture => ({ fixture, value: iris }));

      const response = await fetch(`${this.baseUrl}/iris`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const result = await response.json();
      if (result.ok) {
        this.log(`Iris sent for fixtures ${fixtureIds.join(',')}: ${iris}%`);
      } else {
        throw new Error('Iris command failed');
      }
    } catch (error) {
      this.log(`Iris error: ${error}`);
    }
  }

  /**
   * Send focus command (0-100%)
   */
  async sendFocus(fixtureIds: number[], focus: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const items = fixtureIds.map(fixture => ({ fixture, value: focus }));

      const response = await fetch(`${this.baseUrl}/focus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const result = await response.json();
      if (result.ok) {
        this.log(`Focus sent for fixtures ${fixtureIds.join(',')}: ${focus}%`);
      } else {
        throw new Error('Focus command failed');
      }
    } catch (error) {
      this.log(`Focus error: ${error}`);
    }
  }

  /**
   * Send zoom command (0-100%)
   */
  async sendZoom(fixtureIds: number[], zoom: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const items = fixtureIds.map(fixture => ({ fixture, value: zoom }));

      const response = await fetch(`${this.baseUrl}/zoom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const result = await response.json();
      if (result.ok) {
        this.log(`Zoom sent for fixtures ${fixtureIds.join(',')}: ${zoom}%`);
      } else {
        throw new Error('Zoom command failed');
      }
    } catch (error) {
      this.log(`Zoom error: ${error}`);
    }
  }

  /**
   * Send frost command (0-100%)
   */
  async sendFrost(fixtureIds: number[], frost: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const items = fixtureIds.map(fixture => ({ fixture, value: frost }));

      const response = await fetch(`${this.baseUrl}/frost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const result = await response.json();
      if (result.ok) {
        this.log(`Frost sent for fixtures ${fixtureIds.join(',')}: ${frost}%`);
      } else {
        throw new Error('Frost command failed');
      }
    } catch (error) {
      this.log(`Frost error: ${error}`);
    }
  }

  /**
   * Load a complete preset using the /preset/load endpoint
   * This endpoint handles the sequencing and delays automatically
   * Sequence: 1. Color, 2. Lighting (iris/focus/zoom/frost), 3. Position (pan/tilt), 4. Dimmer
   */
  async loadPreset(items: Array<{
    fixture: number;
    r?: number;
    g?: number;
    b?: number;
    iris?: number;
    focus?: number;
    zoom?: number;
    frost?: number;
    pan?: number;
    tilt?: number;
    dim?: number;
  }>, delay: number = 3.0): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/preset/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, delay })
      });

      const result = await response.json();
      if (result.ok) {
        this.log(`Preset loaded successfully with ${items.length} fixtures`);
      } else {
        throw new Error(result.error || 'Preset load failed');
      }
    } catch (error) {
      this.log(`Preset load error: ${error}`);
      throw error;
    }
  }

  /**
   * Park (lock) fixtures
   * @param fixtureIds - Array of fixture IDs to park
   */
  async parkFixtures(fixtureIds: number[]): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/park`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtures: fixtureIds })
      });

      const result = await response.json();
      if (result.ok) {
        this.log(`Parked fixtures ${fixtureIds.join(',')}`);
      } else {
        throw new Error(result.error || 'Park command failed');
      }
    } catch (error) {
      this.log(`Park error: ${error}`);
      throw error;
    }
  }

  /**
   * Unpark (unlock) fixtures
   * @param fixtureIds - Array of fixture IDs to unpark
   */
  async unparkFixtures(fixtureIds: number[]): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/unpark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtures: fixtureIds })
      });

      const result = await response.json();
      if (result.ok) {
        this.log(`Unparked fixtures ${fixtureIds.join(',')}`);
      } else {
        throw new Error(result.error || 'Unpark command failed');
      }
    } catch (error) {
      this.log(`Unpark error: ${error}`);
      throw error;
    }
  }

  private log(message: string): void {
    console.log(`[GrandMA2API] ${message}`);
    this.onLog?.(message);
  }

  disconnect(): void {
    this.connected = false;
    this.onConnectionChange?.(false);
    this.log('Disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }
}