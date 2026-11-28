export type ShowroomEnvironmentId =
  | "studio-dark"
  | "luxury-showroom"
  | "cyber-night"
  | "outdoor-daylight"
  | "minimal-white";

export type ShowroomEnvironment = {
  id: ShowroomEnvironmentId;
  label: string;
  background: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  ambient: number;
  ambientColor: string;
  hemisphereSky: string;
  hemisphereGround: string;
  hemisphereIntensity: number;
  keyIntensity: number;
  keyColor: string;
  rimIntensity: number;
  rimColor: string;
  floorColor: string;
  floorMetalness: number;
  floorRoughness: number;
  gridCell: string;
  gridSection: string;
  reflectionBackdrop: string;
  reflectionLight: string;
  exposure: number;
};

export const SHOWROOM_ENVIRONMENTS: ShowroomEnvironment[] = [
  {
    id: "studio-dark",
    label: "Studio Dark",
    background: "#0c1116",
    fog: "#0b1014",
    fogNear: 7.5,
    fogFar: 17,
    ambient: 0.75,
    ambientColor: "#dfe8eb",
    hemisphereSky: "#a9cfe4",
    hemisphereGround: "#0c1219",
    hemisphereIntensity: 0.5,
    keyIntensity: 95,
    keyColor: "#ffffff",
    rimIntensity: 45,
    rimColor: "#50b9d1",
    floorColor: "#101c25",
    floorMetalness: 0.78,
    floorRoughness: 0.36,
    gridCell: "#28343d",
    gridSection: "#435762",
    reflectionBackdrop: "#182731",
    reflectionLight: "#8cecff",
    exposure: 1.35,
  },
  {
    id: "luxury-showroom",
    label: "Luxury Showroom",
    background: "#14100c",
    fog: "#160f0a",
    fogNear: 8,
    fogFar: 18,
    ambient: 0.7,
    ambientColor: "#ffe9cf",
    hemisphereSky: "#ffe0b2",
    hemisphereGround: "#1a120a",
    hemisphereIntensity: 0.55,
    keyIntensity: 110,
    keyColor: "#ffe0b2",
    rimIntensity: 50,
    rimColor: "#ffbf7a",
    floorColor: "#1b140d",
    floorMetalness: 0.85,
    floorRoughness: 0.22,
    gridCell: "#3a2c1c",
    gridSection: "#5c4426",
    reflectionBackdrop: "#2a1d12",
    reflectionLight: "#ffe0b2",
    exposure: 1.4,
  },
  {
    id: "cyber-night",
    label: "Cyber Night",
    background: "#050a18",
    fog: "#060b1c",
    fogNear: 7,
    fogFar: 16,
    ambient: 0.55,
    ambientColor: "#bcd0ff",
    hemisphereSky: "#3a6bff",
    hemisphereGround: "#05060f",
    hemisphereIntensity: 0.45,
    keyIntensity: 80,
    keyColor: "#cfe0ff",
    rimIntensity: 70,
    rimColor: "#22e0ff",
    floorColor: "#0a1024",
    floorMetalness: 0.9,
    floorRoughness: 0.18,
    gridCell: "#16224a",
    gridSection: "#24407a",
    reflectionBackdrop: "#0a1330",
    reflectionLight: "#22e0ff",
    exposure: 1.3,
  },
  {
    id: "outdoor-daylight",
    label: "Outdoor Daylight",
    background: "#dae7f1",
    fog: "#dfeaf3",
    fogNear: 10,
    fogFar: 24,
    ambient: 0.9,
    ambientColor: "#f4f1e7",
    hemisphereSky: "#fcf2db",
    hemisphereGround: "#b8c4cc",
    hemisphereIntensity: 0.8,
    keyIntensity: 230,
    keyColor: "#fff5dc",
    rimIntensity: 70,
    rimColor: "#f7d7ac",
    floorColor: "#c2ccd4",
    floorMetalness: 0.2,
    floorRoughness: 0.7,
    gridCell: "#d2dfe7",
    gridSection: "#a8bdc1",
    reflectionBackdrop: "#9ba9b2",
    reflectionLight: "#fff5dc",
    exposure: 1.1,
  },
  {
    id: "minimal-white",
    label: "Minimal White",
    background: "#f2f4f6",
    fog: "#eef1f4",
    fogNear: 11,
    fogFar: 26,
    ambient: 1,
    ambientColor: "#ffffff",
    hemisphereSky: "#ffffff",
    hemisphereGround: "#d4d8dc",
    hemisphereIntensity: 0.9,
    keyIntensity: 160,
    keyColor: "#ffffff",
    rimIntensity: 40,
    rimColor: "#dfe8ee",
    floorColor: "#e6e9ec",
    floorMetalness: 0.1,
    floorRoughness: 0.8,
    gridCell: "#e2e6ea",
    gridSection: "#c8ced4",
    reflectionBackdrop: "#c8ccd0",
    reflectionLight: "#ffffff",
    exposure: 1.05,
  },
];

export function getShowroomEnvironment(id: ShowroomEnvironmentId): ShowroomEnvironment {
  return SHOWROOM_ENVIRONMENTS.find((environment) => environment.id === id) ?? SHOWROOM_ENVIRONMENTS[0];
}

export const DEFAULT_SHOWROOM_ENVIRONMENT: ShowroomEnvironmentId = "studio-dark";