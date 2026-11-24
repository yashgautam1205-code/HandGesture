import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  applyPartPlacement,
  createPartFromObject,
  evaluateCompatibility,
  installPart,
  removePart,
} from "./parts";

describe("replacement parts", () => {
  it("creates part with dimensions", () => {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1));
    group.add(mesh);
    const part = createPartFromObject(group, "wheel", "wheel.glb");
    expect(part.dimensions.width).toBeCloseTo(2, 5);
    expect(part.compatibility).toBe("unverified");
  });

  it("marks incompatible on large mismatch", () => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10)));
    const part = createPartFromObject(group, "wheel", "big.glb");
    const result = evaluateCompatibility(part, "Wheel", { width: 1, height: 1, depth: 1 });
    expect(result.status).toBe("incompatible");
  });

  it("install/remove preserves original", () => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
    const part = createPartFromObject(group, "mirror", "m.glb");
    const installed = installPart(part, "comp-1");
    expect(installed.installed).toBe(true);
    expect(installed.originalComponentPreserved).toBe(true);
    const removed = removePart(installed);
    expect(removed.installed).toBe(false);
  });

  it("applies attachment and local transform offsets to a preview object", () => {
    const object = new THREE.Group();
    applyPartPlacement(
      object,
      { position: [1, 2, 3], rotation: [0, Math.PI / 2, 0], scale: [2, 2, 2] },
      new THREE.Vector3(10, 0, 0),
      [0.5, 0, 0],
    );
    expect(object.position.toArray()).toEqual([11.5, 2, 3]);
    expect(object.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(object.scale.toArray()).toEqual([2, 2, 2]);
  });
});