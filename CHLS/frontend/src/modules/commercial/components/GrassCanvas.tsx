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
      drawProceduralGrass(ctx, width, height);
    };

    drawProceduralGrass(ctx, width, height);
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

// 100% Procedural High-Density Lawn Turf Renderer (0 KB Image File Weight)
function drawProceduralGrass(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Base rich green turf gradient
  const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
  baseGrad.addColorStop(0, '#48aa1c');
  baseGrad.addColorStop(0.4, '#388e13');
  baseGrad.addColorStop(1, '#1e5a07');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Layer 1: High-density grass blade strokes
  const greenPalette = [
    '#5ac422',
    '#48ad17',
    '#398f10',
    '#2d770c',
    '#68d428',
    '#32830e',
    '#246308',
  ];

  const bladeCount = Math.floor((width * height) / 12); // High density

  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';

  for (let i = 0; i < bladeCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const len = 4 + Math.random() * 9;
    const angle = (Math.random() - 0.5) * 0.8;

    ctx.strokeStyle = greenPalette[Math.floor(Math.random() * greenPalette.length)];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(angle) * len, y - Math.cos(angle) * len);
    ctx.stroke();
  }

  // Layer 2: Soft vignette and ambient depth lighting
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.2,
    width / 2,
    height / 2,
    width * 0.75
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.7, 'rgba(0, 15, 5, 0.35)');
  vignette.addColorStop(1, 'rgba(0, 10, 3, 0.75)');

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

export default GrassCanvas;
