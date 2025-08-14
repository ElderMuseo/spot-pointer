import React, { useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { useLightingStore } from '../stores/lightingStore';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export const FloorPlanUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { floorPlan, setFloorPlan } = useLightingStore();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setFloorPlan(result, floorPlan.width, floorPlan.height);
        toast({
          title: "Floor plan uploaded",
          description: "Your floor plan image has been loaded successfully"
        });
      }
    };
    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "Failed to read the image file",
        variant: "destructive"
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearImage = () => {
    setFloorPlan('', floorPlan.width, floorPlan.height);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast({
      title: "Floor plan cleared",
      description: "Background image has been removed"
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Floor Plan Image</Label>
        
        {floorPlan.image ? (
          <Card className="border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm">Image loaded</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearImage}
                  className="h-7 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="mt-2">
                <img 
                  src={floorPlan.image} 
                  alt="Floor plan preview" 
                  className="w-full h-16 object-cover rounded border"
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outline"
            onClick={handleUploadClick}
            className="w-full h-20 border-dashed border-2 hover:border-primary/50"
          >
            <div className="text-center">
              <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                Click to upload floor plan
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                JPG, PNG up to 10MB
              </div>
            </div>
          </Button>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Width (m)</Label>
          <Input
            type="number"
            value={floorPlan.width}
            onChange={(e) => {
              const width = parseFloat(e.target.value) || 12;
              setFloorPlan(floorPlan.image || '', width, floorPlan.height);
            }}
            min="1"
            max="100"
            step="0.1"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Height (m)</Label>
          <Input
            type="number"
            value={floorPlan.height}
            onChange={(e) => {
              const height = parseFloat(e.target.value) || 8;
              setFloorPlan(floorPlan.image || '', floorPlan.width, height);
            }}
            min="1"
            max="100"
            step="0.1"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Set the real-world dimensions of your space. The image will be scaled accordingly.
      </div>
    </div>
  );
};