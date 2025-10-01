import { Fixture } from '../types/lighting';

export interface GrandMA2Config {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface FixtureMoveRequest {
  fixtures?: number[];
  range?: { start: number; end: number };
  selector?: string;
  pan?: number;
  tilt?: number;
}

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
      
      // Check API health
      const healthResponse = await fetch(`${this.baseUrl}/health`);
      if (!healthResponse.ok) {
        throw new Error('API not responding');
      }

      // Check GrandMA2 connection
      const statusResponse = await fetch(`${this.baseUrl}/status/connection`);
      const status = await statusResponse.json();
      
      if (status.reachable) {
        this.connected = true;
        this.onConnectionChange?.(true);
        this.log('Connected to GrandMA2 successfully');
        return true;
      } else {
        throw new Error(status.error || 'GrandMA2 not reachable');
      }
    } catch (error) {
      this.log(`Connection failed: ${error}`);
      this.connected = false;
      this.onConnectionChange?.(false);
      return false;
    }
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<GrandMA2Config> {
    const response = await fetch(`${this.baseUrl}/config`);
    return response.json();
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<GrandMA2Config>): Promise<GrandMA2Config> {
    const response = await fetch(`${this.baseUrl}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return response.json();
  }

  /**
   * Send pan and tilt commands for fixtures
   */
  async sendPanTilt(fixtureId: number, pan: number, tilt: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const request: FixtureMoveRequest = {
        fixtures: [fixtureId],
        pan: pan,
        tilt: tilt
      };

      const response = await fetch(`${this.baseUrl}/fixtures/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      const result = await response.json();
      if (result.ok) {
        this.log(`Pan/Tilt sent for fixture ${fixtureId}: Pan=${pan}, Tilt=${tilt}`);
      } else {
        throw new Error('Command failed');
      }
    } catch (error) {
      this.log(`Pan/Tilt error: ${error}`);
    }
  }

  /**
   * Send dimmer command using raw command
   */
  async sendDimmer(fixtureIds: number[], dimmer: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const fixtureList = this.formatFixtureList(fixtureIds);
      const command = `Fixture ${fixtureList} Attribute "Dimmer" At ${dimmer}`;
      
      await this.sendRawCommand(command);
      this.log(`Dimmer sent for fixtures ${fixtureIds.join(',')}: ${dimmer}%`);
    } catch (error) {
      this.log(`Dimmer error: ${error}`);
    }
  }

  /**
   * Send color commands using dedicated endpoint
   */
  async sendColor(fixtureIds: number[], r: number, g: number, b: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/fixtures/color`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixtures: fixtureIds,
          r: Math.round((r / 255) * 100),
          g: Math.round((g / 255) * 100),
          b: Math.round((b / 255) * 100)
        })
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
   * Send gobo command using raw command
   */
  async sendGobo(fixtureIds: number[], gobo: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const fixtureList = this.formatFixtureList(fixtureIds);
      const command = `Fixture ${fixtureList} Attribute "Gobo" At ${gobo}`;
      
      await this.sendRawCommand(command);
      this.log(`Gobo sent for fixtures ${fixtureIds.join(',')}: ${gobo}`);
    } catch (error) {
      this.log(`Gobo error: ${error}`);
    }
  }

  /**
   * Send iris command using dedicated endpoint
   */
  async sendIris(fixtureIds: number[], iris: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/fixtures/iris`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixtures: fixtureIds,
          iris: iris
        })
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
   * Send focus command using dedicated endpoint
   */
  async sendFocus(fixtureIds: number[], focus: number): Promise<void> {
    if (!this.connected) {
      this.log('Not connected - skipping command');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/fixtures/focus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixtures: fixtureIds,
          focus: focus
        })
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
   * Send raw command to GrandMA2
   */
  async sendRawCommand(command: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error('Raw command failed');
    }
  }

  /**
   * Format fixture list for GrandMA2 commands
   */
  private formatFixtureList(fixtureIds: number[]): string {
    if (fixtureIds.length === 1) {
      return fixtureIds[0].toString();
    }
    
    // Check for consecutive ranges
    const sorted = [...fixtureIds].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        if (start === end) {
          ranges.push(start.toString());
        } else {
          ranges.push(`${start} Thru ${end}`);
        }
        start = end = sorted[i];
      }
    }

    // Add final range
    if (start === end) {
      ranges.push(start.toString());
    } else {
      ranges.push(`${start} Thru ${end}`);
    }

    return ranges.join(' + ');
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