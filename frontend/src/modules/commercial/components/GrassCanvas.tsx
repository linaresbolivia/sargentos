import React, { useEffect, useRef } from 'react';

interface GrassCanvasProps {
  className?: string;
}

export const GrassCanvas: React.FC<GrassCanvasProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 1200);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 800);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
      drawLightweightLawn(ctx, width, height);
    };

    drawLightweightLawn(ctx, width, height);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
};

// Ultra-fast GPU-friendly lawn renderer (under 1ms execution on mobile/tablet)
function drawLightweightLawn(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Rich natural turf gradient
  const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
  baseGrad.addColorStop(0, '#388e13');
  baseGrad.addColorStop(0.5, '#2d770c');
  baseGrad.addColorStop(1, '#1a4e06');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft ambient vignette for executive depth
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.25,
    width / 2,
    height / 2,
    width * 0.8
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.7, 'rgba(0, 15, 5, 0.25)');
  vignette.addColorStop(1, 'rgba(0, 10, 3, 0.65)');

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

export default GrassCanvas;
