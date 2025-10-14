
import React, { useEffect } from 'react';
import { FloorPlan } from '../components/FloorPlan';
import { ControlPanel } from '../components/ControlPanel';
import { PresetManager } from '../components/PresetManager';
import { FixtureList } from '../components/FixtureList';
import { KeyboardShortcuts } from '../components/KeyboardShortcuts';
import { useLightingStore } from '../stores/lightingStore';
import { Badge } from '../components/ui/badge';
import { Lightbulb, Target, Zap, Keyboard } from 'lucide-react';

const Index = () => {
  const { 
    fixtures, 
    selectedFixtures, 
    apiConfig,
    apiClient,
    initializeApi 
  } = useLightingStore();

  // Initialize API connection on mount
  useEffect(() => {
    initializeApi(apiConfig.baseUrl);
  }, [initializeApi, apiConfig.baseUrl]);

  const activeFixtures = fixtures.filter(f => f.dimmer > 0).length;
  const selectedCount = selectedFixtures.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <KeyboardShortcuts />
      
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur flex-shrink-0">
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
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                <span className="text-muted-foreground">1-6 keys</span>
              </div>
              <div className={`px-2 py-1 rounded text-xs ${
                (apiClient && apiClient.isConnected()) 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-destructive/20 text-destructive'
              }`}>
                {(apiClient && apiClient.isConnected()) ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Horizontal layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Floor Plan - Takes most of the screen */}
        <div className="flex-[1.2] overflow-hidden p-4">
          <FloorPlan />
        </div>
        
        {/* Control Panels - Side panel */}
        <div className="flex-shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-card/30 backdrop-blur w-full lg:w-80 xl:w-96 overflow-hidden">
          <div className="p-3 h-full flex flex-col">
            <div className="flex flex-col gap-3 h-full overflow-y-auto">
              {/* Fixture List - Individual Controls */}
              <div className="flex-shrink-0">
                <FixtureList />
              </div>
              
              {/* Control Panel - Group Controls */}
              <div className="flex-shrink-0">
                <ControlPanel />
              </div>
              
              {/* Preset Manager */}
              <div className="flex-shrink-0">
                <PresetManager />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Help Overlay */}
      <div className="fixed bottom-4 right-4 bg-card/90 backdrop-blur border border-border rounded-lg p-3 text-xs max-w-xs">
        <div className="font-medium text-foreground mb-2 flex items-center gap-1">
          <Keyboard className="w-3 h-3" />
          Quick Controls
        </div>
        <div className="space-y-1 text-muted-foreground">
          <div>• <kbd className="bg-muted px-1 rounded text-xs">1-6</kbd> Select fixtures</div>
          <div>• <kbd className="bg-muted px-1 rounded text-xs">Shift+Click</kbd> Multi-select</div>
          <div>• <kbd className="bg-muted px-1 rounded text-xs">Space</kbd> Full brightness</div>
          <div>• <kbd className="bg-muted px-1 rounded text-xs">B</kbd> Blackout selected</div>
          <div>• <kbd className="bg-muted px-1 rounded text-xs">Esc</kbd> Clear selection</div>
          <div>• Click map to aim selected fixtures</div>
        </div>
      </div>
    </div>
  );
};

export default Index;
