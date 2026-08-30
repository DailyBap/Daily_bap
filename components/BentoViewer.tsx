"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  MeshDistortMaterial,
  Float,
  useGLTF,
  Center,
  Environment,
  ContactShadows,
  BakeShadows,
} from "@react-three/drei";
import { useRef, Suspense, useMemo } from "react";
import type { Group, Mesh } from "three";

// ----------------------------------------------------------
// 3D GLTF Model loader for bibimbap.glb
// ----------------------------------------------------------
function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const modelGroupRef = useRef<Group>(null);

  // Ensure shadows and materials are properly applied across all child meshes
  useMemo(() => {
    scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  useFrame((_, delta) => {
    if (modelGroupRef.current) {
      modelGroupRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group ref={modelGroupRef}>
      <Center position={[0, 0, 0]}>
        <primitive object={scene} scale={1.8} />
      </Center>
    </group>
  );
}

// Preload the added model
useGLTF.preload("/bibimbap.glb");

// ----------------------------------------------------------
// Procedural fallback bowl mesh (used during loading)
// ----------------------------------------------------------
function BowlMesh() {
  const bowlRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (bowlRef.current) {
      bowlRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={bowlRef}>
      {/* Bowl base */}
      <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 0.85, 0.6, 48, 1, true]} />
        <meshStandardMaterial
          color="#9da613"
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Bowl bottom plate */}
      <mesh position={[0, -0.6, 0]} castShadow>
        <cylinderGeometry args={[0.85, 0.85, 0.04, 48]} />
        <meshStandardMaterial color="#445916" roughness={0.6} />
      </mesh>

      {/* Bowl rim */}
      <mesh position={[0, 0.0, 0]} castShadow>
        <torusGeometry args={[1.3, 0.07, 16, 48]} />
        <meshStandardMaterial
          color="#445916"
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Rice layer */}
      <mesh position={[0, -0.1, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.0, 0.25, 48]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.9} />
      </mesh>

      {/* Protein (chicken) — center top */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.4, 24, 24]} />
        <MeshDistortMaterial
          color="#c8793a"
          distort={0.2}
          speed={2}
          roughness={0.6}
        />
      </mesh>

      {/* Veggie blobs */}
      {[
        { pos: [-0.65, 0.1, 0.2] as [number, number, number], color: "#2d6a1e", scale: 0.22 },
        { pos: [0.65, 0.1, -0.2] as [number, number, number], color: "#e85d4a", scale: 0.18 },
        { pos: [0.2, 0.1, -0.7] as [number, number, number], color: "#f4b942", scale: 0.20 },
        { pos: [-0.3, 0.1, 0.72] as [number, number, number], color: "#6bbd4e", scale: 0.16 },
      ].map((item, i) => (
        <mesh key={i} position={item.pos} castShadow>
          <sphereGeometry args={[item.scale, 16, 16]} />
          <meshStandardMaterial color={item.color} roughness={0.8} />
        </mesh>
      ))}

      {/* Egg yolk */}
      <mesh position={[0.55, 0.22, 0.4]} castShadow>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#f5cc42" roughness={0.5} />
      </mesh>

      {/* Sesame dots */}
      {[
        [-0.1, 0.35, 0.1] as [number, number, number],
        [0.15, 0.37, -0.05] as [number, number, number],
        [-0.15, 0.36, -0.15] as [number, number, number],
      ].map((pos, i) => (
        <mesh key={`sesame-${i}`} position={pos}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#d4a857" />
        </mesh>
      ))}
    </group>
  );
}

// ----------------------------------------------------------
// Floating particles (ingredient dots in the air)
// ----------------------------------------------------------
function FloatingIngredients() {
  const colors = ["#9da613", "#445916", "#c8793a", "#f5cc42", "#e85d4a"];
  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const r = 2.4 + Math.random() * 0.6;
        return (
          <Float
            key={i}
            speed={1.5 + Math.random()}
            rotationIntensity={0.5}
            floatIntensity={0.5}
          >
            <mesh
              position={[
                Math.cos(angle) * r,
                (Math.random() - 0.2) * 1.5,
                Math.sin(angle) * r * 0.4,
              ]}
            >
              <sphereGeometry args={[0.045 + Math.random() * 0.04, 12, 12]} />
              <meshStandardMaterial
                color={colors[i % colors.length]}
                emissive={colors[i % colors.length]}
                emissiveIntensity={0.4}
              />
            </mesh>
          </Float>
        );
      })}
    </>
  );
}

// ----------------------------------------------------------
// Main exported BentoViewer component
// ----------------------------------------------------------
export default function BentoViewer({ modelRef }: { modelRef?: string }) {
  const modelUrl = modelRef || "/bibimbap.glb";

  return (
    <div className="w-full h-full min-h-[420px]">
      <Canvas
        camera={{ position: [0, 2.2, 4.2], fov: 38 }}
        shadows
        gl={{ antialias: true, toneMappingExposure: 1.15 }}
        dpr={[1, 2]}
      >
        {/* Environment HDRI Lighting for crisp PBR materials & reflections */}
        <Environment preset="city" environmentIntensity={0.8} />

        {/* Studio Direct Lighting */}
        <ambientLight intensity={0.6} color="#fff8f0" />
        <directionalLight
          position={[5, 9, 5]}
          intensity={1.5}
          color="#ffffff"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-4, 3, -3]} intensity={0.5} color="#9da613" />
        <pointLight position={[0, 4, 1]} intensity={0.8} color="#f5cc42" distance={10} />

        {/* Soft Floor Shadow */}
        <ContactShadows
          position={[0, -1.1, 0]}
          opacity={0.65}
          scale={8}
          blur={2.5}
          far={4}
          color="#223311"
        />

        <Suspense
          fallback={
            <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
              <BowlMesh />
            </Float>
          }
        >
          <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
            <GltfModel url={modelUrl} />
          </Float>
          <FloatingIngredients />
        </Suspense>

        {/* Orbit Controls */}
        <OrbitControls
          enablePan={false}
          minDistance={2.8}
          maxDistance={6.5}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate
          autoRotateSpeed={0.9}
        />
      </Canvas>
    </div>
  );
}
