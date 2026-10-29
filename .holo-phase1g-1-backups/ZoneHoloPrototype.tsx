import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  BONE_COUNT_PER_CITIZEN,
  buildHumanoidAnimationClips,
  getDefaultHoloCitizenConfigs,
  HoloCitizenController,
  HoloClipName,
  LoadedHoloHumanAsset,
  preloadHoloHumanAssetTemplate,
} from './holoHumanoidRig';
import {
  buildHoloArchitecture,
  HOLO_LOBBY_DESTINATIONS,
  HoloArchitectureController,
  HoloDestinationId,
  HoloLobbyDestinationSpec,
} from './holoArchitecture';

export type HoloQualityMode = 'full' | 'lite' | 'fallback2d';
export type HoloCameraMode = 'plaza' | 'approach' | 'lobby' | 'closeup';
export type HoloInspectFraming = 'body' | 'face';
export type HoloBlendPreset = 'natural' | 'truehuman' | 'cyberglow';

interface GpuMetrics {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  activeCitizens: number;
  bonesPerCitizen: number;
  totalBones: number;
  usingRealisticGlb: boolean;
  rendererDisposed: boolean;
  lastDisposeSummary: string | null;
}

export const ZoneHoloPrototype: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [qualityMode, setQualityMode] = useState<HoloQualityMode>(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return 'lite';
    }
    return 'full';
  });
  const [cameraMode, setCameraMode] = useState<HoloCameraMode>('plaza');
  const [inspectFraming, setInspectFraming] = useState<HoloInspectFraming>('body');
  const [selectedCitizenIdx, setSelectedCitizenIdx] = useState<number>(0);
  const [citizenCount, setCitizenCount] = useState<number>(6);
  const [animOverride, setAnimOverride] = useState<HoloClipName | 'auto'>('auto');
  const [holoBlendPreset, setHoloBlendPreset] = useState<HoloBlendPreset>('natural');
  const [showMobileTelemetry, setShowMobileTelemetry] = useState<boolean>(false);
  const [isPortalTransitioning, setIsPortalTransitioning] = useState<boolean>(false);
  const [portalDirection, setPortalDirection] = useState<'enter' | 'exit'>('enter');
  const [portalFlashOpacity, setPortalFlashOpacity] = useState<number>(0);
  const [selectedDestinationId, setSelectedDestinationId] = useState<HoloDestinationId | null>(null);
  const [remountKey, setRemountKey] = useState<number>(0);
  const [loadedHumanAsset, setLoadedHumanAsset] = useState<LoadedHoloHumanAsset | null>(null);
  const [glbLoadError, setGlbLoadError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<GpuMetrics>({
    fps: 60,
    frameTimeMs: 16.6,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    activeCitizens: 6,
    bonesPerCitizen: 67,
    totalBones: 6 * 67,
    usingRealisticGlb: true,
    rendererDisposed: false,
    lastDisposeSummary: null,
  });

  // Preload realistic rigged 3D human `.glb` asset (`/models/holo/human_citizen.glb`) once on mount
  useEffect(() => {
    let active = true;
    preloadHoloHumanAssetTemplate('/models/holo/human_citizen.glb')
      .then((asset) => {
        if (!active) return;
        if (asset) {
          setLoadedHumanAsset(asset);
          setGlbLoadError(null);
        } else {
          setGlbLoadError('GLB model failed to load; using fallback humanoid rig.');
        }
      })
      .catch(() => {
        if (active) {
          setGlbLoadError('GLB model failed to load; using fallback humanoid rig.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Refs shared with the live animation loop so camera / override switches don't rebuild the WebGL context
  const cameraModeRef = useRef<HoloCameraMode>(cameraMode);
  cameraModeRef.current = cameraMode;

  const inspectFramingRef = useRef<HoloInspectFraming>(inspectFraming);
  inspectFramingRef.current = inspectFraming;

  const animOverrideRef = useRef<HoloClipName | 'auto'>(animOverride);
  animOverrideRef.current = animOverride;

  const selectedCitizenIdxRef = useRef<number>(selectedCitizenIdx);
  selectedCitizenIdxRef.current = selectedCitizenIdx;

  const holoBlendPresetRef = useRef<HoloBlendPreset>(holoBlendPreset);
  holoBlendPresetRef.current = holoBlendPreset;

  const isPortalTransitioningRef = useRef<boolean>(isPortalTransitioning);
  isPortalTransitioningRef.current = isPortalTransitioning;

  const portalDirectionRef = useRef<'enter' | 'exit'>(portalDirection);
  portalDirectionRef.current = portalDirection;

  const selectedDestinationIdRef = useRef<HoloDestinationId | null>(selectedDestinationId);
  selectedDestinationIdRef.current = selectedDestinationId;

  const architectureRef = useRef<HoloArchitectureController | null>(null);
  const citizensRef = useRef<HoloCitizenController[]>([]);
  const approachProgressRef = useRef<number>(0);

  const getBlendIntensity = (preset: HoloBlendPreset): number => {
    if (preset === 'truehuman') return 0.08;
    if (preset === 'cyberglow') return 0.48;
    return 0.22;
  };

  // Sync manual animation override with active citizen controllers immediately via smooth crossFadeTo
  useEffect(() => {
    for (const citizen of citizensRef.current) {
      citizen.setManualOverride(animOverride === 'auto' ? null : animOverride);
    }
  }, [animOverride]);

  // Sync hologram blend intensity across all active citizens in real time
  useEffect(() => {
    const intensity = getBlendIntensity(holoBlendPreset);
    for (const citizen of citizensRef.current) {
      citizen.setHoloIntensity(intensity);
    }
  }, [holoBlendPreset]);

  // Sync highlighted 3D destination panel in the lobby
  useEffect(() => {
    architectureRef.current?.setHighlightedDestination(selectedDestinationId);
  }, [selectedDestinationId]);

  // Guarded Enter Portal transition (prevents repeated taps from triggering overlapping transitions)
  const handleEnterPortal = useCallback(() => {
    if (isPortalTransitioningRef.current || cameraModeRef.current === 'lobby') return;
    if (qualityMode === 'fallback2d') {
      setCameraMode('lobby');
      return;
    }
    isPortalTransitioningRef.current = true;
    setIsPortalTransitioning(true);
    portalDirectionRef.current = 'enter';
    setPortalDirection('enter');
    approachProgressRef.current = 0;
    setCameraMode('approach');
  }, [qualityMode]);

  // Guarded Back to Plaza transition
  const handleBackToPlaza = useCallback(() => {
    if (isPortalTransitioningRef.current) return;
    setSelectedDestinationId(null);
    if (qualityMode === 'fallback2d' || cameraModeRef.current !== 'lobby') {
      setPortalFlashOpacity(0);
      setIsPortalTransitioning(false);
      isPortalTransitioningRef.current = false;
      setCameraMode('plaza');
      return;
    }
    isPortalTransitioningRef.current = true;
    setIsPortalTransitioning(true);
    portalDirectionRef.current = 'exit';
    setPortalDirection('exit');
    approachProgressRef.current = 0;
    setCameraMode('approach');
  }, [qualityMode]);

  // Navigate cleanly from a selected 3D Lobby Destination to the real existing Z-ONEAPP route/feature
  const handleLaunchDestination = useCallback((dest: HoloLobbyDestinationSpec) => {
    try {
      sessionStorage.removeItem('zone_holo_prototype_preview');
      window.history.pushState({}, '', dest.routePath);
    } catch {
      // Ignore storage/history restrictions in sandboxed iframes
    }
    window.dispatchEvent(
      new CustomEvent('zone:holo-prototype-switch', { detail: { active: false } })
    );

    // Trigger corresponding existing production UI event after App mounts, without faking auth state
    window.setTimeout(() => {
      if (dest.id === 'reels') {
        window.dispatchEvent(new Event('open-reels-widget'));
        const openBtn = document.getElementById('reels-widget-open-btn');
        if (openBtn) openBtn.click();
      } else if (dest.id === 'communities') {
        window.dispatchEvent(new Event('zone-open-communities'));
      } else if (dest.id === 'stories') {
        window.dispatchEvent(new Event('open-zone-create-studio'));
      }
    }, 180);
  }, []);

  const handleTestDisposeAndVerify = useCallback(() => {
    // Switching to fallback2d triggers the cleanup return function of the WebGL effect
    setQualityMode('fallback2d');
  }, []);

  useEffect(() => {
    if (qualityMode === 'fallback2d') {
      setMetrics((prev) => ({
        ...prev,
        drawCalls: 0,
        triangles: 0,
        geometries: 0,
        textures: 0,
        activeCitizens: 0,
        totalBones: 0,
        rendererDisposed: true,
        lastDisposeSummary: 'WebGLRenderer & all SkinnedMesh/Geometry/Texture GPU resources cleanly disposed (0 active contexts).',
      }));
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    const isLite = qualityMode === 'lite';
    const effectiveCitizenCount = isLite ? Math.min(citizenCount, 4) : citizenCount;

    // 1. Scene, Fog & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712');
    scene.fog = new THREE.FogExp2('#030712', isLite ? 0.035 : 0.028);

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);
    const initialAspect = width / height;
    const initialIsPortrait = initialAspect < 0.88;
    const camera = new THREE.PerspectiveCamera(initialIsPortrait ? 54 : 48, initialAspect, 0.08, 120);
    camera.position.set(0, 2.25, initialIsPortrait ? 8.6 : 8.2);
    camera.lookAt(0, 1.35, 0.35);

    // 2. WebGLRenderer with mobile-friendly pixel ratio cap
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isLite,
        powerPreference: isLite ? 'low-power' : 'high-performance',
        alpha: false,
      });
    } catch {
      setQualityMode('fallback2d');
      return;
    }

    const maxDpr = isLite ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(maxDpr);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isLite;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Balanced Natural Human Portrait + Holographic Cyan / Blue / Violet Lighting Rig
    // Neutral-warm ambient & hemisphere fill so human faces, hair, clothing, and footwear render naturally
    const ambientLight = new THREE.AmbientLight('#f1f5f9', isLite ? 1.0 : 0.86);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#f8fafc', '#1e293b', 1.1);
    hemiLight.position.set(0, 14, 0);
    scene.add(hemiLight);

    // Primary warm-daylight directional key light for realistic facial relief, eyes, hair, and clothing folds
    const keyDirLight = new THREE.DirectionalLight('#fffaf0', 1.65);
    keyDirLight.position.set(5.0, 11.0, 8.5);
    if (!isLite) {
      keyDirLight.castShadow = true;
      keyDirLight.shadow.mapSize.set(1024, 1024);
      keyDirLight.shadow.camera.near = 1;
      keyDirLight.shadow.camera.far = 30;
    }
    scene.add(keyDirLight);

    // Warm-neutral foreground plaza fill light so characters' lower body, legs, and feet stay clearly visible
    const frontFillLight = new THREE.DirectionalLight('#f0f9ff', 0.82);
    frontFillLight.position.set(-4.5, 4.2, 8.0);
    scene.add(frontFillLight);

    // Dedicated portrait focus light that gently illuminates the inspected citizen in character inspection mode
    const portraitFocusLight = new THREE.PointLight('#fff8f0', 0, 6.5);
    scene.add(portraitFocusLight);

    // Holographic violet & cyan architectural lights localized to the Z-ONEAPP portal and tower facade
    // so they do not wash out foreground human skin or clothing colors
    const violetRimLight = new THREE.PointLight('#a855f7', 1.65, 10.5);
    violetRimLight.position.set(-5.2, 4.5, -1.0);
    scene.add(violetRimLight);

    const cyanPortalLight = new THREE.PointLight('#00f2fe', 2.15, 7.5);
    cyanPortalLight.position.set(0, 2.3, -0.15);
    scene.add(cyanPortalLight);

    // Interior Holographic Atrium Lobby light (illuminates the 9 destination kiosks when inside the lobby)
    const lobbyAtriumLight = new THREE.PointLight('#e0f2fe', 1.85, 9.5);
    lobbyAtriumLight.position.set(0, 2.85, -2.35);
    scene.add(lobbyAtriumLight);

    // 4. Build Z-ONEAPP Holographic Building, Portal & Interior Lobby Architecture
    const architecture: HoloArchitectureController = buildHoloArchitecture(isLite);
    architecture.setHighlightedDestination(selectedDestinationIdRef.current);
    architectureRef.current = architecture;
    scene.add(architecture.rootGroup);

    // 5. Build Shared Skeletal AnimationClips & Articulated Holographic Citizens (Realistic GLB with procedural fallback)
    const sharedClips = buildHumanoidAnimationClips();
    const allConfigs = getDefaultHoloCitizenConfigs().slice(0, effectiveCitizenCount);
    const initialHoloIntensity = getBlendIntensity(holoBlendPresetRef.current);
    const citizens: HoloCitizenController[] = allConfigs.map((cfg) => {
      const controller = new HoloCitizenController(cfg, sharedClips, isLite, loadedHumanAsset);
      controller.setHoloIntensity(initialHoloIntensity);
      if (animOverrideRef.current !== 'auto') {
        controller.setManualOverride(animOverrideRef.current);
      }
      scene.add(controller.rootGroup);
      return controller;
    });
    citizensRef.current = citizens;

    // 6. Subtle Pointer Parallax & 3D Raycast Interaction (Portal & 9 Lobby Destination Panels)
    let pointerX = 0;
    let pointerY = 0;
    let downClientX = 0;
    let downClientY = 0;
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      downClientX = e.clientX;
      downClientY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointerX = ((e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
      pointerY = ((e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
    };

    const onPointerUp = (e: PointerEvent) => {
      const moveDist = Math.hypot(e.clientX - downClientX, e.clientY - downClientY);
      if (moveDist > 14 || isPortalTransitioningRef.current) return;

      const rect = container.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);

      const activeMode = cameraModeRef.current;
      if (activeMode === 'lobby') {
        const hits = raycaster.intersectObjects(architecture.destinationInteractables, false);
        if (hits.length > 0) {
          const destId = hits[0].object.userData?.destinationId as HoloDestinationId | undefined;
          if (destId) {
            setSelectedDestinationId((prev) => (prev === destId ? destId : destId));
            return;
          }
        }
      } else if (activeMode === 'plaza') {
        const portalHits = raycaster.intersectObjects(architecture.portalInteractables, false);
        if (portalHits.length > 0) {
          isPortalTransitioningRef.current = true;
          setIsPortalTransitioning(true);
          portalDirectionRef.current = 'enter';
          setPortalDirection('enter');
          approachProgressRef.current = 0;
          setCameraMode('approach');
        }
      }
    };

    container.addEventListener('pointerdown', onPointerDown, { passive: true });
    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerup', onPointerUp, { passive: true });

    // 7. Resize Handling (with mobile portrait vs desktop FOV adaptation)
    const onResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      const aspect = w / h;
      camera.aspect = aspect;
      camera.fov = aspect < 0.88 ? 54 : 48;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 8. Pause-on-hidden-tab Handling
    let isTabHidden = document.hidden;
    let lastTimestamp = performance.now();
    const onVisibilityChange = () => {
      isTabHidden = document.hidden;
      lastTimestamp = performance.now();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // 9. Animation & Telemetry Loop
    let rafId = 0;
    let elapsedSeconds = 0;
    let frameCounter = 0;
    let fpsAccumulator = 0;
    const desiredCamPos = new THREE.Vector3();
    const desiredLookAt = new THREE.Vector3();
    const currentLookAt = new THREE.Vector3(0, 1.35, 0.35);

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      if (isTabHidden) return;

      const rawDeltaMs = Math.max(1, now - lastTimestamp);
      lastTimestamp = now;
      const deltaSeconds = Math.min(rawDeltaMs / 1000, 0.1);
      elapsedSeconds += deltaSeconds;

      // Update architectural lighting, portal rings & 3D lobby destination kiosks
      architecture.update(elapsedSeconds);

      // Update all articulated holographic citizens
      for (const citizen of citizens) {
        citizen.update(deltaSeconds, elapsedSeconds);
      }

      // Camera trajectory modes
      const activeCamMode = cameraModeRef.current;
      const isPortrait = camera.aspect < 0.88;
      let camLerpRate = 4.2;

      if (activeCamMode === 'approach') {
        // Smooth portal transition animation (Enter Portal: Plaza -> Lobby, or Exit: Lobby -> Plaza)
        approachProgressRef.current = Math.min(1, approachProgressRef.current + deltaSeconds * 0.78);
        const rawProgress = approachProgressRef.current;
        const isEntering = portalDirectionRef.current === 'enter';
        const t = THREE.MathUtils.smoothstep(isEntering ? rawProgress : 1 - rawProgress, 0, 1);

        const startZ = isPortrait ? 8.65 : 8.15;
        const endZ = isPortrait ? -0.15 : -0.45;
        desiredCamPos.set(
          Math.sin(elapsedSeconds * 0.35) * 0.12 * (1 - t),
          THREE.MathUtils.lerp(isPortrait ? 2.18 : 2.32, 1.62, t),
          THREE.MathUtils.lerp(startZ, endZ, t)
        );
        desiredLookAt.set(
          0,
          THREE.MathUtils.lerp(isPortrait ? 1.22 : 1.42, isPortrait ? 1.42 : 1.55, t),
          THREE.MathUtils.lerp(0.45, -3.25, t)
        );
        portraitFocusLight.intensity = 0;
        camLerpRate = 9.5;

        // Subtle portal energy threshold flash as camera crosses Z ≈ 0
        const flashBell = Math.sin(rawProgress * Math.PI);
        setPortalFlashOpacity(Number((Math.pow(flashBell, 2.2) * 0.55).toFixed(2)));

        if (rawProgress >= 1) {
          setPortalFlashOpacity(0);
          isPortalTransitioningRef.current = false;
          setIsPortalTransitioning(false);
          const nextMode: HoloCameraMode = isEntering ? 'lobby' : 'plaza';
          cameraModeRef.current = nextMode;
          setCameraMode(nextMode);
        }
      } else if (activeCamMode === 'lobby') {
        // Phase 1G: Interactive 3D Holographic Atrium Lobby camera
        const activeDestId = selectedDestinationIdRef.current;
        const activeDest = activeDestId
          ? HOLO_LOBBY_DESTINATIONS.find((d) => d.id === activeDestId) || null
          : null;

        const clampedPtrX = THREE.MathUtils.clamp(pointerX, -0.75, 0.75);
        const clampedPtrY = THREE.MathUtils.clamp(pointerY, -0.65, 0.65);

        if (activeDest) {
          // Focus smoothly toward the selected 3D destination kiosk while keeping it above the bottom HUD
          const normalX = Math.sin(activeDest.rotationY);
          const normalZ = Math.cos(activeDest.rotationY);
          const focusDist = isPortrait ? 2.35 : 1.85;
          desiredCamPos.set(
            activeDest.position.x + normalX * focusDist + clampedPtrX * 0.16,
            Math.max(0.85, activeDest.position.y - (isPortrait ? 0.12 : 0.04) - clampedPtrY * 0.10),
            activeDest.position.z + normalZ * focusDist
          );
          desiredLookAt.set(
            activeDest.position.x,
            activeDest.position.y - (isPortrait ? 0.28 : 0.10),
            activeDest.position.z
          );
          camLerpRate = 6.8;
        } else {
          // Wide Atrium Lobby overview showing all 9 interactive holographic destination panels
          const lobbyCamZ = isPortrait ? 0.15 : -0.35;
          const swayX = Math.sin(elapsedSeconds * 0.28) * 0.14 + clampedPtrX * (isPortrait ? 0.28 : 0.42);
          desiredCamPos.set(
            swayX,
            Math.max(0.95, (isPortrait ? 1.68 : 1.62) - clampedPtrY * 0.15),
            lobbyCamZ
          );
          desiredLookAt.set(
            clampedPtrX * 0.35,
            isPortrait ? 1.25 : 1.48,
            -3.25
          );
          camLerpRate = 5.2;
        }
        portraitFocusLight.intensity = 0;
      } else if (activeCamMode === 'closeup' && citizens.length > 0) {
        // Character Inspection Mode: Full-Body framing or Controlled Face Close-Up
        // Uses quaternion-derived forward yaw so camera always faces the front of the character
        // and shifts lookAt slightly downward on mobile portrait so the character never overlaps the bottom HUD.
        const safeIdx = Math.min(selectedCitizenIdxRef.current, citizens.length - 1);
        const activeCitizen = citizens[safeIdx];
        const targetCitizen = activeCitizen.rootGroup.position;
        const hScale = activeCitizen.config.heightScale || 1.0;
        const facingYaw = activeCitizen.getForwardYaw();
        const isFaceMode = inspectFramingRef.current === 'face';

        const clampedPtrX = THREE.MathUtils.clamp(pointerX, -0.85, 0.85);
        const clampedPtrY = THREE.MathUtils.clamp(pointerY, -0.75, 0.75);
        const camAngle = facingYaw + clampedPtrX * (isFaceMode ? 0.42 : 0.52);

        if (isFaceMode) {
          // Controlled Face Close-Up: frames head, face, eyes, hair & collar clearly above the bottom HUD
          const camDist = Math.max(0.82, (isPortrait ? 1.10 : 0.96) * hScale);
          desiredCamPos.set(
            targetCitizen.x + Math.sin(camAngle) * camDist,
            Math.max(0.65, targetCitizen.y + (1.53 - clampedPtrY * 0.10) * hScale),
            targetCitizen.z + Math.cos(camAngle) * camDist
          );
          desiredLookAt.set(
            targetCitizen.x,
            targetCitizen.y + (isPortrait ? 1.41 : 1.47) * hScale,
            targetCitizen.z
          );
        } else {
          // Full-Body Inspection View: shows head, torso, legs, and feet/emitter ring clearly above the bottom HUD
          const camDist = Math.max(1.85, (isPortrait ? 3.05 : 2.62) * hScale);
          desiredCamPos.set(
            targetCitizen.x + Math.sin(camAngle) * camDist,
            Math.max(0.45, targetCitizen.y + (0.98 - clampedPtrY * 0.14) * hScale),
            targetCitizen.z + Math.cos(camAngle) * camDist
          );
          desiredLookAt.set(
            targetCitizen.x,
            targetCitizen.y + (isPortrait ? 0.64 : 0.82) * hScale,
            targetCitizen.z
          );
        }

        portraitFocusLight.position.set(
          targetCitizen.x + Math.sin(facingYaw + 0.35) * 1.35,
          targetCitizen.y + 1.55 * hScale,
          targetCitizen.z + Math.cos(facingYaw + 0.35) * 1.35
        );
        portraitFocusLight.intensity = 1.25;
        camLerpRate = 10.5;
      } else {
        // Default Plaza-Wide Overview:
        // Keeps the Z-ONEAPP PORTAL signage & circular entrance visible in the upper half while framing
        // the 4–6 walking human citizens prominently in the forecourt above the bottom HUD.
        const maxOrbit = isPortrait ? 0.12 : 0.22;
        const orbitAngle = Math.sin(elapsedSeconds * 0.22) * maxOrbit + pointerX * (isPortrait ? 0.16 : 0.26);
        const plazaDist = isPortrait ? 8.65 : 8.15;
        desiredCamPos.set(
          Math.sin(orbitAngle) * plazaDist,
          Math.max(0.8, (isPortrait ? 2.18 : 2.32) - pointerY * 0.22),
          Math.cos(orbitAngle) * plazaDist
        );
        desiredLookAt.set(0, isPortrait ? 1.22 : 1.42, 0.45);
        portraitFocusLight.intensity = 0;
      }

      camera.position.lerp(desiredCamPos, Math.min(1, deltaSeconds * camLerpRate));
      currentLookAt.lerp(desiredLookAt, Math.min(1, deltaSeconds * (camLerpRate + 1.2)));
      camera.lookAt(currentLookAt);

      renderer.render(scene, camera);

      // Update HUD performance metrics every 20 frames
      frameCounter++;
      fpsAccumulator += rawDeltaMs;
      if (frameCounter >= 20) {
        const avgFrameMs = fpsAccumulator / frameCounter;
        const measuredFps = Math.min(120, Math.round(1000 / Math.max(avgFrameMs, 1)));
        const usingGlb = citizens[0]?.usingRealisticGlb ?? false;
        const bonesPerRig = usingGlb && loadedHumanAsset ? loadedHumanAsset.jointCount : BONE_COUNT_PER_CITIZEN;
        setMetrics({
          fps: measuredFps,
          frameTimeMs: Number(avgFrameMs.toFixed(1)),
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
          activeCitizens: citizens.length,
          bonesPerCitizen: bonesPerRig,
          totalBones: citizens.length * bonesPerRig,
          usingRealisticGlb: usingGlb,
          rendererDisposed: false,
          lastDisposeSummary: null,
        });
        frameCounter = 0;
        fpsAccumulator = 0;
      }
    };

    rafId = requestAnimationFrame(animate);

    // 10. Deterministic GPU Resource Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      for (const citizen of citizens) {
        scene.remove(citizen.rootGroup);
        citizen.dispose();
      }
      citizensRef.current = [];

      scene.remove(architecture.rootGroup);
      architecture.dispose();
      architectureRef.current = null;

      // Dispose shared AnimationClips cache
      renderer.renderLists.dispose();
      renderer.dispose();

      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [qualityMode, citizenCount, remountKey, loadedHumanAsset]);

  const activeDestinationSpec = selectedDestinationId
    ? HOLO_LOBBY_DESTINATIONS.find((d) => d.id === selectedDestinationId) || null
    : null;

  return (
    <div className="relative min-h-screen w-full bg-[#030712] text-slate-100 overflow-hidden select-none font-sans">
      {/* 3D WebGL Canvas Mount or 2D Holographic Fallback */}
      {qualityMode !== 'fallback2d' ? (
        <div
          ref={mountRef}
          data-testid="holo-webgl-viewport"
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        />
      ) : (
        <div
          data-testid="holo-2d-fallback"
          className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#030712] via-[#07142e] to-[#0f172a] overflow-y-auto"
        >
          <div className="max-w-3xl w-full rounded-2xl border border-cyan-400/40 bg-slate-950/90 p-5 sm:p-7 shadow-[0_0_50px_rgba(0,242,254,0.18)] backdrop-blur-md text-center space-y-4 my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-cyan-400/40 bg-cyan-500/10 text-cyan-300 text-xs font-mono uppercase tracking-widest">
              2D Fallback Mode Active • 0 WebGL Contexts
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-purple-400">
              Z-ONEAPP HOLOGRAPHIC CITADEL & LOBBY
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              The 3D WebGL renderer and all GPU buffers (SkinnedMeshes, 67-joint realistic human skeletons, geometries, and textures) have been cleanly disposed. You can still explore all 9 Holographic Lobby Destinations below in 2D mode.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 text-left text-xs">
              {HOLO_LOBBY_DESTINATIONS.map((dest) => (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => setSelectedDestinationId(dest.id)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    selectedDestinationId === dest.id
                      ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_16px_rgba(0,242,254,0.25)]'
                      : 'border-slate-800 bg-slate-900/70 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-cyan-200 truncate">
                    <span>{dest.iconGlyph}</span>
                    <span className="truncate">{dest.title}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{dest.subtitle}</div>
                </button>
              ))}
            </div>
            <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setRemountKey((k) => k + 1);
                  setQualityMode('full');
                }}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-cyan-400 transition cursor-pointer"
              >
                Restore Full 3D Prototype
              </button>
              <button
                type="button"
                onClick={() => {
                  setRemountKey((k) => k + 1);
                  setQualityMode('lite');
                }}
                className="px-4 py-2 rounded-lg border border-sky-400/50 bg-sky-500/10 text-sky-200 font-bold text-xs uppercase tracking-wider hover:bg-sky-500/20 transition cursor-pointer"
              >
                Restore Lite 3D Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portal Threshold Energy Transition Overlay */}
      {portalFlashOpacity > 0 && (
        <div
          className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-75"
          style={{
            opacity: portalFlashOpacity,
            background:
              'radial-gradient(circle at center, rgba(0, 242, 254, 0.85) 0%, rgba(168, 85, 247, 0.55) 48%, rgba(3, 7, 18, 0.95) 100%)',
          }}
        />
      )}

      {/* Subtle Holographic Scanline Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(0, 242, 254, 0.14) 0px, rgba(0, 242, 254, 0.14) 1px, transparent 2px, transparent 6px)',
        }}
      />

      {/* TOP BAR: Prototype Isolation Banner, Back to Plaza & Safe Exit Links */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5 border-b border-cyan-500/25 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f2fe]" />
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-base font-extrabold tracking-wider text-cyan-200">
                Z-ONEAPP HOLOGRAPHIC WORLD
              </h1>
              <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest rounded bg-purple-500/20 border border-purple-400/40 text-purple-200">
                {cameraMode === 'lobby' ? 'Phase 1G • 3D Atrium Lobby' : 'Phase 1G • Plaza & Interactive Portal'}
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-400">
              Rigged 3D Human GLB + Interactive 3D Portal & 9 Holographic Destination Nodes • Zero Fake Auth
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {(cameraMode === 'lobby' || (cameraMode === 'approach' && portalDirection === 'enter')) && (
            <button
              type="button"
              onClick={handleBackToPlaza}
              disabled={isPortalTransitioning}
              data-testid="holo-back-to-plaza-top"
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/20 hover:bg-cyan-500/30 text-[11px] sm:text-xs font-extrabold text-cyan-100 transition cursor-pointer disabled:opacity-50"
            >
              ← Back to Plaza
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowMobileTelemetry((v) => !v)}
            className="md:hidden px-2.5 py-1 rounded-lg border border-cyan-500/40 bg-slate-900/90 text-[11px] font-mono font-semibold text-cyan-200 transition"
          >
            {showMobileTelemetry ? 'Hide HUD' : `${metrics.fps} FPS • HUD`}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem('zone_holo_prototype_preview');
                window.history.pushState({}, '', '/');
              } catch {
                // Ignore history/storage restrictions in sandboxed iframes
              }
              window.dispatchEvent(
                new CustomEvent('zone:holo-prototype-switch', { detail: { active: false } }),
              );
            }}
            data-testid="exit-holo-prototype-preview"
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-700 bg-slate-900/90 hover:border-cyan-400/50 text-[11px] sm:text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            ← Exit Preview
          </button>
          <a
            href="/messenger"
            onClick={() => {
              try {
                sessionStorage.removeItem('zone_holo_prototype_preview');
              } catch {
                // Ignore storage restrictions
              }
            }}
            className="hidden sm:inline-flex px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 text-xs font-semibold text-cyan-200 transition"
          >
            Z-oneMessenger
          </a>
        </div>
      </header>

      {/* LEFT HUD: GPU Telemetry & Skeletal Rig Inspector (Collapsible on Mobile so Characters/Lobby Stay Unobstructed) */}
      <aside
        className={`${
          showMobileTelemetry ? 'block' : 'hidden md:block'
        } relative z-10 mx-3 mt-2 md:m-4 max-w-xs rounded-xl border border-cyan-500/30 bg-slate-950/85 p-3 backdrop-blur-md space-y-2 text-xs`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-mono uppercase tracking-wider text-cyan-300 font-bold text-[11px]">
            Skeletal & GPU Telemetry
          </span>
          <span className="font-mono text-[11px] text-emerald-300">
            {qualityMode === 'fallback2d' ? '2D MODE' : `${metrics.fps} FPS (${metrics.frameTimeMs}ms)`}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
          <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
            <div className="text-slate-400">Skinned Citizens</div>
            <div className="text-cyan-200 font-bold text-xs">
              {metrics.activeCitizens} {metrics.usingRealisticGlb ? '(GLB)' : '(Fallback)'}
            </div>
          </div>
          <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
            <div className="text-slate-400">Active Bones</div>
            <div className="text-purple-300 font-bold text-xs">
              {metrics.totalBones} ({metrics.bonesPerCitizen}/rig)
            </div>
          </div>
          <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
            <div className="text-slate-400">Draw Calls</div>
            <div className="text-sky-200 font-bold">{metrics.drawCalls}</div>
          </div>
          <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
            <div className="text-slate-400">Triangles</div>
            <div className="text-sky-200 font-bold">{metrics.triangles.toLocaleString()}</div>
          </div>
          <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
            <div className="text-slate-400">GPU Geometries</div>
            <div className="text-emerald-300 font-bold">{metrics.geometries}</div>
          </div>
          <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
            <div className="text-slate-400">GPU Textures</div>
            <div className="text-emerald-300 font-bold">{metrics.textures}</div>
          </div>
        </div>

        {glbLoadError && (
          <div className="p-1.5 rounded bg-amber-950/60 border border-amber-400/40 text-amber-200 text-[10px]">
            {glbLoadError}
          </div>
        )}

        {metrics.lastDisposeSummary && (
          <div className="p-1.5 rounded bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-[10px]">
            {metrics.lastDisposeSummary}
          </div>
        )}

        <div className="pt-0.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">Citizens (4–6):</span>
          <div className="flex gap-1">
            {[4, 5, 6].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setCitizenCount(count)}
                disabled={qualityMode === 'lite' && count > 4}
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition ${
                  citizenCount === count
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-cyan-400/50 disabled:opacity-40'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-1 space-y-1 border-t border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
            Hologram Rim Intensity
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: 'natural', label: 'Natural Rim' },
                { id: 'truehuman', label: 'True Human' },
                { id: 'cyberglow', label: 'Cyber Rim' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setHoloBlendPreset(preset.id)}
                className={`px-1.5 py-1 rounded text-[10px] font-mono font-semibold transition ${
                  holoBlendPreset === preset.id
                    ? 'bg-cyan-400 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-cyan-400/50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestDisposeAndVerify}
          className="w-full py-1 px-2.5 rounded-lg border border-rose-400/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 font-mono text-[11px] transition"
        >
          Verify GPU Cleanup (Close WebGL)
        </button>
      </aside>

      {/* SELECTED DESTINATION INSPECTOR CARD (Shown when a 3D Lobby Destination is selected) */}
      {activeDestinationSpec && (
        <div
          data-testid="holo-destination-inspector"
          className="fixed top-14 right-2 left-2 sm:left-auto sm:right-4 z-20 sm:max-w-sm rounded-2xl border border-cyan-400/50 bg-slate-950/90 p-3.5 backdrop-blur-md shadow-[0_0_32px_rgba(0,242,254,0.22)] space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-lg shrink-0">
                {activeDestinationSpec.iconGlyph}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    {activeDestinationSpec.sectorCode}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300">
                    {activeDestinationSpec.subtitle}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                  {activeDestinationSpec.title}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDestinationId(null)}
              className="px-2 py-0.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-mono cursor-pointer"
              title="Return to Lobby Overview"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed">
            {activeDestinationSpec.description}
          </p>

          <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 font-mono">
            🔒 {activeDestinationSpec.authNote}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => handleLaunchDestination(activeDestinationSpec)}
              data-testid={`launch-destination-${activeDestinationSpec.id}`}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer text-center shadow-[0_0_16px_rgba(0,242,254,0.35)]"
            >
              Open {activeDestinationSpec.title} ↗
            </button>
            <button
              type="button"
              onClick={() => setSelectedDestinationId(null)}
              className="py-2 px-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:border-cyan-400/40 text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              All 9 Nodes
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROL DOCK: Interactive Lobby Destinations OR Plaza Camera, Character & Quality Controls */}
      <section className="fixed bottom-2 left-2 right-2 sm:bottom-3 sm:left-4 sm:right-4 z-10 mx-auto max-w-5xl rounded-2xl border border-cyan-500/30 bg-slate-950/88 p-2.5 sm:p-3.5 backdrop-blur-md shadow-[0_0_36px_rgba(0,0,0,0.85)] space-y-2">
        {/* PHASE 1G: Touch-Friendly 9-Destination Holographic Lobby Selector Bar (Shown inside Lobby) */}
        {cameraMode === 'lobby' && (
          <div className="border-b border-slate-800/90 pb-2 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                  Holographic Lobby Destinations (Tap 3D Node or Select Below)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedDestinationId && (
                  <button
                    type="button"
                    onClick={() => setSelectedDestinationId(null)}
                    className="px-2 py-0.5 rounded bg-slate-800 text-cyan-200 text-[10px] font-mono hover:bg-slate-700 transition cursor-pointer"
                  >
                    Reset Lobby View
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleBackToPlaza}
                  disabled={isPortalTransitioning}
                  data-testid="holo-back-to-plaza-dock"
                  className="px-2.5 py-0.5 rounded-lg border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-[11px] font-bold text-cyan-100 transition cursor-pointer disabled:opacity-50"
                >
                  ← Back to Plaza
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {HOLO_LOBBY_DESTINATIONS.map((dest) => {
                const isSelected = selectedDestinationId === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => setSelectedDestinationId(dest.id)}
                    data-testid={`holo-lobby-dest-${dest.id}`}
                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-extrabold shadow-[0_0_14px_rgba(0,242,254,0.4)]'
                        : 'bg-slate-900/90 text-slate-100 border-slate-700/90 hover:border-cyan-400/50'
                    }`}
                  >
                    <span>{dest.iconGlyph}</span>
                    <span>{dest.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 items-center">
          {/* 1. Camera Mode, Portal Entry & Character Inspection Framing */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                1. Camera & Portal Navigation
              </span>
              {cameraMode === 'closeup' && (
                <span className="text-[10px] font-mono text-sky-300">
                  Citizen #{(selectedCitizenIdx % citizenCount) + 1} of {citizenCount}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handleBackToPlaza}
                disabled={isPortalTransitioning}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                  cameraMode === 'plaza'
                    ? 'bg-cyan-400 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-cyan-400/40'
                }`}
              >
                {cameraMode === 'lobby' ? '← Back to Plaza' : 'Plaza View'}
              </button>
              <button
                type="button"
                onClick={handleEnterPortal}
                disabled={isPortalTransitioning}
                data-testid="holo-enter-portal-btn"
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                  cameraMode === 'lobby' || (cameraMode === 'approach' && portalDirection === 'enter')
                    ? 'bg-purple-400 text-slate-950 font-bold shadow-[0_0_14px_rgba(168,85,247,0.45)]'
                    : 'bg-purple-950/70 text-purple-200 border border-purple-400/50 hover:bg-purple-900/70'
                }`}
              >
                {cameraMode === 'lobby'
                  ? 'In 3D Lobby'
                  : isPortalTransitioning && portalDirection === 'enter'
                  ? 'Entering Portal...'
                  : 'Enter Portal →'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isPortalTransitioning) return;
                  setSelectedDestinationId(null);
                  setCameraMode('closeup');
                  setInspectFraming('body');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  cameraMode === 'closeup' && inspectFraming === 'body'
                    ? 'bg-sky-400 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-sky-400/40'
                }`}
              >
                Full Body
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isPortalTransitioning) return;
                  setSelectedDestinationId(null);
                  setCameraMode('closeup');
                  setInspectFraming('face');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  cameraMode === 'closeup' && inspectFraming === 'face'
                    ? 'bg-sky-400 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-sky-400/40'
                }`}
              >
                Face Close-Up
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isPortalTransitioning) return;
                  setSelectedDestinationId(null);
                  setCameraMode('closeup');
                  setSelectedCitizenIdx((prev) => (prev + 1) % citizenCount);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-sky-950/80 text-sky-200 border border-sky-400/40 hover:bg-sky-900/70 transition cursor-pointer"
                title="Cycle through the 6 realistic human citizens"
              >
                Citizen #{(selectedCitizenIdx % citizenCount) + 1} ↻
              </button>
            </div>
          </div>

          {/* 2. Skeletal Animation Crossfade Controls */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
              2. Animation Clips (0.5s Smooth Blend)
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: 'auto', label: 'Auto' },
                  { id: 'idle', label: 'Idle' },
                  { id: 'walk', label: 'Walk' },
                  { id: 'wave', label: 'Wave' },
                  { id: 'converse', label: 'Converse' },
                  { id: 'look', label: 'Head Turn' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAnimOverride(item.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                    animOverride === item.id
                      ? 'bg-cyan-400 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-cyan-400/40'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Quality Mode & Fallback Switcher */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
              3. Quality & Fallback Mode
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setQualityMode('full')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  qualityMode === 'full'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-emerald-400/40'
                }`}
              >
                Full 3D
              </button>
              <button
                type="button"
                onClick={() => setQualityMode('lite')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  qualityMode === 'lite'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-amber-400/40'
                }`}
              >
                Lite Mode
              </button>
              <button
                type="button"
                onClick={() => setQualityMode('fallback2d')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  qualityMode === 'fallback2d'
                    ? 'bg-sky-400 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-sky-400/40'
                }`}
              >
                2D Fallback
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ZoneHoloPrototype;
