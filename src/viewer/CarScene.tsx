import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Grid, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useStudioStore, type ComponentMaterialOverride, type Customization } from "../store/studio";
import {
  applyComponentRotation,
  setExplodedView,
  type VehicleComponent,
} from "../engine/components";
import { MaterialController } from "../engine/materialController";
import { applyPartPlacement } from "../engine/parts";
import {
  CAMERA_VIEWS,
  cameraPositionForView,
  cameraTargetForView,
  computeVehicleFraming,
  fitDistanceForFov,
  type CameraViewId,
  type VehicleFraming,
} from "./cameraSystem";
import {
  DEFAULT_SHOWROOM_ENVIRONMENT,
  getShowroomEnvironment,
  type ShowroomEnvironmentId,
} from "./showroomEnvironments";

const PART_FOCUS: Record<string, [number, number, number]> = {
  body: [0, 0.54, 0],
  hood: [0, 0.78, 1.02],
  roof: [0, 1.3, -0.15],
  "front-bumper": [0, 0.42, 2.02],
  "rear-bumper": [0, 0.42, -1.98],
  window: [0, 1.27, -0.12],
  "door-left": [-0.915, 0.67, -0.05],
  "door-right": [0.915, 0.67, -0.05],
  headlights: [0, 0.69, 1.93],
  spoiler: [0, 1.22, -1.72],
  exhaust: [0, 0.34, -2.04],
  "wheel-front-left": [-1.08, 0.46, 1.16],
  "wheel-front-right": [1.08, 0.46, 1.16],
  "wheel-rear-left": [-1.08, 0.46, -1.14],
  "wheel-rear-right": [1.08, 0.46, -1.14],
};

const QUALITY_SETTINGS = {
  low: { dpr: [1, 1.2] as [number, number], shadow: 768, exposure: 1.1, environmentResolution: 128 },
  medium: { dpr: [1, 1.35] as [number, number], shadow: 1024, exposure: 1.25, environmentResolution: 256 },
  high: { dpr: [1, 1.6] as [number, number], shadow: 1536, exposure: 1.35, environmentResolution: 256 },
  ultra: { dpr: [1, 2] as [number, number], shadow: 2048, exposure: 1.5, environmentResolution: 512 },
} as const;

type PartProps = {
  id: string;
  position: [number, number, number];
  explodeDirection?: [number, number, number];
  children: React.ReactNode;
};

