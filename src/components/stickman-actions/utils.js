// Common utilities for stickman animations

export const getRubberHosePath = (sX, sY, tX, tY, armLen, bendOffset = 8) => {
  const dx = tX - sX;
  const dy = tY - sY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  // Keep elbows pointing DOWN (higher Y)
  const bendBase = Math.sqrt(Math.max(0, (armLen * armLen) - (dist * dist))) / 1.5;
  const bend = bendBase + bendOffset;
  
  const midX = (sX + tX) / 2;
  const midY = (sY + tY) / 2;
  return `M ${sX},${sY} Q ${midX},${midY + bend} ${tX},${tY}`;
};

export const STANDING_LEGS = {
  back: "M 25,75 L 25,100",
  front: "M 35,75 L 35,100"
};

export const WALKING_LEGS = {
  back: ["M 25,75 Q 15,85 10,100", "M 25,75 Q 25,85 25,100", "M 25,75 Q 35,85 40,100", "M 25,75 Q 25,85 25,100", "M 25,75 Q 15,85 10,100"],
  front: ["M 35,75 Q 45,85 50,100", "M 35,75 Q 35,85 35,100", "M 35,75 Q 25,85 20,100", "M 35,75 Q 35,85 35,100", "M 35,75 Q 45,85 50,100"]
};

export const WALKING_ARMS = {
  back: ["M 25,45 Q 30,60 35,75", "M 25,45 Q 25,60 25,75", "M 25,45 Q 10,60 5,75", "M 25,45 Q 25,60 25,75", "M 25,45 Q 30,60 35,75"],
  front: ["M 35,45 Q 30,60 25,75", "M 35,45 Q 35,60 35,75", "M 35,45 Q 50,60 55,75", "M 35,45 Q 35,60 35,75", "M 35,45 Q 30,60 25,75"]
};
