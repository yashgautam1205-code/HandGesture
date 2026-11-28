import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  CAMERA_VIEWS,
  cameraPositionForView,
  cameraTargetForView,
  computeVehicleFraming,
  fitDistanceForFov,
} from "./cameraSystem";
import {
  DEFAULT_SHOWROOM_ENVIRONMENT,
  SHOWROOM_ENVIRONMENTS,
  getShowroomEnvironment,
} from "./showroomEnvironments";

describe("camera system", () => {
  it("computes framing from a bounding box", () => {
    const bounds = new THREE.Box3(new THREE.Vector3(-1, 0, -2), new THREE.Vector3(1, 1.4, 2));
    const framing = computeVehicleFraming(bounds);
    expect(framing.center.x).toBeCloseTo(0);
    expect(framing.center.y).toBeCloseTo(0.7);
    expect(framing.size.z).toBeCloseTo(4);
    expect(framing.radius).toBeCloseTo(2);
    expect(framing.distance).toBeGreaterThan(3.2);
  });

  it("adapts framing distance to model size", () => {
    const small = computeVehicleFraming(new THREE.Box3(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 0.5, 0.5)));
    const large = computeVehicleFraming(new THREE.Box3(new THREE.Vector3(-3, 0, -6), new THREE.Vector3(3, 2, 6)));
    expect(large.distance).toBeGreaterThan(small.distance);
    expect(large.radius).toBeGreaterThan(small.radius);
  });

  it("returns a camera position offset from the target for every view", () => {
    const framing = computeVehicleFraming(new THREE.Box3(new THREE.Vector3(-1, 0, -2), new THREE.Vector3(1, 1.4, 2)));
    for (const view of CAMERA_VIEWS) {
      const position = cameraPositionForView(framing, view.id);
      const target = cameraTargetForView(framing);
      expect(position.distanceTo(target)).toBeCloseTo(framing.distance, 3);
    }
  });

  it("places the front camera on the +Z side and rear on -Z", () => {
    const framing = computeVehicleFraming(new THREE.Box3(new THREE.Vector3(-1, 0, -2), new THREE.Vector3(1, 1.4, 2)));
    const front = cameraPositionForView(framing, "front");
    const rear = cameraPositionForView(framing, "rear");
    expect(front.z).toBeGreaterThan(framing.center.z);
    expect(rear.z).toBeLessThan(framing.center.z);
  });

  it("computes a fit distance that grows with radius and shrinks with fov", () => {
    const near = fitDistanceForFov(2, 36, 1.6);
    const far = fitDistanceForFov(4, 36, 1.6);
    const wideFov = fitDistanceForFov(2, 60, 1.6);
    expect(far).toBeGreaterThan(near);
    expect(wideFov).toBeLessThan(near);
    expect(near).toBeGreaterThanOrEqual(3.2);
  });
});

describe("showroom environments", () => {
  it("provides five distinct presets", () => {
    expect(SHOWROOM_ENVIRONMENTS).toHaveLength(5);
    const ids = new Set(SHOWROOM_ENVIRONMENTS.map((environment) => environment.id));
    expect(ids.size).toBe(5);
  });

  it("falls back to the default environment for unknown ids", () => {
    expect(getShowroomEnvironment("does-not-exist" as never).id).toBe(DEFAULT_SHOWROOM_ENVIRONMENT);
  });

  it("defines complete lighting parameters for each preset", () => {
    for (const environment of SHOWROOM_ENVIRONMENTS) {
      expect(environment.background).toMatch(/^#/);
      expect(environment.keyIntensity).toBeGreaterThan(0);
      expect(environment.floorColor).toMatch(/^#/);
      expect(environment.exposure).toBeGreaterThan(0);
    }
  });
});