function Part({ id, position, explodeDirection = [0, 0, 0], children }: PartProps) {
  const ref = useRef<THREE.Group>(null);
  const selected = useStudioStore((state) => state.selectedPart === id);
  const exploded = useStudioStore((state) => state.explode);
  const componentRotation = useStudioStore((state) => state.componentRotations[id]);
  const componentVisible = useStudioStore((state) => state.componentVisibility[id] !== false);
  const isolatedComponentId = useStudioStore((state) => state.isolatedComponentId);
  const replaced = useStudioStore((state) =>
    state.replacementParts.some((part) => part.installed && part.replacesComponentId === id),
  );
  const visible = componentVisible && (!isolatedComponentId || isolatedComponentId === id) && !replaced;
  const selectPart = useStudioStore((state) => state.setSelectedPart);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.position.set(
      position[0] + explodeDirection[0] * exploded,
      position[1] + explodeDirection[1] * exploded,
      position[2] + explodeDirection[2] * exploded,
    );
    ref.current.rotation.set(
      componentRotation?.[0] ?? 0,
      componentRotation?.[1] ?? 0,
      componentRotation?.[2] ?? 0,
    );
    const scale = selected ? 1.035 : 1;
    ref.current.scale.setScalar(THREE.MathUtils.damp(ref.current.scale.x, scale, 9, delta));
  });
  return (
    <group
      ref={ref}
      position={position}
      visible={visible}
      onPointerDown={(event) => {
        event.stopPropagation();
        selectPart(id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
      userData={{ partId: id }}
    >
      {children}
    </group>
  );
}

function Car({
  customization,
  componentMaterials,
}: {
  customization: Customization;
  componentMaterials: Record<string, { color: string; finish: "gloss" | "matte" | "metallic"; metallic?: number; roughness?: number; clearCoat?: number }>;
}) {
  const showWireframe = useStudioStore((state) => state.showWireframe);
  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: customization.paint,
        metalness: customization.finish === "metallic" ? 0.82 : 0.24,
        roughness: customization.finish === "matte" ? 0.82 : customization.finish === "gloss" ? 0.16 : 0.32,
        wireframe: showWireframe,
      }),
    [customization.paint, customization.finish, showWireframe],
  );
  const glassMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: customization.windowTint ? "#10252d" : "#91b5bd",
        metalness: 0.12,
        roughness: 0.08,
        transmission: customization.windowTint ? 0.05 : 0.32,
        transparent: true,
        opacity: 0.88,
        wireframe: showWireframe,
      }),
    [customization.windowTint, showWireframe],
  );
  const wheelMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: customization.wheelColor, metalness: 0.8, roughness: 0.27, wireframe: showWireframe }),
    [customization.wheelColor, showWireframe],
  );
  const tireMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#171b20", roughness: 0.9, wireframe: showWireframe }),
    [showWireframe],
  );
  const headlightMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d9f6ff", emissive: "#71d9ff", emissiveIntensity: 1.8, wireframe: showWireframe }),
    [showWireframe],
  );
  const componentMaterialMap = useMemo(() => {
    const result = new Map<string, THREE.Material>();
    for (const [id, override] of Object.entries(componentMaterials)) {
      const base = id === "window"
        ? glassMaterial
        : id.startsWith("wheel-")
          ? wheelMaterial
          : id === "headlights"
            ? headlightMaterial
            : id === "exhaust"
              ? wheelMaterial
              : bodyMaterial;
      const material = base.clone() as THREE.MeshStandardMaterial;
      material.color.set(override.color);
      if ("metalness" in material) {
        material.metalness = override.metallic ?? (override.finish === "metallic" ? 0.9 : 0.35);
      }
      if ("roughness" in material) {
        material.roughness =
          override.roughness ??
          (override.finish === "matte" ? 0.88 : override.finish === "gloss" ? 0.16 : 0.28);
      }
      if ("clearcoat" in material) material.clearcoat = override.clearCoat ?? 0.7;
      const emissiveOverride = (override as { emissive?: string }).emissive;
      if (emissiveOverride && "emissive" in material && material.emissive) {
        (material.emissive as THREE.Color).set(emissiveOverride);
      }
      const opacityOverride = (override as { opacity?: number }).opacity;
      if (opacityOverride !== undefined && "opacity" in material) {
        material.opacity = opacityOverride;
        material.transparent = opacityOverride < 1;
      }
      result.set(id, material);
    }
    return result;
  }, [bodyMaterial, componentMaterials, glassMaterial, headlightMaterial, wheelMaterial]);
  const materialForPart = (id: string, fallback: THREE.Material) =>
    componentMaterialMap.get(id) ?? fallback;

  useEffect(() => {
    return () => {
      for (const material of componentMaterialMap.values()) material.dispose();
      bodyMaterial.dispose();
      glassMaterial.dispose();
      wheelMaterial.dispose();
      tireMaterial.dispose();
      headlightMaterial.dispose();
    };
  }, [bodyMaterial, componentMaterialMap, glassMaterial, wheelMaterial, tireMaterial, headlightMaterial]);

  const wheelCoordinates: Array<[number, number, number, string]> = [
    [-1.08, 0.46, 1.16, "wheel-front-left"],
    [1.08, 0.46, 1.16, "wheel-front-right"],
    [-1.08, 0.46, -1.14, "wheel-rear-left"],
    [1.08, 0.46, -1.14, "wheel-rear-right"],
  ];

  return (
    <group>
      <Part id="body" position={[0, 0.54, 0]}>
        <mesh castShadow receiveShadow material={materialForPart("body", bodyMaterial)}>
          <boxGeometry args={[1.8, 0.62, 3.8]} />
        </mesh>
      </Part>
      <Part id="hood" position={[0, 0.78, 1.02]} explodeDirection={[0, 0.48, 0.5]}>
        <mesh castShadow material={materialForPart("hood", bodyMaterial)}>
          <boxGeometry args={[1.72, 0.18, 1.24]} />
        </mesh>
      </Part>
      <Part id="roof" position={[0, 1.3, -0.15]} explodeDirection={[0, 0.72, 0]}>
        <mesh castShadow material={materialForPart("roof", bodyMaterial)}>
          <boxGeometry args={[1.35, 0.56, 1.68]} />
        </mesh>
      </Part>
      <Part id="front-bumper" position={[0, 0.42, 2.02]} explodeDirection={[0, 0.06, 0.9]}>
        <mesh castShadow material={materialForPart("front-bumper", bodyMaterial)}>
          <boxGeometry args={customization.bumperStyle === "track" ? [1.92, 0.28, 0.28] : [1.88, 0.25, 0.22]} />
        </mesh>
        {customization.bumperStyle === "track" && (
          <mesh position={[0, -0.15, 0.08]} castShadow material={wheelMaterial}>
            <boxGeometry args={[1.92, 0.055, 0.4]} />
          </mesh>
        )}
      </Part>
      <Part id="rear-bumper" position={[0, 0.42, -1.98]} explodeDirection={[0, 0.06, -0.9]}>
        <mesh castShadow material={materialForPart("rear-bumper", bodyMaterial)}>
          <boxGeometry args={customization.bumperStyle === "track" ? [1.92, 0.28, 0.3] : [1.88, 0.25, 0.22]} />
        </mesh>
      </Part>
      <Part id="window" position={[0, 1.27, -0.12]} explodeDirection={[0, 0.46, 0]}>
        <mesh material={materialForPart("window", glassMaterial)}>
          <boxGeometry args={[1.23, 0.42, 1.56]} />
        </mesh>
      </Part>
      <Part id="door-left" position={[-0.915, 0.67, -0.05]} explodeDirection={[-0.44, 0.04, 0]}>
        <mesh castShadow material={materialForPart("door-left", bodyMaterial)}>
          <boxGeometry args={[0.08, 0.47, 1.48]} />
        </mesh>
      </Part>
      <Part id="door-right" position={[0.915, 0.67, -0.05]} explodeDirection={[0.44, 0.04, 0]}>
        <mesh castShadow material={materialForPart("door-right", bodyMaterial)}>
          <boxGeometry args={[0.08, 0.47, 1.48]} />
        </mesh>
      </Part>
      {wheelCoordinates.map(([x, y, z, id]) => (
        <Part key={id} id={id} position={[x, y, z]} explodeDirection={[x > 0 ? 0.55 : -0.55, -0.05, z > 0 ? 0.1 : -0.1]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow material={tireMaterial}>
            <cylinderGeometry args={[0.44, 0.44, 0.23, 32]} />
          </mesh>
          <group rotation={[0, 0, Math.PI / 2]}>
            <mesh material={materialForPart(id, wheelMaterial)}>
              <cylinderGeometry args={[0.28, 0.28, 0.245, 24]} />
            </mesh>
            {Array.from(
              { length: customization.wheelDesign === "turbine" ? 10 : 5 },
              (_, spoke) => {
              const spokeCount = customization.wheelDesign === "turbine" ? 10 : 5;
              const angle = (spoke / spokeCount) * Math.PI * 2;
              return (
                <mesh
                  key={spoke}
                  position={[Math.sin(angle) * 0.11, 0, Math.cos(angle) * 0.11]}
                  rotation={[0, angle, 0]}
                  material={materialForPart(id, wheelMaterial)}
                >
                  <boxGeometry args={customization.wheelDesign === "turbine" ? [0.045, 0.04, 0.23] : [0.075, 0.045, 0.25]} />
                </mesh>
              );
            })}
            <mesh material={tireMaterial}>
              <cylinderGeometry args={[0.095, 0.095, 0.255, 16]} />
            </mesh>
          </group>
        </Part>
      ))}
      <Part id="headlights" position={[0, 0.69, 1.93]}>
        <mesh material={materialForPart("headlights", headlightMaterial)}>
          <boxGeometry args={[1.24, 0.1, 0.08]} />
        </mesh>
      </Part>
      {customization.spoiler && (
        <Part id="spoiler" position={[0, 1.22, -1.72]} explodeDirection={[0, 0.32, -0.18]}>
          <mesh castShadow material={materialForPart("spoiler", bodyMaterial)}>
            <boxGeometry args={customization.spoilerStyle === "track" ? [1.68, 0.07, 0.34] : [1.42, 0.08, 0.28]} />
          </mesh>
          <mesh position={[-0.48, -0.13, 0]} material={materialForPart("spoiler", bodyMaterial)}>
            <boxGeometry args={[0.08, 0.22, 0.12]} />
          </mesh>
          <mesh position={[0.48, -0.13, 0]} material={materialForPart("spoiler", bodyMaterial)}>
            <boxGeometry args={[0.08, 0.22, 0.12]} />
          </mesh>
        </Part>
      )}
      <Part id="exhaust" position={[0, 0.34, -2.04]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materialForPart("exhaust", wheelMaterial)}>
          <cylinderGeometry args={[0.08, 0.08, 0.18, 16]} />
        </mesh>
      </Part>
    </group>
  );
}

