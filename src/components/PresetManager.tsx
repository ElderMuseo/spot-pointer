import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { useLightingStore } from '../stores/lightingStore';
import { Save, Play, Trash2, Plus, Clock } from 'lucide-react';
import { Textarea } from './ui/textarea';

export const PresetManager: React.FC = () => {
  const { presets, savePreset, loadPreset, deletePreset } = useLightingStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      savePreset(newPresetName.trim(), newPresetDescription.trim());
      setNewPresetName('');
      setNewPresetDescription('');
      setIsCreateDialogOpen(false);
    }
  };

  const handleLoadPreset = (presetId: string) => {
    loadPreset(presetId);
  };

  const handleDeletePreset = (presetId: string) => {
    if (confirm('Are you sure you want to delete this preset?')) {
      deletePreset(presetId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="control-panel h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Save className="w-5 h-5" />
            Presets
          </CardTitle>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Save Current
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save New Preset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="preset-name">Preset Name</Label>
                  <Input
                    id="preset-name"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="e.g., Center Stage Warm"
                    maxLength={50}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="preset-description">Description (Optional)</Label>
                  <Textarea
                    id="preset-description"
                    value={newPresetDescription}
                    onChange={(e) => setNewPresetDescription(e.target.value)}
                    placeholder="Brief description of this lighting setup..."
                    rows={3}
                    maxLength={200}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSavePreset}
                    disabled={!newPresetName.trim()}
                  >
                    Save Preset
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {presets.length} saved preset{presets.length !== 1 ? 's' : ''}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {presets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Save className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No presets saved yet</p>
            <p className="text-xs">Save your current lighting setup to quickly recall it later</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {presets.map((preset) => (
              <Card key={preset.id} className="bg-preset-bg border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {preset.name}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {preset.fixtures.filter(f => f.dimmer > 0).length} active
                        </Badge>
                      </div>
                      
                      {preset.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {preset.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(preset.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 px-2 gap-1"
                        onClick={() => handleLoadPreset(preset.id)}
                      >
                        <Play className="w-3 h-3" />
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        onClick={() => handleDeletePreset(preset.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Fixture Status Indicators */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {preset.fixtures.map((fixture) => (
                      <div
                        key={fixture.id}
                        className={`w-4 h-4 rounded-full text-xs flex items-center justify-center ${
                          fixture.dimmer > 0 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}
                        title={`Fixture ${fixture.id}: ${fixture.dimmer}% dimmer`}
                      >
                        {fixture.id}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};