import React, { useState, useEffect, useRef } from 'react';

const DodgeGame = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('START'); // 'START', 'PLAYING', 'GAMEOVER'
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState([]);
  const [dimensions, setDimensions] = useState({ w: 1200, h: 750 });
  const [isTouch, setIsTouch] = useState(false);
  const requestRef = useRef();
  const isMounted = useRef(true);
  const touchPos = useRef(null);
  
  // Game constants
  const PLAYER_SIZE = 12;
  const GRAVITY_STRENGTH = 0.045;
  const GRAVITY_RADIUS = 180;
  const INITIAL_DOTS = 40;
  const MAX_DOTS = 150;
  const PLAYER_SPEED = 0.22;
  const PLAYER_FRICTION = 0.95;

  // Refs for game state (to avoid re-renders and closure issues)
  const gameRef = useRef({
    player: { x: 600, y: 375, vx: 0, vy: 0, angle: -Math.PI / 2 },
    dots: [],
    keys: {},
    startTime: 0,
    frameCount: 0,
    status: 'START'
  });

  useEffect(() => {
    isMounted.current = true;

    const updateLayout = () => {
      const mobile = window.innerWidth < 768;
      setIsTouch(window.matchMedia('(pointer: coarse)').matches);
      if (mobile) {
        setDimensions({ w: 800, h: 1000 });
      } else {
        setDimensions({ w: 1200, h: 750 });
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);

    const savedScores = localStorage.getItem('dodge_highscores');
    if (savedScores) {
      try {
        setHighScores(JSON.parse(savedScores));
      } catch (e) {
        console.error("Failed to parse high scores", e);
      }
    }

    const handleKeyDown = (e) => {
      // Prevent scrolling for game-related keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      // If any movement key is pressed, clear the pointer target
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        touchPos.current = null;
      }

      gameRef.current.keys[e.code] = true;
      if (e.code === 'Space') {
        if (gameRef.current.status === 'START' || gameRef.current.status === 'GAMEOVER') {
          startGame();
        }
      }
    };
    
    const handleKeyUp = (e) => {
      gameRef.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: false });
    
    drawInitial();

    return () => {
      isMounted.current = false;
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const drawInitial = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, dimensions.w, dimensions.h);
    ctx.save();
    ctx.translate(dimensions.w / 2, dimensions.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(PLAYER_SIZE, 0);
    ctx.lineTo(-PLAYER_SIZE / 2, PLAYER_SIZE / 1.5);
    ctx.lineTo(-PLAYER_SIZE / 2, -PLAYER_SIZE / 1.5);
    ctx.closePath();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  const createDot = (w = dimensions.w, h = dimensions.h) => {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    const buffer = 50;
    
    if (side === 0) { // Top
      x = Math.random() * w;
      y = -buffer;
    } else if (side === 1) { // Right
      x = w + buffer;
      y = Math.random() * h;
    } else if (side === 2) { // Bottom
      x = Math.random() * w;
      y = h + buffer;
    } else { // Left
      x = -buffer;
      y = Math.random() * h;
    }

    const speed = Math.random() * 1.0 + 0.4;
    const fastDot = Math.random() > 0.94;
    const targetX = w / 2 + (Math.random() - 0.5) * (w * 0.4);
    const targetY = h / 2 + (Math.random() - 0.5) * (h * 0.4);
    const angle = Math.atan2(targetY - y, targetX - x);

    return {
      x, y,
      vx: Math.cos(angle) * (fastDot ? speed * 2.2 : speed),
      vy: Math.sin(angle) * (fastDot ? speed * 2.2 : speed),
      radius: fastDot ? 4.8 : 2.4,
      color: fastDot ? '#ff4d4d' : '#ffffff'
    };
  };

  const startGame = () => {
    gameRef.current.player = { 
      x: dimensions.w / 2, 
      y: dimensions.h / 2, 
      vx: 0, 
      vy: 0, 
      angle: -Math.PI / 2 
    };
    gameRef.current.dots = Array.from({ length: INITIAL_DOTS }, () => createDot());
    gameRef.current.startTime = Date.now();
    gameRef.current.frameCount = 0;
    gameRef.current.status = 'PLAYING';
    
    setGameState('PLAYING');
    setScore(0);
    
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const gameOver = () => {
    gameRef.current.status = 'GAMEOVER';
    if (isMounted.current) setGameState('GAMEOVER');
    const finalScore = Math.floor((Date.now() - gameRef.current.startTime) / 100) / 10;
    if (isMounted.current) setScore(finalScore);
    setHighScores(prev => {
      const newScores = [...prev, finalScore].sort((a, b) => b - a).slice(0, 5);
      localStorage.setItem('dodge_highscores', JSON.stringify(newScores));
      return newScores;
    });
    touchPos.current = null;
  };

  const handlePointerMove = (e) => {
    if (gameRef.current.status !== 'PLAYING') return;
    
    // Only track if mouse is pressed, or if it's a touch event
    const isMouse = e.pointerType === 'mouse';
    if (isMouse && e.buttons === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * dimensions.w;
    const y = ((e.clientY - rect.top) / rect.height) * dimensions.h;
    touchPos.current = { x, y };
  };

  const handlePointerDown = (e) => {
    if (gameRef.current.status === 'START' || gameRef.current.status === 'GAMEOVER') {
      startGame();
    }
    handlePointerMove(e);
  };

  const handlePointerUp = () => {
    touchPos.current = null;
  };

  const gameLoop = () => {
    if (!isMounted.current || gameRef.current.status !== 'PLAYING') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { player, dots, keys } = gameRef.current;

    // 1. Update Player
    if (touchPos.current) {
      const dx = touchPos.current.x - player.x;
      const dy = touchPos.current.y - player.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 5) {
        player.vx += Math.cos(angle) * PLAYER_SPEED * 1.5;
        player.vy += Math.sin(angle) * PLAYER_SPEED * 1.5;
      }
    } else {
      if (keys['ArrowUp'] || keys['KeyW']) player.vy -= PLAYER_SPEED;
      if (keys['ArrowDown'] || keys['KeyS']) player.vy += PLAYER_SPEED;
      if (keys['ArrowLeft'] || keys['KeyA']) player.vx -= PLAYER_SPEED;
      if (keys['ArrowRight'] || keys['KeyD']) player.vx += PLAYER_SPEED;
    }

    player.vx *= PLAYER_FRICTION;
    player.vy *= PLAYER_FRICTION;
    player.x += player.vx;
    player.y += player.vy;

    // Boundary check for player (Clamping)
    if (player.x < PLAYER_SIZE) {
      player.x = PLAYER_SIZE;
      player.vx = 0;
    }
    if (player.x > dimensions.w - PLAYER_SIZE) {
      player.x = dimensions.w - PLAYER_SIZE;
      player.vx = 0;
    }
    if (player.y < PLAYER_SIZE) {
      player.y = PLAYER_SIZE;
      player.vy = 0;
    }
    if (player.y > dimensions.h - PLAYER_SIZE) {
      player.y = dimensions.h - PLAYER_SIZE;
      player.vy = 0;
    }

    if (Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1) {
      player.angle = Math.atan2(player.vy, player.vx);
    }

    // 2. Update Dots
    for (let i = dots.length - 1; i >= 0; i--) {
      const dot = dots[i];
      const dx = player.x - dot.x;
      const dy = player.y - dot.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist < GRAVITY_RADIUS) {
        const force = (GRAVITY_RADIUS - dist) / GRAVITY_RADIUS * GRAVITY_STRENGTH;
        dot.vx += dx * force / dist;
        dot.vy += dy * force / dist;
      }

      dot.x += dot.vx;
      dot.y += dot.vy;

      if (dist < (PLAYER_SIZE * 0.7) + dot.radius) {
        gameOver();
        return;
      }

      const buffer = 150;
      if (dot.x < -buffer || dot.x > dimensions.w + buffer || dot.y < -buffer || dot.y > dimensions.h + buffer) {
        dots[i] = createDot();
      }
    }

    if (gameRef.current.frameCount % 180 === 0 && dots.length < MAX_DOTS) {
      dots.push(createDot());
    }

    // 3. Render
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, dimensions.w, dimensions.h);

    dots.forEach(dot => {
      const dx = player.x - dot.x;
      const dy = player.y - dot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < GRAVITY_RADIUS) {
        const ratio = (GRAVITY_RADIUS - dist) / GRAVITY_RADIUS;
        const opacity = ratio * 0.6;
        
        // Tesla coil arc effect: brighter, slightly thicker, and colored
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(dot.x, dot.y);
        
        // Inner bright core
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(224, 231, 255, ${opacity})`;
        ctx.stroke();
        
        // Outer glow
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = `rgba(99, 102, 241, ${opacity * 0.4})`;
        ctx.stroke();
      }
    });

    dots.forEach(dot => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
      ctx.fillStyle = dot.color;
      ctx.fill();
    });

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.beginPath();
    ctx.moveTo(PLAYER_SIZE, 0);
    ctx.lineTo(-PLAYER_SIZE / 2, PLAYER_SIZE / 1.5);
    ctx.lineTo(-PLAYER_SIZE / 2, -PLAYER_SIZE / 1.5);
    ctx.closePath();
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    gameRef.current.frameCount++;
    if (gameRef.current.frameCount % 10 === 0 && isMounted.current) {
      setScore(Math.floor((Date.now() - gameRef.current.startTime) / 100) / 10);
    }
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // Visibility Management
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && gameRef.current.status === 'PLAYING') {
        gameOver();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="not-prose relative w-full aspect-[4/5] md:aspect-[16/10] bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 font-sans mb-12 select-none touch-none">
      <canvas 
        ref={canvasRef} 
        width={dimensions.w} 
        height={dimensions.h} 
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full h-full cursor-crosshair block touch-none"
      />
      
      {/* HUD */}
      <div className="absolute top-6 left-8 md:top-10 md:left-12 pointer-events-none">
        <div className="text-white font-mono text-2xl md:text-3xl font-black tracking-widest drop-shadow-lg opacity-60">
          {score.toFixed(1)}s
        </div>
      </div>

      {gameState === 'START' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-all z-20">
          <div className="bg-slate-800/90 p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-white/10 shadow-2xl flex flex-col items-center max-w-[90%] md:max-w-md mx-4 text-center">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tighter italic">DODGE</h2>
            <div className="w-12 md:w-16 h-1 bg-indigo-500 mb-6 md:mb-8"></div>
            <p className="text-slate-300 text-sm md:text-lg mb-8 md:mb-10 font-light leading-relaxed">
              {isTouch ? (
                <>Touch and drag to move your ship.<br/>Nearby dots will be attracted to you.</>
              ) : (
                <>Use <span className="text-indigo-400 font-mono font-bold">WASD</span> or <span className="text-indigo-400 font-mono font-bold">ARROWS</span> to move.<br/>Your ship attracts nearby dots.</>
              )}
            </p>
            <button 
              onClick={startGame}
              className="group relative px-8 py-4 md:px-12 md:py-5 bg-indigo-600 hover:bg-indigo-500 text-white text-lg md:text-xl font-bold rounded-full transition-all shadow-xl shadow-indigo-500/25 active:scale-95"
            >
              {isTouch ? 'START GAME' : 'START [SPACE]'}
              <div className="absolute -inset-1 bg-indigo-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
            </button>
          </div>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/40 backdrop-blur-md transition-all z-20">
          <div className="bg-slate-900/95 p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-red-500/30 shadow-2xl flex flex-col items-center w-[90%] md:min-w-[380px] md:max-w-md mx-4">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tighter italic">CRASHED</h2>
            <div className="text-2xl md:text-3xl text-red-400 font-bold mb-8 md:mb-10">
              TIME: {score.toFixed(1)}s
            </div>
            
            {highScores.length > 0 && (
              <div className="mb-8 md:mb-10 w-full bg-black/40 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 border border-white/5">
                <h3 className="text-[10px] md:text-xs font-mono font-bold text-slate-500 uppercase tracking-[0.3em] mb-4 md:mb-6 text-center">Top Survivals</h3>
                <div className="space-y-2 md:space-y-3">
                  {highScores.map((hs, i) => (
                    <div key={i} className="flex justify-between text-white font-mono text-sm md:text-lg">
                      <span className="text-slate-600">{i + 1}.</span>
                      <span className={i === 0 ? "text-yellow-400 font-bold" : "text-slate-300"}>{hs.toFixed(1)}s</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={startGame}
              className="w-full py-4 md:py-5 bg-white text-slate-900 text-lg md:text-xl font-black rounded-full transition-all hover:scale-[1.02] active:scale-95 shadow-xl"
            >
              {isTouch ? 'RETRY' : 'RETRY [SPACE]'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DodgeGame;