function ImportedCar({
  root,
  components,
  customization,
  componentMaterials,
  showWireframe,
}: {
  root: THREE.Group;
  components: VehicleComponent[];
  customization: Customization;
  componentMaterials: Record<string, { color: string; finish: "gloss" | "matte" | "metallic" }>;
  showWireframe: boolean;
}) {
  const controller = useMemo(() => new MaterialController(root, components), [root, components]);
  useEffect(() => {
    controller.apply(customization, componentMaterials);
  }, [controller, customization, componentMaterials]);
  useEffect(() => {
    controller.setWireframe(showWireframe);
  }, [controller, showWireframe]);
  useEffect(() => {
    return () => {
      controller.dispose();
    };
  }, [controller, root]);
  return <primitive object={root} dispose={null} />;
}

function SelectionOutline({
  components,
  proceduralRoot,
  selectedPart,
}: {
  components: VehicleComponent[] | null;
  proceduralRoot: { current: THREE.Group | null };
  selectedPart: string;
}) {
  const { scene } = useThree();
  const helper = useMemo(
    () => new THREE.Box3Helper(new THREE.Box3(), new THREE.Color("#52e4ff")),
    [],
  );
  useEffect(() => {
    scene.add(helper);
    return () => {
      scene.remove(helper);
      helper.geometry.dispose();
      (helper.material as THREE.Material).dispose();
    };
  }, [helper, scene]);
  useFrame(() => {
    let target: THREE.Object3D | undefined;
    if (components) {
      target = components.find((item) => item.id === selectedPart)?.object;
    } else {
      proceduralRoot.current?.traverse((object) => {
        if (!target && object.userData.partId === selectedPart) target = object;
      });
    }
    helper.visible = Boolean(target?.visible);
    if (target?.visible) {
      helper.box.setFromObject(target);
      helper.updateMatrixWorld(true);
    }
  });
  return null;
}

