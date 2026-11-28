import * as THREE from "three";

export type CameraViewId =
  | "showroom"
  | "front"
  | "rear"
  | "left"
  | "right"
  | "top"
  | "front-three-quarter"
  | "rear-three-quarter";

export type CameraViewDefinition = {
  id: CameraViewId;
  label: string;
  direction: [number, number, number];
};

export const CAMERA_VIEWS: CameraViewDefinition[] = [
  { id: "showroom", label: "Showroom", direction: [0.32, 0.34, 1] },
  { id: "front", label: "Front", direction: [0, 0.18, 1] },
  { id: "rear", label: "Rear", direction: [0, 0.18, -1] },
  { id: "left", label: "Left", direction: [-1, 0.16, 0] },
  { id: "right", label: "Right", direction: [1, 0.16, 0] },
  { id: "top", label: "Top", direction: [0.001, 1, 0.001] },
  { id: "front-three-quarter", label: "Front ¾", direction: [0.85, 0.3, 0.85] },
  { id: "rear-three-quarter", label: "Rear ¾", direction: [-0.85, 0.3, -0.85] },
];

export type VehicleFraming = {
  center: THREE.Vector3;
  size: THREE.Vector3;
  radius: number;
  distance: number;
};

export function computeVehicleFraming(bounds: THREE.Box3): VehicleFraming {
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z, 0.001) * 0.5;
  const distance = Math.max(3.2, radius * 3.4);
  return { center, size, radius, distance };
}

export function cameraPositionForView(
  framing: VehicleFraming,
  view: CameraViewId,
): THREE.Vector3 {
  const definition = CAMERA_VIEWS.find((candidate) => candidate.id === view) ?? CAMERA_VIEWS[0];
  const direction = new THREE.Vector3(...definition.direction).normalize();
  return framing.center.clone().addScaledVector(direction, framing.distance);
}

export function cameraTargetForView(framing: VehicleFraming): THREE.Vector3 {
  return framing.center.clone();
}

export function fitDistanceForFov(radius: number, fovDegrees: number, aspect: number): number {
  const vFov = (fovDegrees * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(aspect, 0.1));
  const limiting = Math.min(vFov, hFov);
  return Math.max(3.2, (radius / Math.sin(limiting / 2)) * 1.15);
}