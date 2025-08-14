import React, { useEffect } from 'react';
import { FloorPlan } from '../components/FloorPlan';
import { ControlPanel } from '../components/ControlPanel';
import { PresetManager } from '../components/PresetManager';
import { useLightingStore } from '../stores/lightingStore';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Lightbulb, Target, Zap } from 'lucide-react';

const Index = () => {
  const { 
    fixtures, 
    selectedFixtures, 
    telnetConfig,
    initializeTelnet 
  } = useLightingStore();

  // Initialize telnet connection on mount
  useEffect(() => {
    initializeTelnet();
  }, [initializeTelnet]);

  const activeFixtures = fixtures.filter(f => f.dimmer > 0).length;
  const selectedCount = selectedFixtures.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">
                  Lighting Control System
                </h1>
              </div>
              <Badge variant="outline" className="text-xs">
                Professional
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="text-muted-foreground">
                  {activeFixtures}/6 active
                </span>
              </div>
              {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span className="text-muted-foreground">
                    {selectedCount} selected
                  </span>
                </div>
              )}
              <div className={`px-2 py-1 rounded text-xs ${
                telnetConfig.connected 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-destructive/20 text-destructive'
              }`}>
                {telnetConfig.connected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="container mx-auto px-4 py-4 h-[calc(100vh-73px)]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
          {/* Floor Plan - Main Area */}
          <div className="lg:col-span-2 order-1">
            <FloorPlan />
          </div>
          
          {/* Control Panel */}
          <div className="order-2 lg:order-2">
            <ControlPanel />
          </div>
          
          {/* Preset Manager */}
          <div className="order-3 lg:order-3">
            <PresetManager />
          </div>
        </div>
      </div>

      {/* Quick Help Overlay */}
      <div className="fixed bottom-4 left-4 bg-card/90 backdrop-blur border border-border rounded-lg p-3 text-xs max-w-xs">
        <div className="font-medium text-foreground mb-1">Quick Help</div>
        <div className="space-y-1 text-muted-foreground">
          <div>• Click fixtures to select</div>
          <div>• Click map to aim selected fixtures</div>
          <div>• Hold Shift for multi-select</div>
          <div>• Save presets for quick recall</div>
        </div>
      </div>
    </div>
  );
};

export default Index;