function ReplacementPartsLayer({ groupRef }: { groupRef: { current: THREE.Group | null } }) {
  const parts = useStudioStore((state) => state.replacementParts);
  const previewPartId = useStudioStore((state) => state.previewPartId);
  const components = useStudioStore((state) => state.vehicleComponents);
  const targetById = useMemo(
    () => new Map(components.map((component) => [component.id, component])),
    [components],
  );
  const center = useMemo(() => new THREE.Vector3(), []);
  const box = useMemo(() => new THREE.Box3(), []);
  const visibleParts = parts.filter(
    (part) => part.object && (part.installed || part.id === previewPartId),
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    group.updateMatrixWorld(true);
    for (const part of visibleParts) {
      const object = part.object;
      if (!object) continue;
      const target = part.replacesComponentId ? targetById.get(part.replacesComponentId) : undefined;
      if (target) {
        box.setFromObject(target.object);
        if (!box.isEmpty()) {
          box.getCenter(center);
          group.worldToLocal(center);
        } else {
          center.set(0, 0.6, 0);
        }
      } else if (part.replacesComponentId && PART_FOCUS[part.replacesComponentId]) {
        center.set(...PART_FOCUS[part.replacesComponentId]);
      } else {
        center.set(0, 0.6, 0);
      }
      applyPartPlacement(object, part.transform, center, part.attachment?.position);
      object.visible = true;
      object.updateMatrixWorld(true);
    }
  });

  return (
    <>
      {visibleParts.map((part) =>
        part.object ? <primitive key={part.id} object={part.object} dispose={null} /> : null,
      )}
    </>
  );
}

