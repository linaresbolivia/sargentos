import React, { useEffect, useRef } from 'react';

interface Firefly {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  alphaSpeed: number;
  vx: number;
  vy: number;
  angle: number;
  angularSpeed: number;
  color: string;
}

interface FirefliesCanvasProps {
  count?: number;
  className?: string;
}

export const FirefliesCanvas: React.FC<FirefliesCanvasProps> = ({
  count = 20,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const firefliesRef = useRef<Firefly[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    const vibrantGoldColors = [
      'rgba(255, 215, 0,',   // Radiant Pure Gold
      'rgba(245, 158, 11,',  // Luminous Amber Gold
      'rgba(254, 240, 138,', // Warm Sunlight Yellow
      'rgba(212, 175, 55,',  // CHLS Classic Gold
    ];

    // Helper to pick a random point strictly on the outer lawn perimeter (outside the book)
    const getRandomOuterPoint = () => {
      const marginX = width * 0.14; // Book occupies middle ~72% width
      const marginY = height * 0.12; // Book occupies middle ~76% height

      const side = Math.floor(Math.random() * 4); // 0: Left, 1: Right, 2: Top, 3: Bottom
      if (side === 0) {
        return { x: Math.random() * marginX, y: Math.random() * height };
      } else if (side === 1) {
        return { x: width - Math.random() * marginX, y: Math.random() * height };
      } else if (side === 2) {
        return { x: Math.random() * width, y: Math.random() * marginY };
      } else {
        return { x: Math.random() * width, y: height - Math.random() * marginY };
      }
    };

    // Initialize fireflies strictly on the outer lawn area
    firefliesRef.current = Array.from({ length: count }, () => {
      const pos = getRandomOuterPoint();
      const baseAlpha = 0.4 + Math.random() * 0.45;
      return {
        x: pos.x,
        y: pos.y,
        size: 2.2 + Math.random() * 2.2,
        baseAlpha,
        alpha: baseAlpha,
        alphaSpeed: (0.008 + Math.random() * 0.012) * (Math.random() > 0.5 ? 1 : -1),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() - 0.5) * 0.025,
        color: vibrantGoldColors[Math.floor(Math.random() * vibrantGoldColors.length)],
      };
    });

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const fireflies = firefliesRef.current;

      // Book Exclusion Zone (Fireflies CANNOT enter here)
      const bookLeft = width * 0.12;
      const bookRight = width * 0.88;
      const bookTop = height * 0.10;
      const bookBottom = height * 0.90;

      for (let i = 0; i < fireflies.length; i++) {
        const f = fireflies[i];

        // Smooth sinusoidal floating motion
        f.angle += f.angularSpeed;
        f.x += f.vx + Math.sin(f.angle) * 0.4;
        f.y += f.vy + Math.cos(f.angle) * 0.4;

        // Strict Book Exclusion Check: Bounce/Repel fireflies away from the book
        if (f.x > bookLeft && f.x < bookRight && f.y > bookTop && f.y < bookBottom) {
          // Calculate distance to all 4 edges of the book
          const dLeft = Math.abs(f.x - bookLeft);
          const dRight = Math.abs(f.x - bookRight);
          const dTop = Math.abs(f.y - bookTop);
          const dBottom = Math.abs(f.y - bookBottom);

          const minDist = Math.min(dLeft, dRight, dTop, dBottom);

          if (minDist === dLeft) {
            f.x = bookLeft - 4;
            f.vx = -Math.abs(f.vx);
          } else if (minDist === dRight) {
            f.x = bookRight + 4;
            f.vx = Math.abs(f.vx);
          } else if (minDist === dTop) {
            f.y = bookTop - 4;
            f.vy = -Math.abs(f.vy);
          } else {
            f.y = bookBottom + 4;
            f.vy = Math.abs(f.vy);
          }
        }

        // Wrap around outer canvas boundaries
        if (f.x < -20) f.x = width + 20;
        if (f.x > width + 20) f.x = -20;
        if (f.y < -20) f.y = height + 20;
        if (f.y > height + 20) f.y = -20;

        // Pulsing glow
        f.alpha += f.alphaSpeed;
        if (f.alpha > 0.92 || f.alpha < 0.25) {
          f.alphaSpeed = -f.alphaSpeed;
        }

        // Outer glow
        const glowRadius = f.size * 4;
        const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowRadius);
        gradient.addColorStop(0, `${f.color} ${Math.min(0.9, f.alpha)})`);
        gradient.addColorStop(0.4, `${f.color} ${f.alpha * 0.45})`);
        gradient.addColorStop(1, `${f.color} 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(f.x, f.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Bright central core
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, f.alpha + 0.2)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

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
