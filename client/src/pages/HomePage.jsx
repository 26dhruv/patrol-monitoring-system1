import { useState, useEffect, useRef, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, useTexture, Stars, Trail, PointMaterial } from '@react-three/drei';
import { useSpring, config } from '@react-spring/three';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';

const PatrolPoint = ({ position, name, active, onPointClick, index }) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();
  const pulseRef = useRef(0);
  const ringRef = useRef();

  // Get animated values but apply them directly to the mesh
  const springValues = useSpring({
    scale: hovered || active ? 1.6 : 1,
    color: hovered ? "#42a5f5" : active ? "#1e88e5" : "#64b5f6",
    emissive: hovered ? "#2196f3" : active ? "#1565c0" : "#bbdefb",
    emissiveIntensity: hovered ? 2.5 : active ? 2 : 0.8,
    config: config.wobbly
  });

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      
      // Update material properties from spring values
      if (meshRef.current.material) {
        meshRef.current.material.color.set(springValues.color.get());
        meshRef.current.material.emissive.set(springValues.emissive.get());
        meshRef.current.material.emissiveIntensity = springValues.emissiveIntensity.get();
      }
      
      // Pulse animation for active point
      if (active) {
        pulseRef.current = Math.sin(clock.getElapsedTime() * 3) * 0.2;
        meshRef.current.scale.set(
          1.4 + pulseRef.current,
          1.4 + pulseRef.current,
          1.4 + pulseRef.current
        );
        
        if (ringRef.current) {
          ringRef.current.scale.set(
            2 + Math.sin(clock.getElapsedTime() * 2) * 0.5,
            2 + Math.sin(clock.getElapsedTime() * 2) * 0.5,
            2 + Math.sin(clock.getElapsedTime() * 2) * 0.5
          );
          ringRef.current.rotation.x = clock.getElapsedTime() * 0.5;
          ringRef.current.rotation.z = clock.getElapsedTime() * 0.3;
        }
      } else {
        // Set scale based on spring value
        const scaleValue = springValues.scale.get();
        meshRef.current.scale.set(scaleValue, scaleValue, scaleValue);
      }
    }
  });

  return (
    <group position={position}>
      {/* Main patrol point */}
      <mesh
        ref={meshRef}
        onClick={() => onPointClick(index)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial 
          color={springValues.color.get()}
          emissive={springValues.emissive.get()}
          emissiveIntensity={springValues.emissiveIntensity.get()}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
      
      {/* Glow effect */}
      <mesh scale={[0.06, 0.06, 0.06]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial 
          color={active ? "#1e88e5" : hovered ? "#42a5f5" : "#90caf9"} 
          transparent 
          opacity={0.4} 
        />
      </mesh>
      
      {/* Interactive ring for active points */}
      {active && (
        <mesh ref={ringRef} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[0.08, 0.01, 16, 32]} />
          <meshBasicMaterial color="#1e88e5" transparent opacity={0.7} />
        </mesh>
      )}
      
      {/* Hover info */}
      {(hovered || active) && (
        <Html
          position={[0, 0.1, 0]}
          className="pointer-events-none"
          center
          distanceFactor={8}
        >
          <div className="bg-gray-900/80 backdrop-blur-md p-2 rounded-lg shadow-glow text-xs w-36 text-center transform -translate-y-full border border-blue-700/30">
            <p className="font-bold text-blue-400">{name}</p>
            <p className="text-xs text-blue-200/80 mt-1">
              {active ? "Active Patrol Zone" : "Patrol Checkpoint"}
            </p>
            {active && (
              <div className="mt-1 pt-1 border-t border-blue-700/30 text-2xs">
                <div className="flex justify-between text-blue-300/90">
                  <span>Security Level:</span>
                  <span className="font-mono">HIGH</span>
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
      
      {active && (
        <Trail 
          width={0.07} 
          length={5} 
          color={"#1e88e5"} 
          attenuation={(t) => t * t}
        >
          <PointMaterial size={0.6} vertexColors={true} transparent={true} opacity={0.7} />
        </Trail>
      )}
    </group>
  );
};

const Earth = ({ setActivePoint, activePoint }) => {
  const earthRef = useRef();
  const cloudsRef = useRef();
  const atmosphereRef = useRef();
  const glowRef = useRef();
  const { camera } = useThree();
  
  // Load textures
  const [colorMap, bumpMap, specularMap] = useTexture([
    '/assets/earth_texture.jpg',
    '/assets/earth_bump.jpg',
    '/assets/earth_specular.jpg'
  ]);

  // Patrol locations
  const patrolLocations = [
    { lat: 34.0522, lng: -118.2437, name: "Los Angeles" },
    { lat: 40.7128, lng: -74.0060, name: "New York" },
    { lat: 51.5074, lng: -0.1278, name: "London" },
    { lat: 35.6762, lng: 139.6503, name: "Tokyo" },
    { lat: -33.8688, lng: 151.2093, name: "Sydney" },
    { lat: 19.4326, lng: -99.1332, name: "Mexico City" },
    { lat: -22.9068, lng: -43.1729, name: "Rio de Janeiro" },
    { lat: 55.7558, lng: 37.6173, name: "Moscow" },
    { lat: 28.6139, lng: 77.2090, name: "Delhi" },
    { lat: 37.7749, lng: -122.4194, name: "San Francisco" },
  ];

  // Convert lat/lng to 3D coordinates
  const convertLatLngToVector3 = (lat, lng, radius = 2) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return new THREE.Vector3(x, y, z);
  };
  
  // Handle patrol point click
  const handlePointClick = (index) => {
    setActivePoint(index);
    
    // Focus camera on the point
    const position = convertLatLngToVector3(
      patrolLocations[index].lat,
      patrolLocations[index].lng,
      3.8
    );
    
    // Animate camera to new position
    const tween = {
      x: position.x,
      y: position.y,
      z: position.z,
      duration: 1.8,
      ease: 'power3.inOut',
      onUpdate: () => {
        camera.position.set(tween.x, tween.y, tween.z);
        camera.lookAt(0, 0, 0);
      }
    };
    
    gsap.to(tween, tween);
  };

  // Rotate earth and clouds
  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    
    if (earthRef.current) {
      earthRef.current.rotation.y = elapsedTime * 0.05;
    }
    
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = elapsedTime * 0.07;
    }
    
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y = elapsedTime * 0.03;
      atmosphereRef.current.material.opacity = 0.3 + Math.sin(elapsedTime * 0.2) * 0.1;
    }
    
    if (glowRef.current) {
      glowRef.current.scale.set(
        2.5 + Math.sin(elapsedTime * 0.3) * 0.05,
        2.5 + Math.sin(elapsedTime * 0.3) * 0.05,
        2.5 + Math.sin(elapsedTime * 0.3) * 0.05
      );
    }
  });

  // Create connecting lines between patrol points
  const generateConnectingLines = () => {
    const lines = [];
    
    for (let i = 0; i < patrolLocations.length; i++) {
      const start = convertLatLngToVector3(patrolLocations[i].lat, patrolLocations[i].lng);
      const randomConnections = 2 + Math.floor(Math.random() * 3); // 2-4 connections
      
      for (let j = 0; j < randomConnections; j++) {
        const targetIndex = (i + j + 1) % patrolLocations.length;
        const end = convertLatLngToVector3(patrolLocations[targetIndex].lat, patrolLocations[targetIndex].lng);
        
        // Create curved path between points
        const midPoint = new THREE.Vector3()
          .addVectors(start, end)
          .multiplyScalar(0.5)
          .normalize()
          .multiplyScalar(2.2); // Push out midpoint to create curve
        
        const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
        const points = curve.getPoints(20);
        
        lines.push(
          <line key={`line-${i}-${targetIndex}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
                count={points.length}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#1a6eff" transparent opacity={0.2} />
          </line>
        );
      }
    }
    
    return lines;
  };

  return (
    <group>
      {/* Earth */}
      <mesh ref={earthRef} castShadow receiveShadow>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial 
          map={colorMap}
          normalMap={bumpMap}
          normalScale={new THREE.Vector2(0.1, 0.1)}
          metalnessMap={specularMap}
          metalness={0.4}
          roughness={0.7}
          emissive="#081b2f"
          emissiveIntensity={0.2}
        />
        
        {/* Patrol points */}
        {patrolLocations.map((location, index) => (
          <PatrolPoint
            key={index}
            position={convertLatLngToVector3(location.lat, location.lng)}
            name={location.name}
            active={index === activePoint}
            onPointClick={handlePointClick}
            index={index}
          />
        ))}
      </mesh>
      
      {/* Network connections between patrol points */}
      {generateConnectingLines()}
      
      {/* Cloud layer */}
      <mesh ref={cloudsRef} scale={[2.05, 2.05, 2.05]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          alphaTest={0.05}
          depthWrite={false}
        />
      </mesh>
      
      {/* Atmosphere glow */}
      <mesh ref={atmosphereRef} scale={[2.2, 2.2, 2.2]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#1a6eff"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
          emissive="#1a6eff"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Outer glow */}
      <mesh ref={glowRef} scale={[2.5, 2.5, 2.5]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#0a2b5e"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          emissive="#0a2b5e"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Ambient light spheres for visual effect */}
      <mesh position={[-10, 5, 5]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#5499ff" transparent opacity={0.8} />
      </mesh>
      
      <mesh position={[8, -5, -5]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#a3ccff" transparent opacity={0.6} />
      </mesh>
    </group>
  );
};

const Scene = () => {
  const [activePoint, setActivePoint] = useState(null);
  
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 60 }} shadows gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={['#050a15']} />
      <fog attach="fog" args={['#050a15', 8, 30]} />
      <ambientLight intensity={0.2} />
      <directionalLight 
        position={[5, 3, 5]} 
        intensity={0.8} 
        castShadow 
        shadow-mapSize-width={1024} 
        shadow-mapSize-height={1024}
        color="#a3ccff"
      />
      <pointLight position={[-5, 2, -5]} intensity={0.5} color="#3498db" />
      <spotLight position={[0, 10, 0]} intensity={0.3} angle={0.3} penumbra={1} color="#5e8bcf" />
      
      <Suspense fallback={
        <Html center>
          <div className="flex items-center justify-center h-full w-full">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400"></div>
          </div>
        </Html>
      }>
        <Earth setActivePoint={setActivePoint} activePoint={activePoint} />
      </Suspense>
      
      <Stars radius={100} depth={50} count={7000} factor={4} fade saturation={0.5} speed={0.3} />
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05}
        rotateSpeed={0.4}
        enableZoom
        autoRotate={activePoint === null}
        autoRotateSpeed={0.2}
        minDistance={3}
        maxDistance={12}
      />
    </Canvas>
  );
};

const ParallaxSection = ({ children, speed = 0.5, className = "" }) => {
  const [offset, setOffset] = useState(0);
  const sectionRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  
  // Update viewport width on resize
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const { top, height } = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Only apply parallax effect when section is visible
      if (top < windowHeight && top + height > 0) {
        // Adjust speed based on viewport width to ensure consistent effect across screen sizes
        let adjustedSpeed = speed;
        
        if (viewportWidth > 1440) {
          // Reduce parallax effect on larger screens
          adjustedSpeed = speed * 0.5;
        } else if (viewportWidth > 1024) {
          // Slightly reduce parallax effect on medium-large screens
          adjustedSpeed = speed * 0.7;
        }
        
        // Calculate distance from the center of the viewport
        const distanceFromCenter = top - (windowHeight / 2 - height / 2);
        // Use distance from center to create smoother parallax
        const calculatedOffset = distanceFromCenter * adjustedSpeed * -0.1;
        
        // Limit maximum offset to prevent excessive movement
        const maxOffset = Math.min(40, height * 0.1);
        setOffset(Math.max(Math.min(calculatedOffset, maxOffset), -maxOffset));
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed, viewportWidth]);
  
  return (
    <div 
      ref={sectionRef}
      className={`relative overflow-hidden ${className}`}
      style={{ transform: `translateY(${offset}px)` }}
    >
      {children}
    </div>
  );
};

const MobileMenu = ({ isOpen, setIsOpen }) => {
  // Create ref to track clicks outside the menu content
  const menuRef = useRef(null);
  
  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && isOpen) {
        setIsOpen(false);
      }
    };
    
    // Add event listener only when menu is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);
  
  // Handle escape key to close menu
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, setIsOpen]);
  
  return (
    <div 
      className={`fixed inset-0 z-50 transition-all duration-500 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-[#050a15]/90 backdrop-blur-lg transition-opacity duration-500 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => setIsOpen(false)}  
      ></div>
      
      {/* Menu content */}
      <div 
        ref={menuRef}
        className={`absolute right-0 top-0 h-full w-[300px] max-w-full bg-[#071425] border-l border-blue-900/30 shadow-xl transform transition-transform duration-500 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-blue-900/30">
            <div className="flex items-center">
              <svg className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h1 className="ml-2 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">Patrol System</h1>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-blue-300 hover:text-blue-400 transition-colors focus:outline-none p-2 rounded-full hover:bg-blue-900/30"
              aria-label="Close menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <nav className="flex-1 flex flex-col p-8 space-y-6 text-xl overflow-y-auto">
            <a 
              href="#features" 
              onClick={() => setIsOpen(false)}
              className="text-blue-100 hover:text-blue-400 transition-colors transform hover:translate-x-2 duration-300 flex items-center"
            >
              <svg className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Features
            </a>
            <a 
              href="#demo-credentials" 
              onClick={() => setIsOpen(false)}
              className="text-blue-100 hover:text-blue-400 transition-colors transform hover:translate-x-2 duration-300 flex items-center"
            >
              <svg className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Demo Access
            </a>
            <a 
              href="#" 
              onClick={() => setIsOpen(false)}
              className="text-blue-100 hover:text-blue-400 transition-colors transform hover:translate-x-2 duration-300 flex items-center"
            >
              <svg className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Documentation
            </a>
          </nav>
          
          <div className="p-8 border-t border-blue-900/30">
            <Link 
              to="/login" 
              onClick={() => setIsOpen(false)}
              className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-md text-center text-white font-medium transition-colors duration-300"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Features content
  const features = [
    {
      title: "Real-time Patrol Tracking",
      description: "Monitor officer locations and patrol progress in real-time with our advanced tracking system.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    {
      title: "Automated Checkpoints",
      description: "Create virtual checkpoints for officers to verify and document their patrol coverage.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Incident Reporting",
      description: "Enable officers to quickly report incidents with location data, photos, and detailed descriptions.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    {
      title: "Analytics Dashboard",
      description: "Gain insights from comprehensive analytics on patrol efficiency, incident hotspots, and officer performance.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  // Auto cycle through features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [features.length]);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const progress = Math.min(scrollY / documentHeight, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      // Save the current scroll position
      const scrollY = window.scrollY;
      // Add styles to prevent body scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore scrolling when menu is closed
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      // Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    
    return () => {
      // Cleanup function to ensure scroll is restored if component unmounts
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen text-gray-100 relative overflow-hidden bg-[#050a15]">
      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileMenuOpen} setIsOpen={setMobileMenuOpen} />
      
      {/* Gradient overlay for depth */}
      <div 
        className="fixed inset-0 transition-colors duration-500 z-[-1]"
        style={{
          background: `linear-gradient(to bottom, rgba(5, 10, 21, ${1 - scrollProgress * 0.3}) 0%, rgba(6, 18, 36, ${0.5 + scrollProgress * 0.3}) 50%, rgba(7, 26, 59, ${0.8 + scrollProgress * 0.2}) 100%)`
        }}
      ></div>
      
      {/* Floating particles background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full bg-blue-400 animate-float-slow"></div>
        <div className="absolute top-3/4 left-1/2 w-2 h-2 rounded-full bg-blue-500 animate-float-medium"></div>
        <div className="absolute top-1/3 left-3/4 w-1 h-1 rounded-full bg-blue-300 animate-float-fast"></div>
        <div className="absolute top-2/3 left-1/5 w-1.5 h-1.5 rounded-full bg-blue-400 animate-float-medium"></div>
        <div className="absolute top-1/2 left-4/5 w-1 h-1 rounded-full bg-blue-300 animate-float-slow"></div>
        
        {/* Add more particles with parallax effect */}
        <div className="absolute top-1/6 left-1/3 w-1 h-1 rounded-full bg-blue-500/40 animate-float-medium" style={{ transform: `translateY(${scrollProgress * 100}px)` }}></div>
        <div className="absolute top-2/5 left-3/5 w-2 h-2 rounded-full bg-blue-400/30 animate-float-slow" style={{ transform: `translateY(${scrollProgress * -150}px)` }}></div>
        <div className="absolute top-4/5 left-1/6 w-1.5 h-1.5 rounded-full bg-blue-300/50 animate-float-fast" style={{ transform: `translateY(${scrollProgress * 50}px)` }}></div>
        <div className="absolute top-1/5 left-5/6 w-1 h-1 rounded-full bg-blue-600/40 animate-float-medium" style={{ transform: `translateY(${scrollProgress * -120}px)` }}></div>
      </div>
      
      {/* Navigation with glass effect */}
      <header className="bg-[#050a15]/80 backdrop-blur-lg border-b border-blue-900/30 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <svg className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h1 className="ml-2 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">Patrol Monitoring System</h1>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex space-x-6">
              <a href="#features" className="text-blue-100/70 hover:text-blue-400 transition-colors">Features</a>
              <a href="#demo-credentials" className="text-blue-100/70 hover:text-blue-400 transition-colors">Demo Access</a>
              <a href="#" className="text-blue-100/70 hover:text-blue-400 transition-colors">Documentation</a>
            </nav>
            {isAuthenticated ? (
              <Link 
                to="/dashboard" 
                className="group relative overflow-hidden rounded-md bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#050a15] transition-colors duration-300 hover:from-blue-500 hover:to-blue-400"
              >
                {/* Remove the sliding span */}
                <span className="relative flex items-center gap-2 text-sm font-medium">
                  Go to Dashboard
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </Link>
            ) : (
              <Link 
                to="/login" 
                className="group relative overflow-hidden rounded-md bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#050a15] transition-colors duration-300 hover:from-blue-500 hover:to-blue-400"
              >
                {/* Remove the sliding span */}
                <span className="relative flex items-center gap-2 text-sm font-medium">
                  Login
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </Link>
            )}
          </div>
          <button 
            className="md:hidden text-blue-300 focus:outline-none p-2 rounded-full hover:bg-blue-900/30"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <main>
        {/* Hero section with integrated 3D scene */}
        <section className="h-screen relative overflow-hidden flex items-center">
          <div className="absolute inset-0 z-0">
            <Scene />
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="md:max-w-lg backdrop-blur-xl bg-[#081425]/40 p-8 rounded-xl shadow-2xl border border-blue-900/30">
              <div className="absolute -top-3 -left-3 w-6 h-6 bg-blue-500/30 rounded-md rotate-45"></div>
              <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-blue-500/30 rounded-md rotate-45"></div>
              
              <ParallaxSection speed={0.1} className="mb-6">
                <h2 className="text-4xl sm:text-5xl font-bold animate-fadeUp">
                  Next-Generation <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Patrol Monitoring</span> Solution
                </h2>
              </ParallaxSection>
              
              <ParallaxSection speed={0.15} className="mb-8">
                <p className="text-lg text-blue-100/90 animation-delay-100 animate-fadeUp">
                  Streamline patrol operations, enhance officer safety, and improve security coverage with our comprehensive monitoring system.
                </p>
              </ParallaxSection>
              
              <ParallaxSection speed={0.2}>
                <div className="flex flex-wrap gap-4 animation-delay-200 animate-fadeUp">
                  <Link to="/login" className="relative inline-flex items-center justify-center px-6 py-3 overflow-hidden font-medium transition-all bg-blue-600 rounded-lg hover:bg-blue-500 group">
                    <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-blue-700 group-hover:translate-x-0 ease">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                      </svg>
                    </span>
                    <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">Get Started</span>
                    <span className="relative invisible">Get Started</span>
                  </Link>
                  <a href="#features" className="relative inline-flex items-center justify-center px-6 py-3 overflow-hidden font-medium text-blue-600 transition-all duration-300 ease-out border-2 border-blue-600 rounded-lg group">
                    <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 translate-y-full bg-blue-700 group-hover:translate-y-0 ease"></span>
                    <span className="absolute flex items-center justify-center w-full h-full text-blue-600 transition-all duration-300 transform group-hover:translate-y-full ease">Learn More</span>
                    <span className="relative invisible">Learn More</span>
                  </a>
                </div>
              </ParallaxSection>
              
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2">
                <div className="bg-blue-900/30 backdrop-blur-sm rounded-full shadow-glow shadow-blue-500/20 p-3 animate-float animation-delay-300">
                  <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
              </div>
              
              <div className="absolute bottom-0 right-0 transform translate-x-1/3 translate-y-1/3">
                <div className="bg-blue-900/30 backdrop-blur-sm rounded-lg shadow-glow shadow-blue-500/20 p-3 animate-float animation-delay-500">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Advanced metrics display */}
          <div className="absolute bottom-10 right-10 z-10 max-w-xs bg-[#081020]/70 backdrop-blur-lg p-4 rounded-lg border border-blue-900/30 shadow-glow shadow-blue-500/10 hidden md:block">
            <div className="text-xs text-blue-300 font-mono uppercase tracking-wider mb-2">System Status</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0a1930]/50 p-2 rounded-md">
                <div className="text-2xs text-blue-400 mb-1">Active Patrols</div>
                <div className="text-lg font-bold text-blue-300">24</div>
              </div>
              <div className="bg-[#0a1930]/50 p-2 rounded-md">
                <div className="text-2xs text-blue-400 mb-1">Incidents Today</div>
                <div className="text-lg font-bold text-blue-300">7</div>
              </div>
              <div className="bg-[#0a1930]/50 p-2 rounded-md">
                <div className="text-2xs text-blue-400 mb-1">Coverage</div>
                <div className="text-lg font-bold text-blue-300">92%</div>
              </div>
              <div className="bg-[#0a1930]/50 p-2 rounded-md">
                <div className="text-2xs text-blue-400 mb-1">Uptime</div>
                <div className="text-lg font-bold text-blue-300">99.9%</div>
              </div>
            </div>
          </div>
          
          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <a href="#features" className="text-blue-300 flex flex-col items-center">
              <p className="mb-2 text-sm">Scroll to explore</p>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </a>
          </div>
        </section>

        {/* Features section */}
        <section id="features" className="py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050a15] via-[#071b39] to-[#050a15] z-[-1]"></div>
          
          {/* Light beams for depth */}
          <div className="absolute top-0 left-1/4 w-64 h-96 bg-blue-500/5 rotate-45 blur-3xl" style={{ transform: `rotate(45deg) translateY(${scrollProgress * -100}px)` }}></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-96 bg-blue-600/5 -rotate-45 blur-3xl" style={{ transform: `rotate(-45deg) translateY(${scrollProgress * 100}px)` }}></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <ParallaxSection speed={0.1}>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Next-Level</span> Security Management
                </h2>
              </ParallaxSection>
              
              <ParallaxSection speed={0.15}>
                <p className="max-w-2xl mx-auto text-lg text-blue-100/70">
                  Our platform combines cutting-edge technology with intuitive design to transform how you manage security operations.
                </p>
              </ParallaxSection>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
              <div className="space-y-8">
                {features.map((feature, index) => (
                  <ParallaxSection 
                    key={index} 
                    speed={0.1 + (index * 0.05)} 
                    className={`transform transition-all duration-500 ${
                      activeFeature === index 
                        ? 'scale-105 -translate-y-2' 
                        : 'scale-100 hover:scale-102 hover:-translate-y-1'
                    }`}
                  >
                    <div 
                      className={`bg-gradient-to-br ${
                        activeFeature === index 
                          ? 'from-[#0a1930] to-[#081425] border-blue-500/30 shadow-glow shadow-blue-500/10' 
                          : 'from-[#081425]/80 to-[#050a15]/80 border-blue-900/20'
                      } backdrop-blur-lg rounded-xl p-6 cursor-pointer transition-all duration-300 border h-full`}
                      onClick={() => setActiveFeature(index)}
                    >
                      <div className="flex items-start">
                        <div className={`p-2 rounded-lg mr-4 ${
                          activeFeature === index 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-blue-900/30 text-blue-300'
                        }`}>
                          {feature.icon}
                        </div>
                        <div>
                          <h3 className={`text-xl font-semibold mb-2 ${
                            activeFeature === index 
                              ? 'text-blue-300' 
                              : 'text-blue-100'
                          }`}>
                            {feature.title}
                          </h3>
                          <p className={`${
                            activeFeature === index 
                              ? 'text-blue-100/90' 
                              : 'text-blue-100/60'
                          }`}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                      
                      {/* Feature indicator */}
                      <div className={`h-1 mt-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500 ${
                        activeFeature === index ? 'w-full opacity-100' : 'w-0 opacity-0'
                      }`}></div>
                    </div>
                  </ParallaxSection>
                ))}
              </div>
              
              <ParallaxSection speed={0.2} className="relative">
                <div className="bg-[#081425]/50 backdrop-blur-lg rounded-2xl border border-blue-900/30 p-6 shadow-lg shadow-blue-900/10 sticky top-24">
                  <div className="absolute -right-3 -top-3 w-6 h-6 bg-blue-500/30 rounded-md rotate-45"></div>
                  <div className="absolute -left-3 -bottom-3 w-6 h-6 bg-blue-500/30 rounded-md rotate-45"></div>
                  
                  <h3 className="text-xl font-semibold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">System Performance</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-blue-300">Efficiency</span>
                        <span className="text-sm text-blue-400">+65%</span>
                      </div>
                      <div className="h-2 bg-blue-900/30 rounded-full">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 animate-grow-width" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-blue-300">Response Time</span>
                        <span className="text-sm text-blue-400">-42%</span>
                      </div>
                      <div className="h-2 bg-blue-900/30 rounded-full">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 animate-grow-width animation-delay-100" style={{ width: '42%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-blue-300">Coverage</span>
                        <span className="text-sm text-blue-400">+83%</span>
                      </div>
                      <div className="h-2 bg-blue-900/30 rounded-full">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 animate-grow-width animation-delay-200" style={{ width: '83%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-blue-300">Incident Resolution</span>
                        <span className="text-sm text-blue-400">+76%</span>
                      </div>
                      <div className="h-2 bg-blue-900/30 rounded-full">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 animate-grow-width animation-delay-300" style={{ width: '76%' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 p-4 bg-[#0a1930]/80 rounded-xl border border-blue-900/30">
                    <div className="flex items-start">
                      <div className="p-2 bg-blue-500/20 rounded-lg mr-4">
                        <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-300 mb-1">Deployment Impact</h4>
                        <p className="text-xs text-blue-100/60">
                          Users report an average 71% increase in operational efficiency after implementing our patrol monitoring solution.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ParallaxSection>
            </div>
          </div>
        </section>

        {/* Demo Credentials */}
        <section id="demo-credentials" className="py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050a15] via-[#071b39] to-[#050a15] z-[-1]"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <ParallaxSection speed={0.1}>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Try</span> It Yourself
                </h2>
              </ParallaxSection>
              
              <ParallaxSection speed={0.15}>
                <p className="max-w-2xl mx-auto text-lg text-blue-100/70">
                  Experience our platform with these demo accounts. Each role provides access to different features and capabilities.
                </p>
              </ParallaxSection>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <ParallaxSection speed={0.1}>
                <div className="bg-gradient-to-br from-[#0a1930]/80 to-[#071425]/80 backdrop-blur-lg rounded-xl border border-blue-900/30 p-6 transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-glow hover:shadow-blue-500/10 hover:border-blue-500/30 h-full flex flex-col">
                  <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4">
                    <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-blue-300">Admin Access</h3>
                  <p className="text-blue-100/60 mb-4 text-sm">
                    Complete access to all system features, including configuration, user management, and analytics.
                  </p>
                  <div className="bg-[#081425]/80 p-4 rounded-lg space-y-3 mb-4">
                    <div>
                      <div className="text-xs text-blue-400 mb-1">Username</div>
                      <div className="font-mono text-blue-100">admin@example.com</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-400 mb-1">Password</div>
                      <div className="font-mono text-blue-100">password123</div>
                    </div>
                  </div>
                  <Link to="/login?email=admin@example.com&password=password123" className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-md text-center text-white font-medium transition-colors duration-300">
                    Login as Admin
                  </Link>
                </div>
              </ParallaxSection>
              
              <ParallaxSection speed={0.15}>
                <div className="bg-gradient-to-br from-[#0a1930]/80 to-[#071425]/80 backdrop-blur-lg rounded-xl border border-blue-900/30 p-6 transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-glow hover:shadow-blue-500/10 hover:border-blue-500/30 h-full flex flex-col">
                  <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4">
                    <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-blue-300">Supervisor Access</h3>
                  <p className="text-blue-100/60 mb-4 text-sm">
                    Monitor personnel, view reports, and manage patrol routes and schedules.
                  </p>
                  <div className="bg-[#081425]/80 p-4 rounded-lg space-y-3 mb-4">
                    <div>
                      <div className="text-xs text-blue-400 mb-1">Username</div>
                      <div className="font-mono text-blue-100">manager@example.com</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-400 mb-1">Password</div>
                      <div className="font-mono text-blue-100">password123</div>
                    </div>
                  </div>
                  <Link to="/login?email=manager@example.com&password=password123" className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-md text-center text-white font-medium transition-colors duration-300">
                    Login as Supervisor
                  </Link>
                </div>
              </ParallaxSection>
              
              <ParallaxSection speed={0.2}>
                <div className="bg-gradient-to-br from-[#0a1930]/80 to-[#071425]/80 backdrop-blur-lg rounded-xl border border-blue-900/30 p-6 transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-glow hover:shadow-blue-500/10 hover:border-blue-500/30 h-full flex flex-col">
                  <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4">
                    <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-blue-300">Officer Access</h3>
                  <p className="text-blue-100/60 mb-4 text-sm">
                    Report incidents, check in at checkpoints, and view assigned patrol routes.
                  </p>
                  <div className="bg-[#081425]/80 p-4 rounded-lg space-y-3 mb-4">
                    <div>
                      <div className="text-xs text-blue-400 mb-1">Username</div>
                      <div className="font-mono text-blue-100">officer1@example.com</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-400 mb-1">Password</div>
                      <div className="font-mono text-blue-100">password123</div>
                    </div>
                  </div>
                  <Link to="/login?email=officer1@example.com&password=password123" className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-md text-center text-white font-medium transition-colors duration-300">
                    Login as Officer
                  </Link>
                </div>
              </ParallaxSection>
            </div>
          </div>
        </section>
        
        {/* Footer */}
        <footer className="py-16 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#071b39] to-[#050a15] z-[-1]"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
              <ParallaxSection speed={0.05} className="col-span-1 md:col-span-2">
                <div className="flex items-center mb-4">
                  <svg className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h2 className="ml-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">Patrol Monitoring System</h2>
                </div>
                <p className="text-blue-100/60 mb-6">
                  Transforming security operations with advanced monitoring technology, real-time tracking, and comprehensive analytics.
                </p>
                <div className="flex space-x-4">
                  <a href="#" className="p-2 bg-blue-900/30 rounded-full text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                    </svg>
                  </a>
                  <a href="#" className="p-2 bg-blue-900/30 rounded-full text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.054 10.054 0 01-3.127 1.184 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                  </a>
                  <a href="#" className="p-2 bg-blue-900/30 rounded-full text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.016 18.6c-.608.276-1.248.42-1.897.42-2.684 0-4.862-2.178-4.862-4.862 0-.649.144-1.289.42-1.897L12 10.689l1.323-.542c.608-.276 1.248-.42 1.897-.42 2.684 0 4.862 2.178 4.862 4.862 0 .649-.144 1.289-.42 1.897L18 17.91l-1.323.542zM8.67 10.689l-1.323.542c-.608.276-1.248.42-1.897.42-2.684 0-4.862-2.178-4.862-4.862 0-.649.144-1.289.42-1.897L2.313 3.75l1.323-.542c.608-.276 1.248-.42 1.897-.42 2.684 0 4.862 2.178 4.862 4.862 0 .649-.144 1.289-.42 1.897L8.67 10.689z" />
                    </svg>
                  </a>
                  <a href="#" className="p-2 bg-blue-900/30 rounded-full text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </a>
                </div>
              </ParallaxSection>
              
              <ParallaxSection speed={0.1}>
                <h3 className="text-lg font-semibold mb-4 text-blue-300">Quick Links</h3>
                <ul className="space-y-2 text-blue-100/60">
                  <li><a href="#features" className="hover:text-blue-400 transition-colors">Features</a></li>
                  <li><a href="#demo-credentials" className="hover:text-blue-400 transition-colors">Demo Access</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Terms of Service</a></li>
                </ul>
              </ParallaxSection>
              
              <ParallaxSection speed={0.15}>
                <h3 className="text-lg font-semibold mb-4 text-blue-300">Contact</h3>
                <ul className="space-y-3 text-blue-100/60">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-blue-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>(123) 456-7890</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-blue-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>info@patrolsystem.com</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-blue-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>123 Security Ave, Suite 456<br />Cyber City, TX 78901</span>
                  </li>
                </ul>
              </ParallaxSection>
            </div>
            
            <ParallaxSection speed={0.05}>
              <div className="border-t border-blue-900/30 mt-12 pt-8 text-center text-blue-100/50 text-sm">
                <p>&copy; {new Date().getFullYear()} Patrol Monitoring System. All rights reserved.</p>
              </div>
            </ParallaxSection>
          </div>
        </footer>
      </main>
      
      {/* Add global CSS for animations */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-15px) translateX(5px); }
        }
        
        @keyframes float-medium {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(-10px); }
        }
      `}</style>
    </div>
  );
};

export default HomePage; 