function StudioStage() {
  const group = useRef<THREE.Group>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const focusTarget = useRef(new THREE.Vector3());
  const previousTarget = useRef(new THREE.Vector3(0, 0.72, 0));
  const targetDelta = useRef(new THREE.Vector3());
  const cameraOffset = useRef(new THREE.Vector3());
  const previousZoom = useRef(1);
  const previousFocusPart = useRef("");
  const framingRef = useRef<VehicleFraming | null>(null);
  const lastFramingRef = useRef<VehicleFraming | null>(null);
  const appliedViewNonce = useRef(-1);
  const { camera, scene, gl, size } = useThree();
  const bindRaycast = useStudioStore((state) => state.bindRaycast);
  const vehicleRoot = useStudioStore((state) => state.vehicleRoot);
  const vehicleComponents = useStudioStore((state) => state.vehicleComponents);
  const selectedPart = useStudioStore((state) => state.selectedPart);
  const customization = useStudioStore((state) => state.customization);
  const componentMaterials = useStudioStore((state) => state.componentMaterials);
  const aiPreview = useStudioStore((state) => state.aiPreview);
  const showWireframe = useStudioStore((state) => state.showWireframe);
  const cameraView = useStudioStore((state) => state.cameraView);
  const cameraViewNonce = useStudioStore((state) => state.cameraViewNonce);
  const autoRotate = useStudioStore((state) => state.autoRotate);
  const presentationMode = useStudioStore((state) => state.presentationMode);
  const showroomId = (customization.showroomEnvironment as ShowroomEnvironmentId | undefined) ?? DEFAULT_SHOWROOM_ENVIRONMENT;
  const environment = getShowroomEnvironment(showroomId);
  const previewCustomization = useMemo(
    () => ({ ...customization, ...aiPreview?.customization }),
    [aiPreview, customization],
  );
  const previewComponentMaterials = useMemo(() => {
    const result: Record<string, ComponentMaterialOverride> = { ...componentMaterials };
    for (const [id, patch] of Object.entries(aiPreview?.componentMaterials ?? {})) {
      const current = result[id] ?? {
        color: customization.paint,
        finish: customization.finish,
        metallic: customization.paintMetallic,
        roughness: customization.paintRoughness,
        clearCoat: customization.clearCoat,
      };
      result[id] = { ...current, ...patch };
    }
    return result;
  }, [aiPreview, componentMaterials, customization]);
  const qualitySettings = QUALITY_SETTINGS[customization.quality];

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    bindRaycast((x, y) => {
      raycaster.setFromCamera(
        new THREE.Vector2((1 - x) * 2 - 1, -(y * 2 - 1)),
        camera,
      );
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        let object: THREE.Object3D | null = hit.object;
        while (object) {
          const id = object.userData.gd3dComponentId ?? object.userData.partId;
          if (typeof id === "string") {
            const component = vehicleComponents.find((candidate) => candidate.id === id);
            if (component?.inspectable !== false) return id;
          }
          object = object.parent;
        }
      }
      return "";
    });
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = useStudioStore.getState().zoom;
      useStudioStore.getState().setZoom(current * (event.deltaY < 0 ? 1.08 : 0.92));
    };
    gl.domElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      gl.domElement.removeEventListener("wheel", handleWheel);
    };
  }, [bindRaycast, camera, gl, scene, vehicleComponents]);

  useEffect(() => {
    if (cameraViewNonce === appliedViewNonce.current) return;
    appliedViewNonce.current = cameraViewNonce;
    const framing = framingRef.current;
    if (!framing || !controls.current) return;
    const view = (CAMERA_VIEWS.some((candidate) => candidate.id === cameraView) ? cameraView : "showroom") as CameraViewId;
    const position = cameraPositionForView(framing, view);
    camera.position.copy(position);
    controls.current.target.copy(cameraTargetForView(framing));
    controls.current.update();
    const state = useStudioStore.getState();
    state.setZoom(1);
  }, [cameraViewNonce, cameraView, camera]);

  useFrame((_, delta) => {
    const state = useStudioStore.getState();
    const { rotation, zoom, explode, componentRotations, componentVisibility, isolatedComponentId, replacementParts } = state;
    if (group.current) {
      if (autoRotate && presentationMode === "presentation") {
        group.current.rotation.y += delta * 0.25;
      } else {
        group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, rotation[0], 5, delta);
        group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, rotation[1], 5, delta);
      }
    }
    if (!controls.current) return;
    let activeComponent: VehicleComponent | undefined;
    if (vehicleRoot) {
      setExplodedView(vehicleComponents, explode);
      for (const component of vehicleComponents) {
        applyComponentRotation(component, componentRotations[component.id] ?? [0, 0, 0]);
        const replaced = replacementParts.some(
          (part) => part.installed && part.replacesComponentId === component.id,
        );
        component.object.visible =
          componentVisibility[component.id] !== false &&
          (!isolatedComponentId || isolatedComponentId === component.id) &&
          !replaced;
      }
      group.current?.updateMatrixWorld(true);
      vehicleRoot.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(vehicleRoot);
      if (!bounds.isEmpty()) {
        const framing = computeVehicleFraming(bounds);
        const previous = lastFramingRef.current;
        lastFramingRef.current = framing;
        framingRef.current = framing;
        controls.current.maxDistance = Math.max(11, framing.distance * 1.8);
        const framingChanged =
          !previous ||
          Math.abs(previous.radius - framing.radius) > 0.01 ||
          previous.center.distanceToSquared(framing.center) > 0.0001;
        if (framingChanged && appliedViewNonce.current === state.cameraViewNonce) {
          const view = (CAMERA_VIEWS.some((candidate) => candidate.id === state.cameraView)
            ? state.cameraView
            : "showroom") as CameraViewId;
          camera.position.copy(cameraPositionForView(framing, view));
          controls.current.target.copy(cameraTargetForView(framing));
          controls.current.update();
        }
      }
      activeComponent = vehicleComponents.find((component) => component.id === selectedPart);
      if (activeComponent) {
        focusTarget.current.copy(activeComponent.focusPoint);
        if (group.current) focusTarget.current.applyMatrix4(group.current.matrixWorld);
      } else if (framingRef.current) {
        focusTarget.current.copy(framingRef.current.center);
        if (group.current) focusTarget.current.applyMatrix4(group.current.matrixWorld);
      } else {
        focusTarget.current.copy(new THREE.Box3().setFromObject(vehicleRoot).getCenter(new THREE.Vector3()));
      }
    } else {
      focusTarget.current.set(...(PART_FOCUS[selectedPart] ?? PART_FOCUS.body));
      if (group.current) focusTarget.current.applyMatrix4(group.current.matrixWorld);
      if (!framingRef.current) {
        framingRef.current = computeVehicleFraming(
          new THREE.Box3(new THREE.Vector3(-1.2, 0, -2.2), new THREE.Vector3(1.2, 1.6, 2.2)),
        );
      }
    }
    const target = controls.current.target;
    target.lerp(focusTarget.current, 1 - Math.exp(-delta * 5));
    targetDelta.current.copy(target).sub(previousTarget.current);
    camera.position.add(targetDelta.current);
    previousTarget.current.copy(target);
    cameraOffset.current.copy(camera.position).sub(target);
    const framing = framingRef.current;
    const fitDistance = framing
      ? fitDistanceForFov(framing.radius, (camera as THREE.PerspectiveCamera).fov ?? 36, size.width / Math.max(size.height, 1))
      : 7.4;
    const focusDistance = activeComponent?.cameraDistance ?? fitDistance;
    controls.current.minDistance = activeComponent ? Math.min(4.5, focusDistance * 0.7) : Math.max(3.2, fitDistance * 0.55);
    if (previousFocusPart.current !== selectedPart) {
      cameraOffset.current.setLength(focusDistance / zoom);
      previousFocusPart.current = selectedPart;
      previousZoom.current = zoom;
    } else if (previousZoom.current !== zoom) {
      cameraOffset.current.multiplyScalar(previousZoom.current / zoom);
      previousZoom.current = zoom;
    }
    camera.position.copy(target).add(cameraOffset.current);
  });

  const isDaylight = showroomId === "outdoor-daylight" || showroomId === "minimal-white";

  return (
    <>
      <color attach="background" args={[environment.background]} />
      <fog attach="fog" args={[environment.fog, environment.fogNear, environment.fogFar]} />
      <ambientLight intensity={environment.ambient} color={environment.ambientColor} />
      <hemisphereLight
        intensity={environment.hemisphereIntensity}
        args={[environment.hemisphereSky, environment.hemisphereGround, 1]}
      />
      <spotLight
        position={[4, 8, 5]}
        angle={0.42}
        penumbra={1}
        intensity={environment.keyIntensity}
        color={environment.keyColor}
        castShadow
        shadow-mapSize-width={qualitySettings.shadow}
        shadow-mapSize-height={qualitySettings.shadow}
      />
      <spotLight
        position={[-6, 4, -2]}
        angle={0.5}
        penumbra={1}
        intensity={environment.rimIntensity}
        color={environment.rimColor}
      />
      <pointLight position={[-3.4, 1.8, 2.8]} intensity={isDaylight ? 10 : 24} distance={9} color={environment.rimColor} />
      <pointLight position={[3.2, 2.2, -2.8]} intensity={isDaylight ? 8 : 18} distance={10} color="#84aaff" />
      <Environment
        key={showroomId}
        background={false}
        resolution={qualitySettings.environmentResolution}
        frames={1}
        environmentIntensity={0.8}
      >
        <mesh>
          <sphereGeometry args={[20, 32, 24]} />
          <meshBasicMaterial color={environment.reflectionBackdrop} side={THREE.BackSide} />
        </mesh>
        <mesh position={[0, 5, -8]}>
          <planeGeometry args={[8, 3.5]} />
          <meshBasicMaterial color={environment.reflectionLight} />
        </mesh>
        <mesh position={[0, 5, 8]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[8, 3.5]} />
          <meshBasicMaterial color={environment.reflectionLight} />
        </mesh>
        <mesh position={[-8, 5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[7, 3]} />
          <meshBasicMaterial color={environment.reflectionLight} />
        </mesh>
        <mesh position={[8, 5, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[7, 3]} />
          <meshBasicMaterial color={environment.reflectionLight} />
        </mesh>
        <mesh position={[0, 10, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshBasicMaterial color="#d8f6ff" />
        </mesh>
      </Environment>
      <Grid
        position={[0, -0.07, 0]}
        args={[24, 24]}
        cellColor={environment.gridCell}
        sectionColor={environment.gridSection}
        fadeDistance={16}
        fadeStrength={1.4}
        infiniteGrid
      />
      <mesh position={[0, -0.015, 0]} receiveShadow>
        <cylinderGeometry args={[3.22, 3.28, 0.08, 96]} />
        <meshStandardMaterial color={environment.floorColor} metalness={environment.floorMetalness} roughness={environment.floorRoughness} />
      </mesh>
      <mesh position={[0, 0.027, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.15, 0.014, 8, 128]} />
        <meshStandardMaterial color={isDaylight ? "#b8c4cc" : "#55e4f6"} emissive={isDaylight ? "#9aa6ae" : "#2ecde9"} emissiveIntensity={isDaylight ? 0.1 : 0.55} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.027, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.28, 0.006, 6, 128]} />
        <meshStandardMaterial color={isDaylight ? "#c8ced4" : "#7abfff"} emissive={isDaylight ? "#b0b8be" : "#3999ee"} emissiveIntensity={isDaylight ? 0.06 : 0.28} toneMapped={false} />
      </mesh>
      <group ref={group}>
        <group
          onPointerDown={(event) => {
            let object: THREE.Object3D | null = event.object;
            while (object) {
              const id = object.userData.gd3dComponentId ?? object.userData.partId;
              if (typeof id === "string") {
                event.stopPropagation();
                useStudioStore.getState().setSelectedPart(id);
                break;
              }
              object = object.parent;
            }
          }}
        >
        {vehicleRoot ? (
          <ImportedCar
            key={vehicleRoot.uuid}
            root={vehicleRoot}
            components={vehicleComponents}
            customization={previewCustomization}
            componentMaterials={previewComponentMaterials}
            showWireframe={showWireframe}
          />
        ) : (
          <Car customization={previewCustomization} componentMaterials={previewComponentMaterials} />
        )}
        </group>
        <ReplacementPartsLayer groupRef={group} />
      </group>
      <SelectionOutline
        components={vehicleRoot ? vehicleComponents : null}
        proceduralRoot={group}
        selectedPart={selectedPart}
      />
      <ContactShadows position={[0, 0.03, 0]} opacity={isDaylight ? 0.3 : 0.42} scale={9} blur={2.8} far={3.5} />
      <OrbitControls
        ref={controls}
        target={[0, 0.72, 0]}
        enablePan={false}
        enableZoom={false}
        minDistance={4.5}
        maxDistance={11}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

export default function CarScene() {
  const quality = useStudioStore((state) => state.customization.quality);
  const qualitySettings = QUALITY_SETTINGS[quality];
  return (
    <Canvas
      shadows
      camera={{ position: [0, 2.25, 7.4], fov: 36 }}
      dpr={qualitySettings.dpr}
      gl={{ antialias: quality !== "low", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: qualitySettings.exposure, preserveDrawingBuffer: true }}
    >
      <StudioStage />
    </Canvas>
  );
}
