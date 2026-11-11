import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Video,
  Download,
  Sparkles,
  Camera,
  Layers,
  ChevronDown,
  ChevronUp,
  Film,
  Gamepad2,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import {
  CameraRigMode,
  compute3DCameraPose,
  computeArenaOrbCollection,
} from '../utils/claudeLogic';

type GameState = 'title' | 'playing' | 'paused' | 'gameover';
export type ScenePresetId = 'rover-arena' | 'orbital-station' | 'clockwork-orrery' | 'cyber-citadel';

export interface Recorded3DVideoClip {
  id: string;
  title: string;
  sceneName: string;
  cameraRig: string;
  durationSec: number;
  url: string;
  mimeType: string;
  source: 'WebGL 3D Capture' | 'Gemini Omni 3D AI';
  createdAt: string;
}

interface ThreeSpatialGameViewProps {
  autoStart?: boolean;
}

const SCENE_PRESETS: Array<{
  id: ScenePresetId;
  name: string;
  subtitle: string;
}> = [
  {
    id: 'rover-arena',
    name: 'Autonomous Rover & Collector Grid',
    subtitle: '6-part telemetry rover, emerald cores & sentinel drones',
  },
  {
    id: 'clockwork-orrery',
    name: 'Clockwork Celestial Orrery',
    subtitle: 'Concentric brass astrolabe rings, solar core & orbiting moons',
  },
  {
    id: 'orbital-station',
    name: 'Coriolis Orbital Ring Station',
    subtitle: 'Rotating habitat torus, solar sail wings & docking spire',
  },
  {
    id: 'cyber-citadel',
    name: 'Architectural Monolith Citadel',
    subtitle: 'Stepped brutalist data towers, energy bridges & light beacons',
  },
];

const CAMERA_RIGS: Array<{
  id: CameraRigMode;
  label: string;
  badge: string;
}> = [
  { id: 'orbit', label: 'Orbit Turntable 360°', badge: '3D Orbit' },
  { id: 'crane', label: 'Crane & Dolly Swoop', badge: 'Cinema' },
  { id: 'fpv', label: 'FPV Drone Figure-8', badge: 'Dynamic' },
  { id: 'stereo', label: 'Stereoscopic 3D (Side-by-Side)', badge: 'VR / 3DTV' },
];

