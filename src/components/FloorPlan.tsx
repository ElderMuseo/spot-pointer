
import React, { useRef, useEffect, useState } from 'react';
import { useLightingStore } from '../stores/lightingStore';
import { pixelToReal, realToPixel, calculateLightCone } from '../utils/geometry';

export const FloorPlan: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  
  const {
    fixtures,
    floorPlan,
    selectedFixtures,
    targetPoint,
    scale,
    selectFixture,
    aimFixtureAt,
    aimMultipleFixturesAt,
    setTargetPoint
  } = useLightingStore();

  // Handle canvas click (accounting for 90° rotation)
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    // Get click position relative to rotated canvas display
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Convert to pre-rotation canvas coordinates
    // After 90° clockwise rotation:
    // - Visual left (clickX=0) → Canvas bottom (canvasY=height)
    // - Visual right (clickX=width) → Canvas top (canvasY=0)
    // - Visual top (clickY=0) → Canvas left (canvasX=0)
    // - Visual bottom (clickY=height) → Canvas right (canvasX=width)
    const canvasX = (clickY / rect.height) * canvasSize.width;
    const canvasY = canvasSize.height - (clickX / rect.width) * canvasSize.height;
    
    // Calculate pixels per meter
    const pixelsPerMeter = canvasSize.width / floorPlan.width;
    
    // Convert pixel coordinates to real world coordinates
    const realCoords = pixelToReal(canvasX, canvasY, {
      width: floorPlan.width,
      height: floorPlan.height,
      pixelsPerMeter: pixelsPerMeter
    });

    setTargetPoint(realCoords.x, realCoords.y);

    // Aim selected fixtures at clicked point
    if (selectedFixtures.length > 0) {
      if (selectedFixtures.length === 1) {
        aimFixtureAt(selectedFixtures[0], realCoords.x, realCoords.y);
      } else {
        aimMultipleFixturesAt(selectedFixtures, realCoords.x, realCoords.y);
      }
    }
  };

  // Handle fixture click
  const handleFixtureClick = (fixtureId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    selectFixture(fixtureId, event.shiftKey);
  };

  // Update canvas size based on container
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width - 16; // Reduced padding
        const containerHeight = rect.height - 16; // Reduced padding
        
        // Fixed floor plan dimensions: 20.67m × 36.7m
        // Canvas internal dimensions stay the same, rotation is visual only
        const roomAspectRatio = 20.67 / 36.7;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let canvasWidth, canvasHeight;
        
        // Maximize canvas size to fill available container space completely
        if (containerAspectRatio > roomAspectRatio) {
          // Container is wider than room ratio - use full height
          canvasHeight = containerHeight;
          canvasWidth = canvasHeight * roomAspectRatio;
        } else {
          // Container is taller than room ratio - use full width
          canvasWidth = containerWidth;
          canvasHeight = canvasWidth / roomAspectRatio;
        }
        
        setCanvasSize({
          width: canvasWidth,
          height: canvasHeight
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Draw the floor plan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas dimensions match floor plan (rotation is only visual)
    const pixelsPerMeter = canvasSize.width / floorPlan.width;

    // Clear canvas
    ctx.fillStyle = 'hsl(220, 15%, 8%)';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw background image if available
    if (floorPlan.image) {
      const img = new Image();
      img.onload = () => {
        ctx.globalAlpha = 0.7;
        ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);
        ctx.globalAlpha = 1;
        drawOverlay();
      };
      img.src = floorPlan.image;
    } else {
      drawOverlay();
    }

    function drawOverlay() {
      // Draw grid
      ctx.strokeStyle = 'hsl(220, 10%, 30%)';
      ctx.lineWidth = 0.5;
      
      // Vertical grid lines (X coordinates)
      for (let i = 0; i <= floorPlan.width; i++) {
        const x = i * pixelsPerMeter;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasSize.height);
        ctx.stroke();
        
        // X coordinate labels
        if (i % 5 === 0) {
          ctx.fillStyle = 'hsl(220, 10%, 60%)';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(i.toString() + 'm', x, canvasSize.height - 5);
        }
      }
      
      // Horizontal grid lines (Y coordinates - remember Y increases upward)
      for (let i = 0; i <= floorPlan.height; i++) {
        const canvasY = canvasSize.height - (i * pixelsPerMeter); // Flip for bottom-left origin
        ctx.beginPath();
        ctx.moveTo(0, canvasY);
        ctx.lineTo(canvasSize.width, canvasY);
        ctx.stroke();
        
        // Y coordinate labels (show real Y values)
        if (i % 5 === 0) {
          ctx.fillStyle = 'hsl(220, 10%, 60%)';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(i.toString() + 'm', 5, canvasY - 5);
        }
      }

      // Draw individual light cones for ALL fixtures
      fixtures.forEach(fixture => {
        // Use fixture's individual target point and iris for cone size
        const baseBeamAngle = fixture.zoom;
        const irisMultiplier = fixture.iris / 100; // Convert iris percentage to multiplier
        const adjustedBeamAngle = baseBeamAngle * irisMultiplier;
        const cone = calculateLightCone(fixture, fixture.targetX, fixture.targetY, adjustedBeamAngle);
        const centerPixel = realToPixel(cone.centerX, cone.centerY, {
          width: floorPlan.width,
          height: floorPlan.height,
          pixelsPerMeter
        });

        // Use fixture's actual RGB color
        const { r, g, b } = fixture.color;
        
        // Calculate opacity based on dimmer level (0-100%) and selection state
        const dimmerOpacity = fixture.dimmer / 100; // Convert dimmer to 0-1 range
        const isSelected = fixture.isSelected;
        const baseOpacity = isSelected ? 0.4 : 0.25; // Higher base opacity for visibility
        const opacity = baseOpacity * dimmerOpacity; // Multiply by dimmer level
        const strokeOpacity = isSelected ? 0.8 * dimmerOpacity : 0.6 * dimmerOpacity;
        const lineWidth = isSelected ? 2 : 1;
        
        // Draw cone using fixture's RGB color with dimmer-based opacity
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${strokeOpacity})`;
        ctx.lineWidth = lineWidth;
        
        ctx.beginPath();
        ctx.ellipse(
          centerPixel.x,
          centerPixel.y,
          cone.radiusX * pixelsPerMeter,
          cone.radiusY * pixelsPerMeter,
          (cone.rotation * Math.PI) / 180,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.stroke();

        // Draw beam line from fixture to target (only for selected fixtures)
        if (isSelected) {
          const fixturePixel = realToPixel(fixture.x, fixture.y, {
            width: floorPlan.width,
            height: floorPlan.height,
            pixelsPerMeter
          });

          const beamOpacity = 0.8 * dimmerOpacity; // Use dimmer for beam line opacity too
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${beamOpacity})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(fixturePixel.x, fixturePixel.y);
          ctx.lineTo(centerPixel.x, centerPixel.y);
          ctx.stroke();
        }
      });

      // Draw fixtures
      fixtures.forEach(fixture => {
        const pixel = realToPixel(fixture.x, fixture.y, {
          width: floorPlan.width,
          height: floorPlan.height,
          pixelsPerMeter
        });

        const isSelected = fixture.isSelected;
        const radius = 20;

        // Fixture circle
        ctx.fillStyle = isSelected 
          ? 'hsl(45, 95%, 60%)' 
          : 'hsl(220, 10%, 40%)';
        ctx.strokeStyle = 'hsl(220, 15%, 25%)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(pixel.x, pixel.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Fixture number
        ctx.fillStyle = isSelected ? 'hsl(220, 15%, 8%)' : 'hsl(45, 20%, 95%)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fixture.id.toString(), pixel.x, pixel.y);

        // Selection glow
        if (isSelected) {
          ctx.shadowColor = 'hsl(45, 95%, 60%)';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(pixel.x, pixel.y, radius + 4, 0, 2 * Math.PI);
          ctx.strokeStyle = 'hsl(45, 95%, 60%)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw target point
      if (targetPoint) {
        const pixel = realToPixel(targetPoint.x, targetPoint.y, {
          width: floorPlan.width,
          height: floorPlan.height,
          pixelsPerMeter
        });

        ctx.fillStyle = 'hsl(0, 75%, 55%)';
        ctx.strokeStyle = 'hsl(45, 20%, 95%)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(pixel.x, pixel.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Crosshair
        ctx.strokeStyle = 'hsl(45, 20%, 95%)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pixel.x - 15, pixel.y);
        ctx.lineTo(pixel.x + 15, pixel.y);
        ctx.moveTo(pixel.x, pixel.y - 15);
        ctx.lineTo(pixel.x, pixel.y + 15);
        ctx.stroke();
      }
    }
  }, [fixtures, floorPlan, selectedFixtures, targetPoint, canvasSize]);

  return (
    <div className="relative flex bg-card rounded-lg border border-border items-center justify-center w-full h-full" style={{ 
      aspectRatio: `${canvasSize.height} / ${canvasSize.width}`
    }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="cursor-crosshair"
        onClick={handleCanvasClick}
        style={{ 
          imageRendering: 'crisp-edges',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          transform: 'rotate(90deg)',
          transformOrigin: 'center'
        }}
      />
      
      {/* Fixture click handlers */}
      {fixtures.map(fixture => {
        const pixelsPerMeter = canvasSize.width / floorPlan.width;
        const pixel = realToPixel(fixture.x, fixture.y, {
          width: floorPlan.width,
          height: floorPlan.height,
          pixelsPerMeter
        });
        
        // Adjust position for 90° clockwise rotation
        // Canvas (x, y) → Visual position after rotation
        const rotatedLeft = canvasSize.height - pixel.y;
        const rotatedTop = pixel.x;
        
        return (
          <div
            key={fixture.id}
            className="absolute cursor-pointer"
            style={{
              left: rotatedLeft - 20,
              top: rotatedTop - 20,
              width: 40,
              height: 40,
            }}
            onClick={(e) => handleFixtureClick(fixture.id, e)}
          />
        );
      })}
      
      {/* Grid coordinates overlay */}
      <div className="absolute top-4 left-4 text-sm text-muted-foreground bg-background/90 backdrop-blur-sm px-4 py-2.5 rounded-lg shadow-lg border border-border/50 min-w-fit whitespace-nowrap">
        <div className="font-semibold text-foreground mb-1">{floorPlan.width}m × {floorPlan.height}m</div>
        {targetPoint && (
          <div className="text-xs leading-relaxed">Target: {targetPoint.x.toFixed(1)}m, {targetPoint.y.toFixed(1)}m</div>
        )}
        {selectedFixtures.length > 0 && (
          <div className="text-xs text-primary leading-relaxed mt-0.5">
            Selected: {selectedFixtures.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};
