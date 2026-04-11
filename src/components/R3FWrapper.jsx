import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';

export default function R3FWrapper({ 
  children, 
  height = "500px", 
  cameraPosition = [0, 0, 5],
  fov = 50,
  preset = "city",
  orbitControls = true 
}) {
  return (
    <div className="r3f-wrapper my-8 w-full rounded-xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 relative group" style={{ height }}>
      <Canvas camera={{ position: cameraPosition, fov }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
        <Environment preset={preset} />
        {children}
        {orbitControls && <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />}
      </Canvas>
      <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
        Web 3D Interactive
      </div>
    </div>
  );
}
