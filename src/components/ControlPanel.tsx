import React, { useState, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { useLightingStore } from '../stores/lightingStore';
import { FloorPlanUpload } from './FloorPlanUpload';
import { Lightbulb, Palette, Circle, Settings, Wifi, WifiOff, Lock, Unlock } from 'lucide-react';

export const ControlPanel: React.FC = () => {
  const {
    fixtures,
    selectedFixtures,
    apiConfig,
    apiClient,
    floorPlan,
    scale,
    updateDimmer,
    updateColor,
    updateGobo,
    updateIris,
    updateFocus,
    updateZoom,
    updateFrost,
    parkFixtures,
    unparkFixtures,
    updateApiConfig,
    initializeApi,
    updateFloorPlanDimensions,
    updateFixtureHeight,
    updateFixturePosition,
    adjustFixtureSpacing,
    setScale
  } = useLightingStore();

  const [tempApiUrl, setTempApiUrl] = useState(apiConfig.baseUrl);

  // Local states for immediate visual feedback
  const [localDimmer, setLocalDimmer] = useState(0);
  const [localColor, setLocalColor] = useState({ r: 255, g: 255, b: 255 });
  const [localIris, setLocalIris] = useState(50);
  const [localFocus, setLocalFocus] = useState(50);
  const [localZoom, setLocalZoom] = useState(50);
  const [localFrost, setLocalFrost] = useState(0);

  // Debounce timers
  const dimmerTimer = useRef<NodeJS.Timeout | null>(null);
  const colorTimer = useRef<NodeJS.Timeout | null>(null);
  const irisTimer = useRef<NodeJS.Timeout | null>(null);
  const focusTimer = useRef<NodeJS.Timeout | null>(null);
  const zoomTimer = useRef<NodeJS.Timeout | null>(null);
  const frostTimer = useRef<NodeJS.Timeout | null>(null);

  const selectedFixtureData = fixtures.filter(f => selectedFixtures.includes(f.id));
  const hasSelection = selectedFixtures.length > 0;

  // Get common values for selected fixtures
  const commonDimmer = hasSelection ? selectedFixtureData[0]?.dimmer : 0;
  const commonColor = hasSelection ? selectedFixtureData[0]?.color : { r: 255, g: 255, b: 255 };
  const commonGobo = hasSelection ? selectedFixtureData[0]?.gobo : 0;
  const commonIris = hasSelection ? selectedFixtureData[0]?.iris : 50;
  const commonFocus = hasSelection ? selectedFixtureData[0]?.focus : 50;
  const commonZoom = hasSelection ? selectedFixtureData[0]?.zoom : 50;
  const commonFrost = hasSelection ? selectedFixtureData[0]?.frost : 0;

  // Update local states when selection changes
  React.useEffect(() => {
    setLocalDimmer(commonDimmer);
    setLocalColor(commonColor);
    setLocalIris(commonIris);
    setLocalFocus(commonFocus);
    setLocalZoom(commonZoom);
    setLocalFrost(commonFrost);
  }, [selectedFixtures, commonDimmer, commonColor, commonIris, commonFocus, commonZoom, commonFrost]);

  const handleDimmerChange = (value: number[]) => {
    if (hasSelection) {
      setLocalDimmer(value[0]);
      if (dimmerTimer.current) clearTimeout(dimmerTimer.current);
      dimmerTimer.current = setTimeout(() => {
        updateDimmer(selectedFixtures, value[0]);
      }, 300);
    }
  };

  const handleColorChange = (component: 'r' | 'g' | 'b', value: number[]) => {
    if (hasSelection) {
      const newColor = { ...localColor, [component]: value[0] };
      setLocalColor(newColor);
      if (colorTimer.current) clearTimeout(colorTimer.current);
      colorTimer.current = setTimeout(() => {
        updateColor(selectedFixtures, newColor.r, newColor.g, newColor.b);
      }, 300);
    }
  };

  const handleGoboChange = (goboIndex: number) => {
    if (hasSelection) {
      updateGobo(selectedFixtures, goboIndex);
    }
  };

  const handleIrisChange = (value: number[]) => {
    if (hasSelection) {
      setLocalIris(value[0]);
      if (irisTimer.current) clearTimeout(irisTimer.current);
      irisTimer.current = setTimeout(() => {
        updateIris(selectedFixtures, value[0]);
      }, 300);
    }
  };

  const handleFocusChange = (value: number[]) => {
    if (hasSelection) {
      setLocalFocus(value[0]);
      if (focusTimer.current) clearTimeout(focusTimer.current);
      focusTimer.current = setTimeout(() => {
        updateFocus(selectedFixtures, value[0]);
      }, 300);
    }
  };

  const handleZoomChange = (value: number[]) => {
    if (hasSelection) {
      setLocalZoom(value[0]);
      if (zoomTimer.current) clearTimeout(zoomTimer.current);
      zoomTimer.current = setTimeout(() => {
        updateZoom(selectedFixtures, value[0]);
      }, 300);
    }
  };

  const handleFrostChange = (value: number[]) => {
    if (hasSelection) {
      setLocalFrost(value[0]);
      if (frostTimer.current) clearTimeout(frostTimer.current);
      frostTimer.current = setTimeout(() => {
        updateFrost(selectedFixtures, value[0]);
      }, 300);
    }
  };

  const connectToApi = async () => {
    const connected = await initializeApi(tempApiUrl);
    if (!connected) {
      console.error('Failed to connect to API');
    }
  };

  const gobos = [
    { id: 0, name: 'Open', icon: '○' },
    { id: 1, name: 'Dots', icon: '⚬' },
    { id: 2, name: 'Lines', icon: '∥' },
    { id: 3, name: 'Grid', icon: '⊞' },
    { id: 4, name: 'Star', icon: '✦' },
    { id: 5, name: 'Spiral', icon: '◉' },
  ];

  return (
    <Card className="control-panel h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Settings className="w-5 h-5" />
          Control Panel
        </CardTitle>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          {(apiClient && apiClient.isConnected()) ? (
            <div className="flex items-center gap-1 text-primary">
              <Wifi className="w-4 h-4" />
              <span>Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <WifiOff className="w-4 h-4" />
              <span>Disconnected</span>
            </div>
          )}
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{apiConfig.grandma2Host}:{apiConfig.grandma2Port}</span>
        </div>
        
        {/* Selected Fixtures */}
        <div className="flex flex-wrap gap-1">
          {selectedFixtures.map(id => (
            <Badge key={id} variant="secondary" className="text-xs">
              Fixture {id}
            </Badge>
          ))}
          {!hasSelection && (
            <span className="text-sm text-muted-foreground">No fixtures selected</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 overflow-y-auto custom-scrollbar p-4">
        <Tabs defaultValue="lighting" className="w-full h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lighting">
              <Lightbulb className="w-4 h-4 mr-1" />
              Lighting
            </TabsTrigger>
            <TabsTrigger value="color">
              <Palette className="w-4 h-4 mr-1" />
              Color
            </TabsTrigger>
            <TabsTrigger value="setup">
              <Settings className="w-4 h-4 mr-1" />
              Setup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lighting" className="space-y-4 mt-4 overflow-y-auto custom-scrollbar max-h-[calc(100vh-280px)]">
            {/* Dimmer Control */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Dimmer</Label>
              <div className="flex items-center space-x-3">
                <Slider
                  value={[localDimmer]}
                  onValueChange={handleDimmerChange}
                  max={100}
                  step={1}
                  className="flex-1"
                  disabled={!hasSelection}
                />
                <span className="text-sm font-mono w-12 text-right">
                  {localDimmer}%
                </span>
              </div>
            </div>

            {/* Gobo Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Gobo / Shape</Label>
              <div className="grid grid-cols-3 gap-2">
                {gobos.map(gobo => (
                  <Button
                    key={gobo.id}
                    variant={commonGobo === gobo.id ? "default" : "outline"}
                    size="sm"
                    className="h-12 flex flex-col items-center justify-center"
                    onClick={() => handleGoboChange(gobo.id)}
                    disabled={!hasSelection}
                  >
                    <span className="text-lg">{gobo.icon}</span>
                    <span className="text-xs">{gobo.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Iris Control */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Iris Opening</Label>
              <div className="flex items-center space-x-3">
                <Slider
                  value={[localIris]}
                  onValueChange={handleIrisChange}
                  max={100}
                  step={1}
                  className="flex-1"
                  disabled={!hasSelection}
                />
                <span className="text-sm font-mono w-12 text-right">
                  {localIris}%
                </span>
              </div>
            </div>

            {/* Focus Control */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Focus</Label>
              <div className="flex items-center space-x-3">
                <Slider
                  value={[localFocus]}
                  onValueChange={handleFocusChange}
                  max={100}
                  step={1}
                  className="flex-1"
                  disabled={!hasSelection}
                />
                <span className="text-sm font-mono w-12 text-right">
                  {localFocus}%
                </span>
              </div>
            </div>

            {/* Zoom Control */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Zoom</Label>
              <div className="flex items-center space-x-3">
                <Slider
                  value={[localZoom]}
                  onValueChange={handleZoomChange}
                  max={100}
                  step={1}
                  className="flex-1"
                  disabled={!hasSelection}
                />
                <span className="text-sm font-mono w-12 text-right">
                  {localZoom}%
                </span>
              </div>
            </div>

            {/* Frost Control */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Frost / Diffusion</Label>
              <div className="flex items-center space-x-3">
                <Slider
                  value={[localFrost]}
                  onValueChange={handleFrostChange}
                  max={100}
                  step={1}
                  className="flex-1"
                  disabled={!hasSelection}
                />
                <span className="text-sm font-mono w-12 text-right">
                  {localFrost}%
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Actions</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => hasSelection && updateDimmer(selectedFixtures, 100)}
                  disabled={!hasSelection}
                >
                  Full On
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => hasSelection && updateDimmer(selectedFixtures, 0)}
                  disabled={!hasSelection}
                >
                  Blackout
                </Button>
              </div>
            </div>

            {/* Park/Unpark Controls */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fixture Lock</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => hasSelection && parkFixtures(selectedFixtures)}
                  disabled={!hasSelection || !apiClient?.isConnected()}
                >
                  <Lock className="w-3 h-3" />
                  Bloquear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => hasSelection && unparkFixtures(selectedFixtures)}
                  disabled={!hasSelection || !apiClient?.isConnected()}
                >
                  <Unlock className="w-3 h-3" />
                  Desbloquear
                </Button>
              </div>
              {hasSelection && selectedFixtureData.some(f => f.isParked) && (
                <p className="text-xs text-amber-500">
                  ⚠️ Algunos fixtures están bloqueados
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="color" className="space-y-4 mt-4 overflow-y-auto custom-scrollbar max-h-[calc(100vh-280px)]">
            {/* RGB Controls */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-red-400">Red</Label>
                <div className="flex items-center space-x-3">
                  <Slider
                    value={[localColor.r]}
                    onValueChange={(value) => handleColorChange('r', value)}
                    max={255}
                    step={1}
                    className="flex-1"
                    disabled={!hasSelection}
                  />
                  <span className="text-sm font-mono w-12 text-right">
                    {localColor.r}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-400">Green</Label>
                <div className="flex items-center space-x-3">
                  <Slider
                    value={[localColor.g]}
                    onValueChange={(value) => handleColorChange('g', value)}
                    max={255}
                    step={1}
                    className="flex-1"
                    disabled={!hasSelection}
                  />
                  <span className="text-sm font-mono w-12 text-right">
                    {localColor.g}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-blue-400">Blue</Label>
                <div className="flex items-center space-x-3">
                  <Slider
                    value={[localColor.b]}
                    onValueChange={(value) => handleColorChange('b', value)}
                    max={255}
                    step={1}
                    className="flex-1"
                    disabled={!hasSelection}
                  />
                  <span className="text-sm font-mono w-12 text-right">
                    {localColor.b}
                  </span>
                </div>
              </div>

              {/* Color Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Color Preview</Label>
                <div 
                  className="w-full h-12 rounded border border-border"
                  style={{ 
                    backgroundColor: `rgb(${localColor.r}, ${localColor.g}, ${localColor.b})` 
                  }}
                />
              </div>

              {/* Color Presets */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Color Presets</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: 'White', r: 255, g: 255, b: 255 },
                    { name: 'Red', r: 255, g: 0, b: 0 },
                    { name: 'Green', r: 0, g: 255, b: 0 },
                    { name: 'Blue', r: 0, g: 0, b: 255 },
                    { name: 'Yellow', r: 255, g: 255, b: 0 },
                    { name: 'Cyan', r: 0, g: 255, b: 255 },
                    { name: 'Magenta', r: 255, g: 0, b: 255 },
                    { name: 'Amber', r: 255, g: 150, b: 0 },
                  ].map(color => (
                    <Button
                      key={color.name}
                      variant="outline"
                      size="sm"
                      className="h-8 p-1"
                      style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                      onClick={() => hasSelection && updateColor(selectedFixtures, color.r, color.g, color.b)}
                      disabled={!hasSelection}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="setup" className="space-y-4 mt-4 overflow-y-auto custom-scrollbar max-h-[calc(100vh-280px)]">
            {/* API Configuration */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-url">API Base URL</Label>
                <Input
                  id="api-url"
                  value={tempApiUrl}
                  onChange={(e) => setTempApiUrl(e.target.value)}
                  placeholder="http://localhost:8000"
                />
                <p className="text-xs text-muted-foreground">
                  GrandMA2 configuration will be automatically retrieved from the API
                </p>
              </div>

              <Button 
                onClick={connectToApi}
                className="w-full"
                variant={(apiClient && apiClient.isConnected()) ? "secondary" : "default"}
              >
                {(apiClient && apiClient.isConnected()) ? "Reconnect" : "Connect"} to API
              </Button>

              {/* Show GrandMA2 config if connected */}
              {(apiClient && apiClient.isConnected()) && (
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium">GrandMA2 Configuration</Label>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Host:</span>
                      <span className="font-mono">{apiConfig.grandma2Host}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Port:</span>
                      <span className="font-mono">{apiConfig.grandma2Port}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Room Dimensions */}
            <div className="space-y-2">
              <Label>Room Dimensions</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="room-width" className="text-xs text-muted-foreground">Width (m)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="room-width"
                      type="number"
                      value={floorPlan.width}
                      onChange={(e) => {
                        const width = parseFloat(e.target.value) || 1;
                        updateFloorPlanDimensions(width, floorPlan.height);
                      }}
                      placeholder="38"
                      step="0.5"
                      min="1"
                      max="100"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="room-height" className="text-xs text-muted-foreground">Height (m)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="room-height"
                      type="number"
                      value={floorPlan.height}
                      onChange={(e) => {
                        const height = parseFloat(e.target.value) || 1;
                        updateFloorPlanDimensions(floorPlan.width, height);
                      }}
                      placeholder="35"
                      step="0.5"
                      min="1"
                      max="100"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fixture Height */}
            <div className="space-y-2">
              <Label htmlFor="fixture-height">Fixture Height (meters)</Label>
              <div className="flex items-center space-x-3">
                <Input
                  id="fixture-height"
                  type="number"
                  value={fixtures[0]?.z || 3}
                  onChange={(e) => {
                    const height = parseFloat(e.target.value) || 3;
                    updateFixtureHeight(height);
                  }}
                  placeholder="3.0"
                  step="0.1"
                  min="0.1"
                  max="20"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
            </div>

            {/* Fixture Spacing */}
            <div className="space-y-2">
              <Label htmlFor="fixture-spacing">Fixture Spacing (meters)</Label>
              <div className="flex items-center space-x-3">
                <Input
                  id="fixture-spacing"
                  type="number"
                  defaultValue="2"
                  onChange={(e) => {
                    const spacing = parseFloat(e.target.value) || 2;
                    adjustFixtureSpacing(spacing);
                  }}
                  placeholder="2.0"
                  step="0.1"
                  min="0.5"
                  max="10"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
            </div>

            {/* Individual Fixture Positions */}
            <div className="space-y-2">
              <Label>Fixture Positions</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {fixtures.map(fixture => (
                  <div key={fixture.id} className="flex items-center space-x-2 text-xs">
                    <span className="w-4 text-muted-foreground">#{fixture.id}</span>
                    <Input
                      type="number"
                      value={fixture.x}
                      onChange={(e) => {
                        const x = parseFloat(e.target.value) || 0;
                        updateFixturePosition(fixture.id, x, fixture.y);
                      }}
                      step="0.1"
                      className="h-6 text-xs flex-1"
                      placeholder="X"
                    />
                    <Input
                      type="number"
                      value={fixture.y}
                      onChange={(e) => {
                        const y = parseFloat(e.target.value) || 0;
                        updateFixturePosition(fixture.id, fixture.x, y);
                      }}
                      step="0.1"
                      className="h-6 text-xs flex-1"
                      placeholder="Y"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Floor Plan Setup */}
            <FloorPlanUpload />

            {/* Floor Plan Scale */}
            <div className="space-y-2">
              <Label htmlFor="floor-plan-scale">Floor Plan Scale</Label>
              <div className="flex items-center space-x-3">
                <Slider
                  value={[scale]}
                  onValueChange={(value) => setScale(value[0])}
                  min={0.2}
                  max={1.5}
                  step={0.1}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-12 text-right">
                  {Math.round(scale * 100)}%
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};