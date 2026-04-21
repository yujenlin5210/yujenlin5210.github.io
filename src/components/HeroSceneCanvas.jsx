import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function Scene() {
  const meshRef = useRef(null);
  const { viewport } = useThree();

  useFrame((state) => {
    if (!meshRef.current) {
      return;
    }

    const targetX = (state.pointer.x * viewport.width) / 2;
    const targetY = (state.pointer.y * viewport.height) / 2;

    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -targetY * 0.1, 0.05);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetX * 0.1, 0.05);
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1.5}>
      <mesh ref={meshRef} position={[0, 0, -5]}>
        <torusKnotGeometry args={[3, 0.8, 96, 24]} />
        <MeshDistortMaterial
          color="#6366f1"
          envMapIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          metalness={0.5}
          roughness={0.2}
          distort={0.4}
          speed={2}
          dithering
        />
      </mesh>
    </Float>
  );
}

export default function HeroSceneCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 50 }} dpr={[1, 1.5]} gl={{ dithering: true }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#4338ca" />
      <Environment preset="city" />
      <Scene />
    </Canvas>
  );
}
