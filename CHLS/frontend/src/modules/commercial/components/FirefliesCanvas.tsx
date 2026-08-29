import React, { useEffect, useRef } from 'react';

interface Firefly {
  x: number;
  y: number;
  size: number;
  alpha: number;
  alphaSpeed: number;
  vx: number;
  vy: number;
  angle: number;
  angularSpeed: number;
}

interface FirefliesCanvasProps {
  count?: number;
  className?: string;
}

export const FirefliesCanvas: React.FC<FirefliesCanvasProps> = ({
  count = 4, // Exactamente 3 a 4 luciérnagas
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const firefliesRef = useRef<Firefly[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Initial 4 luminous gold fireflies around the lawn perimeter
    firefliesRef.current = Array.from({ length: Math.min(4, Math.max(3, count)) }, (_, i) => {
      // Position each firefly around the 4 corners/sides
      const marginX = width * 0.18;
      const marginY = height * 0.18;
      let posX = Math.random() * width;
      let posY = Math.random() * height;

      if (i === 0) { posX = Math.random() * marginX; posY = Math.random() * height; } // Left
      else if (i === 1) { posX = width - Math.random() * marginX; posY = Math.random() * height; } // Right
      else if (i === 2) { posX = Math.random() * width; posY = Math.random() * marginY; } // Top
      else { posX = Math.random() * width; posY = height - Math.random() * marginY; } // Bottom

      return {
        x: posX,
        y: posY,
        size: 3.5 + Math.random() * 1.5,
        alpha: 0.6 + Math.random() * 0.4,
        alphaSpeed: (0.012 + Math.random() * 0.015) * (Math.random() > 0.5 ? 1 : -1),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() - 0.5) * 0.03,
      };
    });

    // Fluid Animation Loop with Radiant Golden Glow
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const fireflies = firefliesRef.current;

      for (let i = 0; i < fireflies.length; i++) {
        const f = fireflies[i];

        // Smooth sinusoidal floating path
        f.angle += f.angularSpeed;
        f.x += f.vx + Math.sin(f.angle) * 0.4;
        f.y += f.vy + Math.cos(f.angle) * 0.4;

        // Wrap around boundaries smoothly
        if (f.x < -30) f.x = width + 30;
        if (f.x > width + 30) f.x = -30;
        if (f.y < -30) f.y = height + 30;
        if (f.y > height + 30) f.y = -30;

        // Pulsing glow alpha
        f.alpha += f.alphaSpeed;
        if (f.alpha > 0.95 || f.alpha < 0.35) {
          f.alphaSpeed = -f.alphaSpeed;
        }

        const currentAlpha = Math.min(1, Math.max(0.2, f.alpha));

        // 1. Resplandor / Aura Luminosa Dorada Amplia (Radius 24px)
        const glowRadius = f.size * 6.5;
        const radial = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowRadius);
        radial.addColorStop(0, `rgba(255, 220, 100, ${currentAlpha})`);
        radial.addColorStop(0.25, `rgba(245, 180, 20, ${currentAlpha * 0.7})`);
        radial.addColorStop(0.6, `rgba(212, 175, 55, ${currentAlpha * 0.3})`);
        radial.addColorStop(1, 'rgba(212, 175, 55, 0)');

        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(f.x, f.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Núcleo Brillante Blanco-Dorado Intenso
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, currentAlpha + 0.3)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-10 ${className}`}
    />
  );
};

export default FirefliesCanvas;
