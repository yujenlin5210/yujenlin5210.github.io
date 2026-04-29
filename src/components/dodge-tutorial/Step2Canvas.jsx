import { useRef, useEffect } from 'react';

const updatePlayer = (p, k, canvasWidth, canvasHeight) => {
  if (k['ArrowUp'] || k['KeyW']) p.vy -= 0.3;
  if (k['ArrowDown'] || k['KeyS']) p.vy += 0.3;
  if (k['ArrowLeft'] || k['KeyA']) p.vx -= 0.3;
  if (k['ArrowRight'] || k['KeyD']) p.vx += 0.3;

  p.vx *= 0.95;
  p.vy *= 0.95;
  p.x += p.vx;
  p.y += p.vy;

  if (p.x < 0) p.x = canvasWidth;
  if (p.x > canvasWidth) p.x = 0;
  if (p.y < 0) p.y = canvasHeight;
  if (p.y > canvasHeight) p.y = 0;

  if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1) {
    p.angle = Math.atan2(p.vy, p.vx);
  }
};

const drawPlayer = (ctx, p) => {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-10, 10);
  ctx.lineTo(-10, -10);
  ctx.closePath();
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
};

export default function Step2Canvas() {
  const canvasRef = useRef(null);
  const playerRef = useRef({ x: 400, y: 400, vx: 0, vy: 0, angle: -Math.PI / 2 });
  const keysRef = useRef({});
  const requestRef = useRef();

  useEffect(() => {
    const handleKeyDown = (e) => { 
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      keysRef.current[e.code] = true; 
    };
    const handleKeyUp = (e) => { keysRef.current[e.code] = false; };
    const clearKeys = () => {
      keysRef.current = {};
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const gameLoop = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      updatePlayer(playerRef.current, keysRef.current, canvas.width, canvas.height);
      drawPlayer(ctx, playerRef.current);

      requestRef.current = requestAnimationFrame(gameLoop);
    };

    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full cursor-crosshair">
      <div className="absolute top-4 left-4 text-white/50 text-sm font-mono z-10 pointer-events-none">
        Click to focus, then WASD to move
      </div>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={800} 
        tabIndex={0}
        className="w-full h-full object-cover focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      />
    </div>
  );
}
