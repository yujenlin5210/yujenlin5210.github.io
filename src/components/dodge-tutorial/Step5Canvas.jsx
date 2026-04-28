import React, { useRef, useEffect, useState } from 'react';

const GRAVITY_RADIUS = 180;
const GRAVITY_STRENGTH = 0.045;

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

const updateAndDrawDots = (ctx, dots, p, canvasWidth, canvasHeight) => {
  let collision = false;
  dots.forEach(dot => {
    const dx = p.x - dot.x;
    const dy = p.y - dot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < GRAVITY_RADIUS) {
      const force = ((GRAVITY_RADIUS - dist) / GRAVITY_RADIUS) * GRAVITY_STRENGTH;
      dot.vx += (dx / dist) * force;
      dot.vy += (dy / dist) * force;

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(dot.x, dot.y);
      ctx.strokeStyle = `rgba(99, 102, 241, ${0.6 * (GRAVITY_RADIUS - dist) / GRAVITY_RADIUS})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

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

    if (dist < 12 + dot.radius) {
      collision = true;
    }
  });
  return collision;
};

export default function Step5Canvas() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('PLAYING');
  const pRef = useRef({ x: 400, y: 400, vx: 0, vy: 0, angle: -Math.PI / 2 });
  const dotsRef = useRef([]);
  const keysRef = useRef({});
  const requestRef = useRef();
  const statusRef = useRef('PLAYING');

  useEffect(() => {
    const down = (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      keysRef.current[e.code] = true;
      if (e.code === 'Space' && statusRef.current === 'GAMEOVER') {
        startGame();
      }
    };
    const up = (e) => keysRef.current[e.code] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const startGame = () => {
      pRef.current = { x: canvas.width / 2, y: canvas.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2 };
      dotsRef.current = [];
      for (let i = 0; i < 30; i++) {
        dotsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2.5,
          vy: (Math.random() - 0.5) * 2.5,
          radius: 3.5,
          color: '#ffffff'
        });
      }
      statusRef.current = 'PLAYING';
      setGameState('PLAYING');
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(loop);
    };

    const loop = () => {
      if (statusRef.current !== 'PLAYING') return;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      updatePlayer(pRef.current, keysRef.current, canvas.width, canvas.height);
      const collision = updateAndDrawDots(ctx, dotsRef.current, pRef.current, canvas.width, canvas.height);
      drawPlayer(ctx, pRef.current);

      if (collision) {
        statusRef.current = 'GAMEOVER';
        setGameState('GAMEOVER');
      } else {
        requestRef.current = requestAnimationFrame(loop);
      }
    };

    startGame();

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full cursor-crosshair group">
      <canvas 
        ref={canvasRef} width={800} height={800} tabIndex={0}
        className="w-full h-full object-cover focus:outline-none focus:ring-2 focus:ring-red-500/50"
      />
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center">
          <h2 className="text-5xl font-black text-white tracking-tighter italic mb-4">CRASHED</h2>
          <p className="text-red-300 font-mono text-sm mb-6">Press SPACE to restart</p>
        </div>
      )}
    </div>
  );
}
