import React, { useRef, useEffect } from 'react';

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

  if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1) p.angle = Math.atan2(p.vy, p.vx);
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

const updateAndDrawDots = (ctx, dots, canvasWidth, canvasHeight) => {
  dots.forEach(dot => {
    dot.x += dot.vx;
    dot.y += dot.vy;
    
    if (dot.x < 0) dot.x = canvasWidth;
    if (dot.x > canvasWidth) dot.x = 0;
    if (dot.y < 0) dot.y = canvasHeight;
    if (dot.y > canvasHeight) dot.y = 0;

    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
    ctx.fillStyle = dot.color;
    ctx.fill();
  });
};

export default function Step3Canvas() {
  const canvasRef = useRef(null);
  const pRef = useRef({ x: 400, y: 400, vx: 0, vy: 0, angle: -Math.PI / 2 });
  const dotsRef = useRef([]);
  const keysRef = useRef({});
  const requestRef = useRef();

  useEffect(() => {
    const down = (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      keysRef.current[e.code] = true;
    };
    const up = (e) => keysRef.current[e.code] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Initialize some dots
    for (let i = 0; i < 20; i++) {
      dotsRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: 3,
        color: '#ffffff'
      });
    }

    const loop = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      updatePlayer(pRef.current, keysRef.current, canvas.width, canvas.height);
      updateAndDrawDots(ctx, dotsRef.current, canvas.width, canvas.height);
      drawPlayer(ctx, pRef.current);

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full cursor-crosshair">
      <div className="absolute top-4 left-4 text-white/50 text-sm font-mono z-10 pointer-events-none">
        WASD to move
      </div>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={800} 
        tabIndex={0}
        className="w-full h-full object-cover focus:outline-none"
      />
    </div>
  );
}
