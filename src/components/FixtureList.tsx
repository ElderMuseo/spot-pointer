import React, { useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { useLightingStore } from '../stores/lightingStore';
import { Lightbulb, Eye, EyeOff, Target } from 'lucide-react';

export const FixtureList: React.FC = () => {
  const {
    fixtures,
    selectedFixtures,
    selectFixture,
    updateDimmer,
    updateColor
  } = useLightingStore();

  const dimmerTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const handleSelectAll = () => {
    // If all are selected, deselect all. Otherwise select all.
    if (selectedFixtures.length === fixtures.length) {
      fixtures.forEach(f => selectFixture(f.id, false));
    } else {
      fixtures.forEach(f => {
        if (!selectedFixtures.includes(f.id)) {
          selectFixture(f.id, true);
        }
      });
    }
  };

  const handleSelectNone = () => {
    fixtures.forEach(f => {
      if (selectedFixtures.includes(f.id)) {
        selectFixture(f.id, false);
      }
    });
  };

  const handleIndividualDimmer = (fixtureId: number, dimmer: number) => {
    // Clear existing timer for this fixture
    const existingTimer = dimmerTimers.current.get(fixtureId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      if (selectedFixtures.includes(fixtureId) && selectedFixtures.length > 1) {
        updateDimmer(selectedFixtures, dimmer);
      } else {
        updateDimmer([fixtureId], dimmer);
      }
      dimmerTimers.current.delete(fixtureId);
    }, 300);

    dimmerTimers.current.set(fixtureId, timer);
  };

  const isAllSelected = selectedFixtures.length === fixtures.length;
  const hasSelection = selectedFixtures.length > 0;

  return (
    <Card className="control-panel h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Target className="w-5 h-5" />
          Fixture Control
        </CardTitle>
        
        {/* Quick Selection Buttons */}
        <div className="flex gap-2">
          <Button
            variant={isAllSelected ? "default" : "outline"}
            size="sm"
            onClick={handleSelectAll}
            className="flex-1 h-8"
          >
            {isAllSelected ? "Deselect All" : "Select All"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectNone}
            disabled={!hasSelection}
            className="flex-1 h-8"
          >
            Clear
          </Button>
        </div>

        {/* Selection Info */}
        <div className="text-sm text-muted-foreground">
          {selectedFixtures.length > 0 ? (
            <span>{selectedFixtures.length} of {fixtures.length} fixtures selected</span>
          ) : (
            <span>No fixtures selected</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1 overflow-hidden">
        {/* Individual Fixture Controls */}
        <div className="space-y-2 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {fixtures.map((fixture) => {
            const isSelected = selectedFixtures.includes(fixture.id);
            const isActive = fixture.dimmer > 0;
            
            return (
              <Card 
                key={fixture.id} 
                className={`border transition-all duration-200 ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border bg-card'
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0 font-bold"
                        onClick={() => selectFixture(fixture.id, false)}
                      >
                        {fixture.id}
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        <Lightbulb 
                          className={`w-4 h-4 ${
                            isActive ? 'text-primary' : 'text-muted-foreground'
                          }`} 
                        />
                        <span className="text-sm font-medium">
                          Fixture {fixture.id}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Badge 
                        variant={isActive ? "default" : "outline"}
                        className="text-xs px-2"
                      >
                        {fixture.dimmer}%
                      </Badge>
                      {isActive && (
                        <div 
                          className="w-3 h-3 rounded-full border"
                          style={{ 
                            backgroundColor: `rgb(${fixture.color.r}, ${fixture.color.g}, ${fixture.color.b})` 
                          }}
                          title="Current color"
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Individual Dimmer Control */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Dimmer</span>
                      <span className="text-xs font-mono">{fixture.dimmer}%</span>
                    </div>
                    <Slider
                      value={[fixture.dimmer]}
                      onValueChange={(value) => handleIndividualDimmer(fixture.id, value[0])}
                      max={100}
                      step={1}
                      className="h-2"
                    />
                  </div>

                  {/* Position Info */}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Position: {fixture.x.toFixed(1)}m, {fixture.y.toFixed(1)}m | Pan: {fixture.pan.toFixed(1)}° | Tilt: {fixture.tilt.toFixed(1)}°
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Group Controls */}
        {hasSelection && (
          <div className="border-t border-border pt-3 space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Group Controls</span>
              <Badge variant="outline" className="text-xs">
                {selectedFixtures.length} selected
              </Badge>
            </div>
            
            {/* Group Dimmer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Group Dimmer</span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => updateDimmer(selectedFixtures, 100)}
                  >
                    100%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => updateDimmer(selectedFixtures, 50)}
                  >
                    50%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => updateDimmer(selectedFixtures, 0)}
                  >
                    Off
                  </Button>
                </div>
              </div>
            </div>

            {/* Group Color Presets */}
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Quick Colors</span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { name: 'White', r: 255, g: 255, b: 255 },
                  { name: 'Warm', r: 255, g: 200, b: 100 },
                  { name: 'Red', r: 255, g: 0, b: 0 },
                  { name: 'Blue', r: 0, g: 100, b: 255 },
                ].map(color => (
                  <Button
                    key={color.name}
                    variant="outline"
                    size="sm"
                    className="h-6 p-1 text-xs"
                    style={{ 
                      backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                      color: color.r + color.g + color.b > 400 ? '#000' : '#fff'
                    }}
                    onClick={() => updateColor(selectedFixtures, color.r, color.g, color.b)}
                    title={color.name}
                  >
                    {color.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};