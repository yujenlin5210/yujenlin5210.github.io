import React, { useRef, useEffect } from 'react';

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

export default function Step1Canvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawPlayer(ctx, { x: canvas.width / 2, y: canvas.height / 2, angle: -Math.PI / 2 });
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={800} 
      className="w-full h-full object-cover"
    />
  );
}
