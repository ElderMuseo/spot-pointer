import { Fixture } from '../types/lighting';

export class TelnetClient {
  private commandQueue: string[] = [];
  private isProcessing = false;
  private connected = false;
  private readonly debounceTime = 75; // ms
  private debounceTimer?: NodeJS.Timeout;

  constructor(
    private ip: string,
    private port: number,
    private onConnectionChange?: (connected: boolean) => void,
    private onLog?: (message: string) => void
  ) {}

  /**
   * Simulate connection (in real implementation, this would use WebSocket proxy)
   */
  async connect(): Promise<boolean> {
    try {
      this.log(`Connecting to ${this.ip}:${this.port}...`);
      // Simulate connection delay
      await new Promise<void>(resolve => setTimeout(resolve, 500));
      this.connected = true;
      this.onConnectionChange?.(true);
      this.log('Connected successfully');
      return true;
    } catch (error) {
      this.log(`Connection failed: ${error}`);
      this.connected = false;
      this.onConnectionChange?.(false);
      return false;
    }
  }

  /**
   * Send commands with debouncing and queuing
   */
  sendCommands(commands: string[], debounce = true): void {
    if (!this.connected) {
      this.log('Not connected - queuing commands');
    }

    this.commandQueue.push(...commands);

    if (debounce) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.processQueue();
      }, this.debounceTime);
    } else {
      this.processQueue();
    }
  }

  /**
   * Send pan and tilt commands for a fixture
   */
  sendPanTilt(fixtureId: number, pan: number, tilt: number): void {
    const commands = [
      `Fixture ${fixtureId} Attribute "Pan" At ${pan.toFixed(1)}`,
      `Fixture ${fixtureId} Attribute "Tilt" At ${tilt.toFixed(1)}`
    ];
    this.sendCommands(commands);
  }

  /**
   * Send dimmer command
   */
  sendDimmer(fixtureIds: number[], dimmer: number): void {
    const fixtureList = this.formatFixtureList(fixtureIds);
    const command = `Fixture ${fixtureList} Attribute "Dimmer" At ${dimmer}`;
    this.sendCommands([command], false);
  }

  /**
   * Send color commands (RGB)
   */
  sendColor(fixtureIds: number[], r: number, g: number, b: number): void {
    const fixtureList = this.formatFixtureList(fixtureIds);
    const commands = [
      `Fixture ${fixtureList} Attribute "Red" At ${Math.round((r / 255) * 100)}`,
      `Fixture ${fixtureList} Attribute "Green" At ${Math.round((g / 255) * 100)}`,
      `Fixture ${fixtureList} Attribute "Blue" At ${Math.round((b / 255) * 100)}`
    ];
    this.sendCommands(commands, false);
  }

  /**
   * Send gobo command
   */
  sendGobo(fixtureIds: number[], gobo: number): void {
    const fixtureList = this.formatFixtureList(fixtureIds);
    const command = `Fixture ${fixtureList} Attribute "Gobo" At ${gobo}`;
    this.sendCommands([command], false);
  }

  /**
   * Process the command queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.commandQueue.length === 0) return;

    this.isProcessing = true;
    
    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift()!;
      await this.sendCommand(command);
      // Small delay between commands to prevent overload
      await new Promise<void>(resolve => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
  }

  /**
   * Send individual command
   */
  private async sendCommand(command: string): Promise<void> {
    try {
      this.log(`Sending: ${command}`);
      // In real implementation, send via WebSocket to backend proxy
      // await this.socket.send(command);
    } catch (error) {
      this.log(`Send error: ${error}`);
    }
  }

  /**
   * Format fixture list for commands
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
    console.log(`[TelnetClient] ${message}`);
    this.onLog?.(message);
  }

  disconnect(): void {
    this.connected = false;
    this.onConnectionChange?.(false);
    this.commandQueue = [];
    this.log('Disconnected');
  }
}