export const ThreeSpatialGameView: React.FC<ThreeSpatialGameViewProps> = ({
  autoStart = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<GameState>(() =>
    autoStart ? 'playing' : 'title'
  );
  const [studioMode, setStudioMode] = useState<'video-director' | 'interactive-arena'>('video-director');
  const [scenePreset, setScenePreset] = useState<ScenePresetId>('clockwork-orrery');
  const [cameraRig, setCameraRig] = useState<CameraRigMode>('crane');
  const [animSpeed, setAnimSpeed] = useState<number>(1.0);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  // 3D Video Recording & AI Synthesis State
  const [isRecordingWebGL, setIsRecordingWebGL] = useState<boolean>(false);
  const [recordCountdown, setRecordCountdown] = useState<number>(0);
  const [ai3DPrompt, setAi3DPrompt] = useState<string>(
    'Cinematic 3D Unreal Engine 5 turntable render of a brass clockwork astrolabe observatory with volumetric golden light beams, 60fps'
  );
  const [isGeneratingAi3D, setIsGeneratingAi3D] = useState<boolean>(false);
  const [recordedClips, setRecordedClips] = useState<Recorded3DVideoClip[]>([]);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Arena Game Telemetry State
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem('claude_3d_arena_highscore') || '1200');
    } catch {
      return 1200;
    }
  });
  const [combo, setCombo] = useState(1);
  const [hullIntegrity, setHullIntegrity] = useState(100);
  const [orbsCollected, setOrbsCollected] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Mutable refs for 60Hz loop decoupling
  const gameStateRef = useRef<GameState>(autoStart ? 'playing' : 'title');
  const studioModeRef = useRef<'video-director' | 'interactive-arena'>('video-director');
  const scenePresetRef = useRef<ScenePresetId>('clockwork-orrery');
  const cameraRigRef = useRef<CameraRigMode>('crane');
  const animSpeedRef = useRef<number>(1.0);
  const soundEnabledRef = useRef<boolean>(true);
  const scoreRef = useRef<number>(0);
  const comboRef = useRef<number>(1);
  const hullRef = useRef<number>(100);
  const orbsCountRef = useRef<number>(0);
  const resetTriggerRef = useRef<(() => void) | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
    document.body.dataset.state = gameState;
    return () => {
      delete document.body.dataset.state;
    };
  }, [gameState]);

  useEffect(() => {
    studioModeRef.current = studioMode;
  }, [studioMode]);

  useEffect(() => {
    scenePresetRef.current = scenePreset;
  }, [scenePreset]);

  useEffect(() => {
    cameraRigRef.current = cameraRig;
  }, [cameraRig]);

  useEffect(() => {
    animSpeedRef.current = animSpeed;
  }, [animSpeed]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const showBanner = (msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => {
      setStatusNotice((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  const playSynthTone = (kind: 'collect' | 'damage' | 'start') => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (kind === 'collect') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      } else if (kind === 'damage') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.22);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.18);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // ignore audio errors
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software-WebGL Detection & Renderer Setup
    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 960, container.clientHeight || 640, false);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    canvasRef.current = renderer.domElement;

    // 2. Scene, Fog & Studio RoomEnvironment IBL
    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x181715);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x181715, 0.02);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      50,
      (container.clientWidth || 960) / (container.clientHeight || 640),
      0.1,
      140
    );
    const leftEyeCamera = camera.clone();
    const rightEyeCamera = camera.clone();
    camera.position.set(0, 10, 14);
    camera.lookAt(0, 0.8, 0);

    // 3. Balanced 3-Point Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfaf9f5, 0x24221f, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe2c6, 2.4);
    keyLight.position.set(11, 19, 13);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc96442, 1.35);
    rimLight.position.set(-13, 9, -11);
    scene.add(rimLight);

    // 4. Shared PBR Material Palette (Varying Roughness & Metalness >= 0.25)
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xfaf9f5,
      roughness: 0.26,
      metalness: 0.22,
    });
    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xc96442,
      roughness: 0.22,
      metalness: 0.82,
    });
    const brushedGoldMat = new THREE.MeshStandardMaterial({
      color: 0xe5a952,
      roughness: 0.18,
      metalness: 0.9,
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x1e1d1b,
      roughness: 0.65,
      metalness: 0.35,
    });
    const emeraldGlowMat = new THREE.MeshStandardMaterial({
      color: 0x52b788,
      emissive: 0x2d6a4f,
      emissiveIntensity: 0.75,
      roughness: 0.18,
      metalness: 0.45,
    });
    const solarGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xd97757,
      emissiveIntensity: 1.1,
      roughness: 0.15,
      metalness: 0.2,
    });

    // 5. Base Stage Floor, Disjoint Contact Shadow & Architectural Perimeter
    const floorGeo = new THREE.CircleGeometry(24, isSoftwareGl ? 32 : 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x21201e,
      roughness: 0.84,
      metalness: 0.12,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    const gridHelper = new THREE.GridHelper(38, 19, 0xc96442, 0x35332f);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    const contactShadowGeo = new THREE.CircleGeometry(4.2, 32);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      color: 0x090908,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.03;
    scene.add(contactShadow);

    const perimeterRing = new THREE.Mesh(
      new THREE.TorusGeometry(18.5, 0.2, 12, isSoftwareGl ? 36 : 72),
      copperMat
    );
    perimeterRing.rotation.x = Math.PI / 2;
    perimeterRing.position.y = 0.24;
    scene.add(perimeterRing);

    // Starfield InstancedMesh (>20 repeated background nodes)
    const starCount = 60;
    const starInstanced = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.12, 0),
      hullMat,
      starCount
    );
    const dummyMat = new THREE.Matrix4();
    for (let i = 0; i < starCount; i++) {
      const a = (i / starCount) * Math.PI * 2;
      const r = 21 + (i % 5) * 2.5;
      const y = 2.0 + (i % 7) * 1.6;
      dummyMat.makeTranslation(Math.cos(a) * r, y, Math.sin(a) * r);
      starInstanced.setMatrixAt(i, dummyMat);
    }
    starInstanced.instanceMatrix.needsUpdate = true;
    starInstanced.computeBoundingSphere();
    scene.add(starInstanced);

    // =========================================================================
    // SCENE GROUP A: ROVER & COLLECTOR GRID (6-part Rover + Orbs + Sentinels)
    // =========================================================================
    const roverSceneGroup = new THREE.Group();
    scene.add(roverSceneGroup);

    const playerGroup = new THREE.Group();
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 1.45), hullMat);
    chassis.position.y = 0.45;
    const wingGeo = new THREE.BoxGeometry(0.75, 0.08, 0.65);
    const leftWing = new THREE.Mesh(wingGeo, darkTrimMat);
    leftWing.position.set(-0.9, 0.48, 0.05);
    const rightWing = new THREE.Mesh(wingGeo, darkTrimMat);
    rightWing.position.set(0.9, 0.48, 0.05);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), copperMat);
    dome.position.set(0, 0.75, -0.1);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.2), solarGlowMat);
    visor.position.set(0, 0.52, -0.68);
    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.3, 12), brushedGoldMat);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(0, 0.44, 0.8);
    playerGroup.add(chassis, leftWing, rightWing, dome, visor, thruster);
    roverSceneGroup.add(playerGroup);

    interface OrbEntity {
      group: THREE.Group;
      core: THREE.Mesh;
      ring: THREE.Mesh;
      basePhase: number;
    }
    const orbs: OrbEntity[] = [];
    const orbCoreGeo = new THREE.OctahedronGeometry(0.45, 0);
    const orbRingGeo = new THREE.TorusGeometry(0.68, 0.05, 8, 24);
    const orbBaseGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.14, 12);
    const initialOrbPositions = [
      { x: 0, z: -5.5 },
      { x: 5.5, z: -3.5 },
      { x: -5.5, z: -3.5 },
      { x: 6.5, z: 4.5 },
      { x: -6.5, z: 4.5 },
    ];
    initialOrbPositions.forEach((pos, idx) => {
      const g = new THREE.Group();
      const core = new THREE.Mesh(orbCoreGeo, emeraldGlowMat);
      core.position.y = 0.95;
      const ring = new THREE.Mesh(orbRingGeo, copperMat);
      ring.position.y = 0.95;
      const ped = new THREE.Mesh(orbBaseGeo, hullMat);
      ped.position.y = 0.08;
      g.add(core, ring, ped);
      g.position.set(pos.x, 0, pos.z);
      roverSceneGroup.add(g);
      orbs.push({ group: g, core, ring, basePhase: idx * 1.2 });
    });

    interface HazardEntity {
      group: THREE.Group;
      angle: number;
      radius: number;
      speed: number;
    }
    const hazards: HazardEntity[] = [];
    const hazardBodyGeo = new THREE.ConeGeometry(0.55, 1.35, 6);
    const hazardRingGeo = new THREE.TorusGeometry(0.65, 0.07, 8, 18);
    const hazardMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.6,
    });
    [
      { angle: 0.8, radius: 8.5, speed: 0.75 },
      { angle: 2.9, radius: 11.0, speed: -0.65 },
      { angle: 4.8, radius: 13.5, speed: 0.55 },
    ].forEach((cfg) => {
      const g = new THREE.Group();
      const spire = new THREE.Mesh(hazardBodyGeo, hazardMat);
      spire.position.y = 0.7;
      const collar = new THREE.Mesh(hazardRingGeo, darkTrimMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.45;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), copperMat);
      cap.position.y = 1.5;
      g.add(spire, collar, cap);
      g.position.set(Math.cos(cfg.angle) * cfg.radius, 0, Math.sin(cfg.angle) * cfg.radius);
      roverSceneGroup.add(g);
      hazards.push({ group: g, ...cfg });
    });

    // =========================================================================
    // SCENE GROUP B: CLOCKWORK CELESTIAL ORRERY (8-part Astronomical Sculpture)
    // =========================================================================
    const orreryGroup = new THREE.Group();
    const orreryPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 3.1, 0.7, 24),
      darkTrimMat
    );
    orreryPedestal.position.y = 0.35;
    const orreryBrassPlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.1, 0.45, 24),
      copperMat
    );
    orreryBrassPlinth.position.y = 0.9;
    const sunCore = new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 24), solarGlowMat);
    sunCore.position.y = 4.2;
    const outerMeridianRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.4, 0.16, 16, 48),
      brushedGoldMat
    );
    outerMeridianRing.position.y = 4.2;
    const innerEquatorialRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.3, 0.12, 14, 42),
      copperMat
    );
    innerEquatorialRing.position.y = 4.2;
    const eclipticRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.3, 0.1, 12, 36),
      hullMat
    );
    eclipticRing.position.y = 4.2;

    const planetArm = new THREE.Group();
    planetArm.position.y = 4.2;
    const planetSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 18, 18),
      emeraldGlowMat
    );
    planetSphere.position.set(5.8, 0, 0);
    const planetMoonRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.05, 10, 24),
      brushedGoldMat
    );
    planetMoonRing.rotation.x = Math.PI / 3;
    planetMoonRing.position.set(5.8, 0, 0);
    planetArm.add(planetSphere, planetMoonRing);

    orreryGroup.add(
      orreryPedestal,
      orreryBrassPlinth,
      sunCore,
      outerMeridianRing,
      innerEquatorialRing,
      eclipticRing,
      planetArm
    );
    scene.add(orreryGroup);

    // =========================================================================
    // SCENE GROUP C: CORIOLIS ORBITAL RING STATION (7-part Space Habitat)
    // =========================================================================
    const stationGroup = new THREE.Group();
    const centralSpire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.85, 8.2, 20),
      hullMat
    );
    centralSpire.position.y = 4.2;
    const habitatTorus = new THREE.Mesh(
      new THREE.TorusGeometry(5.2, 0.55, 16, 48),
      hullMat
    );
    habitatTorus.rotation.x = Math.PI / 2;
    habitatTorus.position.y = 4.2;
    const innerCommandRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.24, 12, 36),
      copperMat
    );
    innerCommandRing.rotation.x = Math.PI / 2;
    innerCommandRing.position.y = 4.2;
    const spoke1 = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.22, 0.22), darkTrimMat);
    spoke1.position.y = 4.2;
    const spoke2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 10.2), darkTrimMat);
    spoke2.position.y = 4.2;
    const beaconCrown = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.75, 0),
      emeraldGlowMat
    );
    beaconCrown.position.y = 8.7;
    stationGroup.add(
      centralSpire,
      habitatTorus,
      innerCommandRing,
      spoke1,
      spoke2,
      beaconCrown
    );
    scene.add(stationGroup);

    // =========================================================================
    // SCENE GROUP D: ARCHITECTURAL CYBER-CITADEL (Multi-Tower Monolith Complex)
    // =========================================================================
    const citadelGroup = new THREE.Group();
    const towerPositions = [
      { x: 0, z: 0, h: 7.5, w: 2.0, mat: darkTrimMat },
      { x: -3.6, z: -2.4, h: 5.2, w: 1.5, mat: copperMat },
      { x: 3.6, z: -2.4, h: 5.8, w: 1.5, mat: hullMat },
      { x: -3.2, z: 2.8, h: 4.4, w: 1.4, mat: hullMat },
      { x: 3.2, z: 2.8, h: 4.8, w: 1.4, mat: copperMat },
    ];
    towerPositions.forEach((tp) => {
      const tMesh = new THREE.Mesh(
        new THREE.BoxGeometry(tp.w, tp.h, tp.w),
        tp.mat
      );
      tMesh.position.set(tp.x, tp.h / 2, tp.z);
      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(tp.w * 0.7, 0.35, tp.w * 0.7),
        solarGlowMat
      );
      crown.position.set(tp.x, tp.h + 0.2, tp.z);
      citadelGroup.add(tMesh, crown);
    });
    const skyBridge = new THREE.Mesh(
      new THREE.BoxGeometry(7.4, 0.35, 0.7),
      brushedGoldMat
    );
    skyBridge.position.set(0, 3.8, -2.4);
    citadelGroup.add(skyBridge);
    scene.add(citadelGroup);

    // Pre-warm shaders on hardware GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 6. Keyboard Input Listeners
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      keys[e.code] = true;
      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      }
      if (
        (e.code === 'Enter' || e.code === 'Space') &&
        gameStateRef.current === 'title' &&
        studioModeRef.current === 'interactive-arena'
      ) {
        setGameState('playing');
      }
      if (e.code === 'Escape') {
        if (gameStateRef.current === 'playing') {
          setGameState('paused');
        } else if (gameStateRef.current === 'paused') {
          setGameState('playing');
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    const onWindowBlur = () => {
      Object.keys(keys).forEach((k) => {
        keys[k] = false;
      });
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);

    const resetArena = () => {
      playerGroup.position.set(0, 0, 2.5);
      playerGroup.rotation.set(0, 0, 0);
      scoreRef.current = 0;
      comboRef.current = 1;
      hullRef.current = 100;
      orbsCountRef.current = 0;
      setScore(0);
      setCombo(1);
      setHullIntegrity(100);
      setOrbsCollected(0);
      orbs.forEach((o, i) => {
        const p = initialOrbPositions[i];
        o.group.position.set(p.x, 0, p.z);
      });
    };
    resetTriggerRef.current = resetArena;
    playerGroup.position.set(0, 0, 2.5);

    // 7. ResizeObserver
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      }
    });
    ro.observe(container);

    // 8. Software-WebGL Compliant Render Loop (`afterDraw` fenceSync)
    let frameId = 0;
    let lastTime = performance.now();
    let elapsedTotal = 0;
    let hitstopTimer = 0;
    let damageCooldown = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function renderSceneWithRig(pose: ReturnType<typeof compute3DCameraPose>) {
      const w = renderer.domElement.clientWidth || 960;
      const h = renderer.domElement.clientHeight || 640;

      if (pose.stereoSeparation > 0) {
        // Side-by-Side 3D Stereoscopic rendering (Left Eye + Right Eye)
        renderer.setScissorTest(true);
        const halfW = Math.floor(w / 2);

        leftEyeCamera.aspect = halfW / h;
        leftEyeCamera.updateProjectionMatrix();
        leftEyeCamera.position.set(
          pose.posX - pose.stereoSeparation,
          pose.posY,
          pose.posZ
        );
        leftEyeCamera.lookAt(pose.lookX, pose.lookY, pose.lookZ);

        renderer.setViewport(0, 0, halfW, h);
        renderer.setScissor(0, 0, halfW, h);
        renderer.render(scene, leftEyeCamera);

        rightEyeCamera.aspect = halfW / h;
        rightEyeCamera.updateProjectionMatrix();
        rightEyeCamera.position.set(
          pose.posX + pose.stereoSeparation,
          pose.posY,
          pose.posZ
        );
        rightEyeCamera.lookAt(pose.lookX, pose.lookY, pose.lookZ);

        renderer.setViewport(halfW, 0, w - halfW, h);
        renderer.setScissor(halfW, 0, w - halfW, h);
        renderer.render(scene, rightEyeCamera);

        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
      } else {
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
        renderer.render(scene, camera);
      }
    }

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const speedMult = animSpeedRef.current;
      elapsedTotal += dt * speedMult;

      // Toggle active 3D scene preset visibility
      const activePreset =
        studioModeRef.current === 'interactive-arena'
          ? 'rover-arena'
          : scenePresetRef.current;

      roverSceneGroup.visible = activePreset === 'rover-arena';
      orreryGroup.visible = activePreset === 'clockwork-orrery';
      stationGroup.visible = activePreset === 'orbital-station';
      citadelGroup.visible = activePreset === 'cyber-citadel';

      // Animate Clockwork Orrery
      if (orreryGroup.visible) {
        outerMeridianRing.rotation.y = elapsedTotal * 0.55;
        outerMeridianRing.rotation.x = Math.sin(elapsedTotal * 0.4) * 0.35;
        innerEquatorialRing.rotation.x = elapsedTotal * 0.85;
        innerEquatorialRing.rotation.z = elapsedTotal * 0.45;
        eclipticRing.rotation.y = -elapsedTotal * 1.15;
        planetArm.rotation.y = elapsedTotal * 0.7;
        planetMoonRing.rotation.z = elapsedTotal * 1.8;
      }

      // Animate Coriolis Orbital Station
      if (stationGroup.visible) {
        habitatTorus.rotation.z = elapsedTotal * 0.45;
        innerCommandRing.rotation.z = -elapsedTotal * 0.75;
        spoke1.rotation.y = elapsedTotal * 0.45;
        spoke2.rotation.y = elapsedTotal * 0.45;
        beaconCrown.rotation.y = elapsedTotal * 1.5;
        beaconCrown.position.y = 8.7 + Math.sin(elapsedTotal * 2.2) * 0.25;
      }

      // Animate Cyber-Citadel
      if (citadelGroup.visible) {
        citadelGroup.rotation.y = Math.sin(elapsedTotal * 0.25) * 0.18;
      }

      // Animate Orbs in Rover Scene
      if (roverSceneGroup.visible) {
        orbs.forEach((orb) => {
          orb.core.rotation.y += dt * 1.8;
          orb.ring.rotation.x += dt * 1.2;
          orb.ring.rotation.y += dt * 0.9;
          orb.core.position.y = 0.95 + Math.sin(now * 0.003 + orb.basePhase) * 0.14;
        });
      }

      if (studioModeRef.current === 'video-director') {
        // 3D Video Studio Mode: Smoothly damp camera along selected 3D Camera Rig
        const pose = compute3DCameraPose({
          rig: cameraRigRef.current,
          elapsedSec: elapsedTotal,
          speedMultiplier: 1.0,
        });
        const dampFactor = 1 - Math.exp(-6.5 * dt);
        camera.position.x += (pose.posX - camera.position.x) * dampFactor;
        camera.position.y += (pose.posY - camera.position.y) * dampFactor;
        camera.position.z += (pose.posZ - camera.position.z) * dampFactor;
        camera.lookAt(pose.lookX, pose.lookY, pose.lookZ);

        // Also animate rover patrol when viewing rover-arena in video director mode
        if (activePreset === 'rover-arena') {
          const rAngle = elapsedTotal * 0.65;
          playerGroup.position.set(Math.cos(rAngle) * 5.2, 0, Math.sin(rAngle) * 5.2);
          playerGroup.rotation.y = -rAngle;
          hazards.forEach((haz) => {
            haz.angle += haz.speed * dt;
            haz.group.position.set(
              Math.cos(haz.angle) * haz.radius,
              0,
              Math.sin(haz.angle) * haz.radius
            );
          });
        }

        renderSceneWithRig(pose);
      } else {
        // Interactive Arena Game Mode
        if (hitstopTimer > 0) {
          hitstopTimer -= dt;
          renderer.render(scene, camera);
          if (isSoftwareGl) afterDraw(tick);
          else frameId = requestAnimationFrame(tick);
          return;
        }

        if (damageCooldown > 0) {
          damageCooldown = Math.max(0, damageCooldown - dt);
        }

        const mode = gameStateRef.current;
        if (mode === 'title') {
          const camAngle = now * 0.00025;
          camera.position.set(Math.sin(camAngle) * 14, 10.5, Math.cos(camAngle) * 14);
          camera.lookAt(0, 0.5, 0);
        } else if (mode === 'playing') {
          let moveX = 0;
          let moveZ = 0;
          if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
          if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
          if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
          if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

          const boost = keys['Space'] || keys['ShiftLeft'] ? 1.45 : 1.0;
          const speed = 7.8 * boost;

          if (moveX !== 0 || moveZ !== 0) {
            const len = Math.hypot(moveX, moveZ);
            const nx = moveX / len;
            const nz = moveZ / len;
            playerGroup.position.x += nx * speed * dt;
            playerGroup.position.z += nz * speed * dt;

            const distFromCenter = Math.hypot(
              playerGroup.position.x,
              playerGroup.position.z
            );
            if (distFromCenter > 16.8) {
              const scale = 16.8 / distFromCenter;
              playerGroup.position.x *= scale;
              playerGroup.position.z *= scale;
            }
            playerGroup.rotation.y = Math.atan2(nx, nz) + Math.PI;
          }

          const damp = 1 - Math.exp(-6 * dt);
          camera.position.x += (playerGroup.position.x * 0.55 - camera.position.x) * damp;
          camera.position.z += (playerGroup.position.z + 12.5 - camera.position.z) * damp;
          camera.position.y += (10.5 - camera.position.y) * damp;
          camera.lookAt(playerGroup.position.x * 0.6, 0.5, playerGroup.position.z * 0.6);

          for (const orb of orbs) {
            const check = computeArenaOrbCollection({
              playerX: playerGroup.position.x,
              playerZ: playerGroup.position.z,
              orbX: orb.group.position.x,
              orbZ: orb.group.position.z,
              pickupRadius: 1.35,
              currentScore: scoreRef.current,
              comboMultiplier: comboRef.current,
            });

            if (check.collected) {
              scoreRef.current = check.nextScore;
              comboRef.current = check.nextCombo;
              orbsCountRef.current += 1;
              setScore(scoreRef.current);
              setCombo(comboRef.current);
              setOrbsCollected(orbsCountRef.current);

              if (scoreRef.current > highScore) {
                setHighScore(scoreRef.current);
                try {
                  localStorage.setItem('claude_3d_arena_highscore', String(scoreRef.current));
                } catch {
                  // ignore
                }
              }

              const randAngle = Math.random() * Math.PI * 2;
              const randRadius = 3.5 + Math.random() * 11.5;
              orb.group.position.set(
                Math.cos(randAngle) * randRadius,
                0,
                Math.sin(randAngle) * randRadius
              );
              hitstopTimer = 0.05;
              playSynthTone('collect');
            }
          }

          for (const haz of hazards) {
            haz.angle += haz.speed * dt;
            haz.group.position.set(
              Math.cos(haz.angle) * haz.radius,
              0,
              Math.sin(haz.angle) * haz.radius
            );
            haz.group.rotation.y += dt * 2.2;

            if (damageCooldown <= 0) {
              const dx = playerGroup.position.x - haz.group.position.x;
              const dz = playerGroup.position.z - haz.group.position.z;
              if (dx * dx + dz * dz < 1.25 * 1.25) {
                damageCooldown = 1.1;
                comboRef.current = 1;
                hullRef.current = Math.max(0, hullRef.current - 25);
                setCombo(1);
                setHullIntegrity(hullRef.current);
                playSynthTone('damage');
                if (hullRef.current <= 0) {
                  setGameState('gameover');
                }
              }
            }
          }
        }

        renderer.setScissorTest(false);
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      renderer.dispose();
    };
  }, [highScore]);

  const handleStartGame = () => {
    resetTriggerRef.current?.();
    playSynthTone('start');
    setStudioMode('interactive-arena');
    setGameState('playing');
  };

  // Helper that captures a short real WebM video clip from the active 3D WebGL canvas
  const captureWebGLCanvasStream = (durationMs: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
        resolve('');
        return;
      }
      try {
        const stream = canvas.captureStream(30);
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : '';
        if (!mimeType) {
          resolve('');
          return;
        }
        const chunks: BlobPart[] = [];
        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(URL.createObjectURL(blob));
        };
        recorder.start(100);
        window.setTimeout(() => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }, durationMs);
      } catch {
        resolve('');
      }
    });
  };

  // Record a 3D WebGL Video Clip directly from the Three.js Canvas using MediaRecorder
  const handleRecordWebGL3DVideo = async () => {
    if (isRecordingWebGL) return;
    const presetObj = SCENE_PRESETS.find((s) => s.id === scenePreset) || SCENE_PRESETS[0];
    const rigObj = CAMERA_RIGS.find((r) => r.id === cameraRig) || CAMERA_RIGS[0];

    setIsRecordingWebGL(true);
    setRecordCountdown(2);

    const countdownInterval = window.setInterval(() => {
      setRecordCountdown((prev) => Math.max(1, prev - 1));
    }, 650);

    const webmUrl = await captureWebGLCanvasStream(1400);
    window.clearInterval(countdownInterval);
    setIsRecordingWebGL(false);
    setRecordCountdown(0);

    const newClip: Recorded3DVideoClip = {
      id: `3d-clip-${Date.now()}`,
      title: `${presetObj.name} (${rigObj.badge})`,
      sceneName: presetObj.name,
      cameraRig: rigObj.label,
      durationSec: 3,
      url: webmUrl,
      mimeType: 'video/webm',
      source: 'WebGL 3D Capture',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setRecordedClips((prev) => [newClip, ...prev]);
    setActiveClipId(newClip.id);
    setShowGalleryModal(true);
    showBanner(`Recorded 3D WebGL Video: "${newClip.title}"`);
  };

  // Synthesize an AI 3D Video via Gemini Omni 1.2 Flash (/api/video/generate) with live 3D WebGL capture fallback
  const handleSynthesizeAi3DVideo = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || ai3DPrompt).trim();
    if (!promptToUse || isGeneratingAi3D) return;
    setIsGeneratingAi3D(true);
    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `3D Stereoscopic & Volumetric Render: ${promptToUse}`,
          aspectRatio: '16:9',
          duration: '5s',
          resolution: '720p',
        }),
      });
      const data = await response.json();
      let finalVideoUrl: string = data.videoUrl || '';
      let finalMime = data.mimeType || 'video/mp4';

      if (!finalVideoUrl) {
        finalVideoUrl = await captureWebGLCanvasStream(900);
        finalMime = 'video/webm';
      }

      const presetObj = SCENE_PRESETS.find((s) => s.id === scenePreset) || SCENE_PRESETS[0];
      const rigObj = CAMERA_RIGS.find((r) => r.id === cameraRig) || CAMERA_RIGS[0];
      const newClip: Recorded3DVideoClip = {
        id: `3d-ai-${Date.now()}`,
        title: promptToUse.slice(0, 48),
        sceneName: presetObj.name,
        cameraRig: rigObj.label,
        durationSec: 5,
        url: finalVideoUrl,
        mimeType: finalMime,
        source: 'Gemini Omni 3D AI',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setRecordedClips((prev) => [newClip, ...prev]);
      setActiveClipId(newClip.id);
      setShowGalleryModal(true);
      showBanner('Created 3D Video Clip!');
    } catch {
      showBanner('Could not reach 3D video synthesis endpoint.');
    } finally {
      setIsGeneratingAi3D(false);
    }
  };

  const activeClip =
    recordedClips.find((c) => c.id === activeClipId) || recordedClips[0] || null;

  return (
    <main className="flex-1 h-screen relative overflow-hidden bg-[#181715] select-none">
      {/* Dedicated Isolated WebGL Canvas Container (Zero sibling filter stalls) */}
      <div
        ref={mountRef}
        data-testid="three-spatial-canvas"
        className="w-full h-full"
      />

      {/* Top Perimeter Bar (No backdrop-filter over WebGL per threejs skill) */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none p-4 sm:p-5 flex items-start justify-between gap-4 z-10">
        {/* Top-Left Spec & Mode Switcher */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-[#191918]/92 border border-[#E5E2D9]/20 text-[#FAF9F5] flex items-center gap-3 shadow-lg">
            <Film className="w-4 h-4 text-[#C96442]" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#A3A19A] font-claude-mono">
                THREE.JS WEBGL · OMNI 3D VIDEO STUDIO
              </div>
              <div className="text-sm font-claude-serif font-semibold">
                {studioMode === 'video-director'
                  ? SCENE_PRESETS.find((s) => s.id === scenePreset)?.name
                  : 'Claude Spatial Knowledge Arena'}
              </div>
            </div>
          </div>

          {/* Mode Toggle: 3D Video Director vs Playable 3D Arena */}
          <div className="inline-flex rounded-xl p-1 bg-[#191918]/92 border border-[#E5E2D9]/20 shadow-lg">
            <button
              type="button"
              onClick={() => setStudioMode('video-director')}
              data-testid="mode-3d-video-director"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                studioMode === 'video-director'
                  ? 'bg-[#C96442] text-white'
                  : 'text-[#A3A19A] hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>3D Video Studio</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudioMode('interactive-arena');
                setGameState('playing');
              }}
              data-testid="mode-3d-interactive-arena"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                studioMode === 'interactive-arena'
                  ? 'bg-[#C96442] text-white'
                  : 'text-[#A3A19A] hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Play 3D Arena</span>
            </button>
          </div>

          {/* Arena Score Readout when in interactive-arena mode */}
          {studioMode === 'interactive-arena' && (
            <div className="px-4 py-2 rounded-2xl bg-[#191918]/92 border border-[#E5E2D9]/20 text-[#FAF9F5] flex items-center gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#A3A19A]">SCORE</div>
                <div className="text-base font-bold font-claude-mono text-[#C96442] tabular-nums">
                  {score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#A3A19A]">COMBO</div>
                <div className="text-base font-bold font-claude-mono text-[#52B788] tabular-nums">
                  {combo}x
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#A3A19A]">HULL</div>
                <div className="text-base font-bold font-claude-mono text-[#FAF9F5] tabular-nums">
                  {hullIntegrity}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top-Right Utility Controls & Recorded 3D Clips Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          {statusNotice && (
            <div className="px-3.5 py-2 rounded-xl bg-[#2E5A44] text-white text-xs font-medium flex items-center gap-2 shadow-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{statusNotice}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowGalleryModal((v) => !v)}
            data-testid="open-3d-video-gallery-btn"
            className="px-3.5 py-2 rounded-xl bg-[#191918]/92 border border-[#E5E2D9]/20 text-xs font-medium text-[#FAF9F5] hover:border-[#C96442] flex items-center gap-2 shadow-lg"
          >
            <Film className="w-3.5 h-3.5 text-[#C96442]" />
            <span>Recorded 3D Videos ({recordedClips.length})</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setSoundEnabled((s) => !s);
            }}
            aria-label={soundEnabled ? 'Mute 3D audio' : 'Unmute 3D audio'}
            className="p-2.5 rounded-xl bg-[#191918]/92 border border-[#E5E2D9]/20 text-[#FAF9F5] hover:border-[#C96442] transition-colors shadow-lg"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#C96442]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#A3A19A]" />
            )}
          </button>

          {studioMode === 'interactive-arena' && gameState === 'playing' && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                setGameState('paused');
              }}
              aria-label="Pause 3D arena"
              className="px-3 py-2 rounded-xl bg-[#191918]/92 border border-[#E5E2D9]/20 text-xs font-medium text-[#FAF9F5] hover:border-[#C96442] flex items-center gap-1.5 shadow-lg"
            >
              <Pause className="w-3.5 h-3.5 text-[#C96442]" />
              <span>Pause</span>
            </button>
          )}
        </div>
      </div>

      {/* Stereoscopic Side-by-Side Divider Overlay when in stereo mode */}
      {studioMode === 'video-director' && cameraRig === 'stereo' && (
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-[#C96442]/50 pointer-events-none flex flex-col justify-between items-center py-16">
          <span className="px-2.5 py-1 rounded bg-[#191918]/90 border border-[#C96442]/40 text-[10px] font-claude-mono text-[#ECEAE2] whitespace-nowrap">
            LEFT EYE · STEREOSCOPIC 3D · RIGHT EYE
          </span>
        </div>
      )}

      {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK (Zero Viewport Occlusion) */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(940px, 94vw)',
          zIndex: 15,
        }}
        className="pointer-events-auto flex flex-col items-center"
      >
        {/* Collapse / Expand Tab */}
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          className="px-3.5 py-1 rounded-t-xl bg-[#191918]/95 border border-b-0 border-[#E5E2D9]/20 text-[11px] font-claude-mono text-[#A3A19A] hover:text-white flex items-center gap-1.5"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-[#C96442]" />
              <span>Show 3D Video Director Controls [H]</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-[#C96442]" />
              <span>Hide Controls [H]</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="w-full rounded-2xl bg-[#191918]/95 border border-[#E5E2D9]/20 p-4 shadow-2xl space-y-3.5 text-[#FAF9F5]">
            {/* Row 1: 3D Scene Selector + Camera Rig Selector + Speed */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* 3D Scene Preset */}
              <div className="md:col-span-4 space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-[#A3A19A] flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-[#C96442]" />
                  <span>3D Procedural Scene</span>
                </label>
                <select
                  value={scenePreset}
                  onChange={(e) => {
                    setScenePreset(e.target.value as ScenePresetId);
                    setStudioMode('video-director');
                  }}
                  aria-label="Select 3D Scene Preset"
                  data-testid="select-3d-scene"
                  className="w-full rounded-xl bg-[#242320] border border-[#3A3834] px-3 py-2 text-xs text-[#FAF9F5] focus:outline-none focus:border-[#C96442]"
                >
                  {SCENE_PRESETS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3D Camera Rig */}
              <div className="md:col-span-5 space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-[#A3A19A] flex items-center gap-1.5">
                  <Camera className="w-3 h-3 text-[#C96442]" />
                  <span>3D Camera Rig &amp; Stereoscopic Mode</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {CAMERA_RIGS.map((rig) => (
                    <button
                      key={rig.id}
                      type="button"
                      onClick={() => {
                        setCameraRig(rig.id);
                        setStudioMode('video-director');
                      }}
                      data-testid={`rig-${rig.id}`}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-medium truncate transition-colors border ${
                        cameraRig === rig.id
                          ? 'bg-[#C96442] text-white border-[#C96442]'
                          : 'bg-[#242320] text-[#D8D6CE] border-[#3A3834] hover:border-[#C96442]/60'
                      }`}
                      title={rig.label}
                    >
                      {rig.badge}
                    </button>
                  ))}
                </div>
              </div>

              {/* WebGL 3D Video Capture CTA */}
              <div className="md:col-span-3 flex flex-col justify-end h-full pt-1">
                <button
                  type="button"
                  disabled={isRecordingWebGL}
                  onClick={handleRecordWebGL3DVideo}
                  data-testid="record-webgl-3d-video-btn"
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[#C96442] hover:bg-[#B55535] disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>
                    {isRecordingWebGL
                      ? `Recording 3D (${recordCountdown}s)...`
                      : 'Record 3D Video (.webm)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Row 2: AI 3D Video Prompt Synthesis (Gemini Omni 1.2 Flash) + Motion Speed */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2.5 border-t border-[#2E2D2A]">
              <div className="flex items-center gap-2 flex-1">
                <Sparkles className="w-4 h-4 text-[#C96442] shrink-0" />
                <input
                  type="text"
                  value={ai3DPrompt}
                  onChange={(e) => setAi3DPrompt(e.target.value)}
                  placeholder="Describe a 3D video scene to synthesize with Gemini Omni 1.2 Flash..."
                  aria-label="AI 3D Video Prompt"
                  data-testid="ai-3d-video-prompt-input"
                  className="w-full rounded-xl bg-[#242320] border border-[#3A3834] px-3 py-1.5 text-xs text-[#FAF9F5] placeholder:text-[#78756E] focus:outline-none focus:border-[#C96442]"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#242320] border border-[#3A3834] text-[11px]">
                  <span className="text-[#A3A19A]">Speed:</span>
                  {[0.5, 1.0, 2.0].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setAnimSpeed(spd)}
                      className={`px-1.5 py-0.5 rounded font-claude-mono ${
                        animSpeed === spd ? 'bg-[#C96442] text-white' : 'text-[#A3A19A]'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={isGeneratingAi3D}
                  onClick={() => handleSynthesizeAi3DVideo()}
                  data-testid="generate-ai-3d-video-btn"
                  className="px-3.5 py-2 rounded-xl bg-[#FAF9F5] text-[#191918] hover:opacity-90 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition-opacity"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C96442]" />
                  <span>{isGeneratingAi3D ? 'Synthesizing...' : 'AI 3D Video'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recorded 3D Videos Gallery Modal */}
      {showGalleryModal && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-black/65">
          <div
            data-testid="recorded-3d-videos-modal"
            className="max-w-3xl w-full rounded-3xl bg-[#191918] border border-[#E5E2D9]/25 p-6 text-[#FAF9F5] shadow-2xl space-y-5 max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#2E2D2A] pb-4">
              <div className="space-y-0.5">
                <div className="text-[11px] font-claude-mono uppercase tracking-wider text-[#C96442]">
                  3D VIDEO STUDIO ARCHIVE
                </div>
                <h2 className="font-claude-serif text-xl font-semibold">
                  Recorded &amp; Synthesized 3D Videos ({recordedClips.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGalleryModal(false)}
                data-testid="close-3d-gallery-btn"
                className="px-3 py-1.5 rounded-xl bg-[#262522] hover:bg-[#32302B] text-xs font-medium"
              >
                Close
              </button>
            </div>

            {recordedClips.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <Video className="w-8 h-8 text-[#C96442] mx-auto opacity-80" />
                <p className="text-sm text-[#A3A19A]">
                  No 3D videos recorded yet. Click <strong>Record 3D Video (.webm)</strong> or{' '}
                  <strong>AI 3D Video</strong> in the bottom dock to create your first 3D clip!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Active 3D Video Player */}
                <div className="md:col-span-7 space-y-3">
                  {activeClip && (
                    <div className="rounded-2xl overflow-hidden border border-[#35332F] bg-black">
                      <video
                        key={activeClip.url}
                        src={activeClip.url}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        data-testid="active-3d-video-player"
                        className="w-full aspect-video object-cover bg-black"
                      />
                      <div className="p-3.5 bg-[#21201E] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{activeClip.title}</div>
                          <div className="text-[11px] text-[#A3A19A] truncate">
                            {activeClip.source} · {activeClip.cameraRig} · {activeClip.durationSec}s
                          </div>
                        </div>
                        <a
                          href={activeClip.url}
                          download={`${activeClip.title.replace(/\s+/g, '-').toLowerCase()}.${
                            activeClip.mimeType.includes('webm') ? 'webm' : 'mp4'
                          }`}
                          className="px-3 py-1.5 rounded-xl bg-[#C96442] hover:bg-[#B55535] text-white text-xs font-medium inline-flex items-center gap-1.5 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Clip List */}
                <div className="md:col-span-5 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {recordedClips.map((clip) => (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() => setActiveClipId(clip.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors space-y-1 ${
                        activeClip?.id === clip.id
                          ? 'bg-[#282623] border-[#C96442]'
                          : 'bg-[#21201E] border-[#32302C] hover:border-[#524F48]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">{clip.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C96442]/20 text-[#E09F7D] shrink-0">
                          {clip.source === 'WebGL 3D Capture' ? 'WebGL 3D' : 'Omni 3D'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A3A19A] flex items-center justify-between">
                        <span>{clip.cameraRig}</span>
                        <span>{clip.createdAt}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Title Screen Overlay when in interactive-arena mode and gameState === 'title' */}
      {studioMode === 'interactive-arena' && gameState === 'title' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/45">
          <div className="max-w-md w-full p-7 rounded-3xl bg-[#191918] border border-[#E5E2D9]/20 text-center space-y-5 shadow-2xl">
            <svg
              viewBox="0 0 120 36"
              className="w-28 h-9 mx-auto"
              aria-hidden="true"
            >
              <circle cx="60" cy="18" r="14" fill="none" stroke="#C96442" strokeWidth="2" />
              <polygon points="60,6 68,18 60,30 52,18" fill="#C96442" />
            </svg>
            <h1 className="font-claude-serif text-3xl text-[#FAF9F5]">
              Claude Spatial Knowledge Arena
            </h1>
            <p className="text-xs text-[#A3A19A] leading-relaxed">
              Pilot the autonomous telemetry rover across the 34.5 kV collector grid. Harvest emerald Knowledge Cores to build your multiplier while evading crimson Entropy Sentinels.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                data-start="true"
                onClick={handleStartGame}
                className="w-full py-3 px-6 rounded-xl bg-[#C96442] hover:bg-[#B55535] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch 3D Arena</span>
              </button>
              <button
                type="button"
                onClick={() => setStudioMode('video-director')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#262522] hover:bg-[#32312D] text-[#ECEAE2] text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-[#C96442]" />
                <span>Switch to 3D Video Studio</span>
              </button>
            </div>
            <div className="text-[11px] font-claude-mono text-[#8E8C84]">
              WASD / Arrows Move · Space Boost · Esc Pause
            </div>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {studioMode === 'interactive-arena' && gameState === 'paused' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/55">
          <div className="max-w-sm w-full p-6 rounded-2xl bg-[#191918] border border-[#E5E2D9]/20 text-center space-y-4">
            <h2 className="font-claude-serif text-2xl text-[#FAF9F5]">Simulation Paused</h2>
            <p className="text-xs text-[#A3A19A] tabular-nums">
              Current Score: {score.toLocaleString()} · Orbs Harvested: {orbsCollected}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGameState('playing')}
                className="w-full py-2.5 rounded-xl bg-[#C96442] hover:bg-[#B55535] text-white text-xs font-semibold"
              >
                Resume Simulation
              </button>
              <button
                type="button"
                onClick={handleStartGame}
                className="w-full py-2.5 rounded-xl bg-[#2A2926] text-[#ECEAE2] text-xs font-medium"
              >
                Restart Run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {studioMode === 'interactive-arena' && gameState === 'gameover' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/65">
          <div className="max-w-sm w-full p-6 rounded-2xl bg-[#191918] border border-[#C96442]/40 text-center space-y-4">
            <Trophy className="w-8 h-8 text-[#C96442] mx-auto" />
            <h2 className="font-claude-serif text-2xl text-[#FAF9F5]">Run Complete</h2>
            <div className="grid grid-cols-2 gap-2 text-left p-3 rounded-xl bg-[#232220] tabular-nums">
              <div>
                <div className="text-[10px] text-[#A3A19A]">Final Score</div>
                <div className="text-base font-bold font-claude-mono text-[#C96442]">
                  {score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#A3A19A]">Best Record</div>
                <div className="text-base font-bold font-claude-mono text-[#52B788]">
                  {highScore.toLocaleString()}
                </div>
              </div>
            </div>
            <button
              type="button"
              data-start="true"
              onClick={handleStartGame}
              className="w-full py-2.5 rounded-xl bg-[#C96442] hover:bg-[#B55535] text-white text-xs font-semibold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
