export class GrandMA2ApiClient {
  private baseUrl: string;
  private connected = false;

  constructor(
    private apiBaseUrl: string = 'http://localhost:8000',
    private onConnectionChange?: (connected: boolean) => void,
    private onLog?: (message: string) => void
  ) {
    this.baseUrl = apiBaseUrl;
  }

  /**
   * Check API health and connection status
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
   * Send dimmer command for fixtures (0-100%)
   */
  async sendDimmer(fixtureIds: number[], dimmer: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const body: any = { value: dimmer };
      
      if (fixtureIds.length === 1) {
        body.fixture = fixtureIds[0];
      } else {
        body.fixtures = fixtureIds;
      }

      const response = await fetch(`${this.baseUrl}/dim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
      const body: any = {
        r: Math.round((r / 255) * 100),
        g: Math.round((g / 255) * 100),
        b: Math.round((b / 255) * 100)
      };
      
      if (fixtureIds.length === 1) {
        body.fixture = fixtureIds[0];
      } else {
        body.fixtures = fixtureIds;
      }

      const response = await fetch(`${this.baseUrl}/color`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
   * Send iris command (deprecated - not supported by new API)
   */
  async sendIris(fixtureIds: number[], iris: number): Promise<void> {
    this.log(`Iris command not supported by current API version`);
  }

  /**
   * Send focus command (deprecated - not supported by new API)
   */
  async sendFocus(fixtureIds: number[], focus: number): Promise<void> {
    this.log(`Focus command not supported by current API version`);
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