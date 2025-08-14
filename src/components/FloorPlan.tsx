import React, { useRef, useEffect, useState } from 'react';
import { useLightingStore } from '../stores/lightingStore';
import { pixelToReal, realToPixel, calculateLightCone } from '../utils/geometry';

export const FloorPlan: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 600 });
  
  const {
    fixtures,
    floorPlan,
    selectedFixtures,
    targetPoint,
    selectFixture,
    aimFixtureAt,
    setTargetPoint
  } = useLightingStore();

  // Handle canvas click
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert pixel coordinates to real world coordinates
    const realCoords = pixelToReal(x, y, {
      width: floorPlan.width,
      height: floorPlan.height,
      pixelsPerMeter: canvasSize.width / floorPlan.width
    });

    setTargetPoint(realCoords.x, realCoords.y);

    // Aim selected fixtures at clicked point
    if (selectedFixtures.length > 0) {
      selectedFixtures.forEach(fixtureId => {
        aimFixtureAt(fixtureId, realCoords.x, realCoords.y);
      });
    }
  };

  // Handle fixture click
  const handleFixtureClick = (fixtureId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    selectFixture(fixtureId, event.shiftKey);
  };

  // Draw the floor plan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
      
      for (let i = 0; i <= floorPlan.width; i++) {
        const x = i * pixelsPerMeter;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasSize.height);
        ctx.stroke();
      }
      
      for (let i = 0; i <= floorPlan.height; i++) {
        const y = i * pixelsPerMeter;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasSize.width, y);
        ctx.stroke();
      }

      // Draw light cones for selected fixtures
      selectedFixtures.forEach(fixtureId => {
        const fixture = fixtures.find(f => f.id === fixtureId);
        if (!fixture || !targetPoint) return;

        const cone = calculateLightCone(fixture, targetPoint.x, targetPoint.y, fixture.zoom);
        const centerPixel = realToPixel(cone.centerX, cone.centerY, {
          width: floorPlan.width,
          height: floorPlan.height,
          pixelsPerMeter
        });

        // Draw cone
        ctx.fillStyle = 'hsl(45, 95%, 60%, 0.2)';
        ctx.strokeStyle = 'hsl(45, 95%, 60%)';
        ctx.lineWidth = 1;
        
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

        // Draw beam line from fixture to target
        const fixturePixel = realToPixel(fixture.x, fixture.y, {
          width: floorPlan.width,
          height: floorPlan.height,
          pixelsPerMeter
        });

        ctx.strokeStyle = 'hsl(45, 95%, 60%, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fixturePixel.x, fixturePixel.y);
        ctx.lineTo(centerPixel.x, centerPixel.y);
        ctx.stroke();
      });

      // Draw fixtures
      fixtures.forEach(fixture => {
        const pixel = realToPixel(fixture.x, fixture.y, {
          width: floorPlan.width,
          height: floorPlan.height,
          pixelsPerMeter
        });

        const isSelected = fixture.isSelected;
        const radius = 16;

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
        ctx.font = 'bold 12px sans-serif';
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
        ctx.arc(pixel.x, pixel.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Crosshair
        ctx.strokeStyle = 'hsl(45, 20%, 95%)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pixel.x - 12, pixel.y);
        ctx.lineTo(pixel.x + 12, pixel.y);
        ctx.moveTo(pixel.x, pixel.y - 12);
        ctx.lineTo(pixel.x, pixel.y + 12);
        ctx.stroke();
      }
    }
  }, [fixtures, floorPlan, selectedFixtures, targetPoint, canvasSize]);

  return (
    <div className="relative w-full h-full bg-card rounded-lg border border-border overflow-hidden">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
        style={{ imageRendering: 'crisp-edges' }}
      />
      
      {/* Fixture click handlers */}
      {fixtures.map(fixture => {
        const pixelsPerMeter = canvasSize.width / floorPlan.width;
        const pixel = realToPixel(fixture.x, fixture.y, {
          width: floorPlan.width,
          height: floorPlan.height,
          pixelsPerMeter
        });
        
        return (
          <div
            key={fixture.id}
            className="absolute cursor-pointer"
            style={{
              left: pixel.x - 16,
              top: pixel.y - 16,
              width: 32,
              height: 32,
            }}
            onClick={(e) => handleFixtureClick(fixture.id, e)}
          />
        );
      })}
      
      {/* Grid coordinates overlay */}
      <div className="absolute top-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
        {floorPlan.width}m × {floorPlan.height}m
        {targetPoint && (
          <div>Target: {targetPoint.x.toFixed(1)}m, {targetPoint.y.toFixed(1)}m</div>
        )}
      </div>
    </div>
  );
};