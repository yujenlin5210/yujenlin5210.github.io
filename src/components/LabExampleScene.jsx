import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, MeshDistortMaterial } from '@react-three/drei';

function Cube(props) {
  const meshRef = useRef();
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += delta * 0.5;
    meshRef.current.rotation.y += delta * 0.2;
    const targetScale = active ? 1.5 : 1;
    meshRef.current.scale.lerp({ x: targetScale, y: targetScale, z: targetScale }, 0.1);
  });

  return (
    <mesh
      {...props}
      ref={meshRef}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      onClick={() => setActive(!active)}
    >
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <MeshDistortMaterial
        color={hovered ? '#f43f5e' : '#6366f1'}
        envMapIntensity={1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        metalness={0.8}
        roughness={0.2}
        distort={active ? 0.6 : 0.2}
        speed={active ? 5 : 2}
      />
    </mesh>
  );
}

export default function LabExampleScene({ height = "400px" }) {
  return (
    <div className="r3f-wrapper my-8 w-full rounded-xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 relative group" style={{ height }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
        <Environment preset="city" />
        <Cube position={[0, 0, 0]} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
      <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
        Web 3D Interactive
      </div>
    </div>
  );
}
