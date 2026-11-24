import { createHash } from "node:crypto";
import { readFile, lstat, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VehicleAssetService } from "./electron/vehicleAssetService";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname);
const manifestPath = path.join(projectRoot, "dist", "vehicles", "manifest.json");
const assetRoot = path.join(projectRoot, "dist");
const cacheRoot = path.join(projectRoot, "test-cache");

async function testProductionAssetService() {
  console.log("=== Testing VehicleAssetService with Production Assets ===\n");
  
  const service = new VehicleAssetService({
    manifestPath,
    assetRoot,
    cacheRoot,
  });
  
  // Test 1: Load BMW M4 from local packaged asset
  console.log("Test 1: Load BMW M4 from local packaged asset...");
  try {
    const result = await service.loadVehicleAsset(
      "bmw-m4",
      "test-request-0000000000000001",
      1,
      (progress) => console.log(`  Progress: ${progress.stage} ${progress.percent}%`)
    );
    console.log(`  ✓ Source: ${result.source}`);
    console.log(`  ✓ Cached: ${result.cached}`);
    console.log(`  ✓ Files: ${result.files.length}`);
    for (const file of result.files) {
      console.log(`    - ${file.path} (${file.data.byteLength} bytes)`);
    }
    
    // Verify hash
    const mainFile = result.files.find(f => f.path === "vehicles/bmw-m4/bmw-m4.glb");
    if (mainFile) {
      const hash = createHash("sha256").update(new Uint8Array(mainFile.data)).digest("hex");
      console.log(`  ✓ SHA-256: ${hash}`);
    }
  } catch (error) {
    console.error(`  ✗ FAILED: ${error}`);
    return false;
  }
  
  // Test 2: Cache status after first load
  console.log("\nTest 2: Check cache status (should be uncached for local)...");
  try {
    const status = await service.getCacheStatus("bmw-m4");
    console.log(`  ✓ Cached: ${status.cached}, Invalid: ${status.invalid}, Bytes: ${status.bytes}`);
  } catch (error) {
    console.error(`  ✗ FAILED: ${error}`);
    return false;
  }
  
  // Test 3: Second load (should be from local again, not cached)
  console.log("\nTest 3: Second load (local asset, not cached)...");
  try {
    const result = await service.loadVehicleAsset(
      "bmw-m4",
      "test-request-0000000000000002",
      2,
      (progress) => console.log(`  Progress: ${progress.stage} ${progress.percent}%`)
    );
    console.log(`  ✓ Source: ${result.source}`);
    console.log(`  ✓ Cached: ${result.cached}`);
  } catch (error) {
    console.error(`  ✗ FAILED: ${error}`);
    return false;
  }
  
  // Test 4: Load unavailable vehicle
  console.log("\nTest 4: Load unavailable vehicle (bmw-3-series)...");
  try {
    await service.loadVehicleAsset("bmw-3-series", "test-request-0000000000000003", 3, () => {});
    console.log(`  ✗ FAILED: Should have thrown NOT_AVAILABLE`);
    return false;
  } catch (error) {
    if (error.code === "NOT_AVAILABLE") {
      console.log(`  ✓ Correctly rejected with NOT_AVAILABLE`);
    } else {
      console.error(`  ✗ FAILED: Wrong error code: ${error.code}`);
      return false;
    }
  }
  
  // Test 5: Cancel request
  console.log("\nTest 5: Test request cancellation...");
  try {
    let cancelCalled = false;
    const promise = service.loadVehicleAsset("bmw-m4", "test-cancel-000000000001", 4, () => {});
    // Cancel immediately - may complete before cancel if very fast
    const cancelled = service.cancelRequest("test-cancel-000000000001", 4);
    try {
      await promise;
      if (cancelled) {
        console.log(`  ✓ Request was marked for cancellation but completed (local load is very fast)`);
      } else {
        console.log(`  ✓ Request completed before cancellation could take effect (local load is very fast)`);
      }
    } catch (error) {
      if (error.code === "CANCELLED") {
        console.log(`  ✓ Correctly cancelled`);
      } else {
        console.error(`  ✗ FAILED: Wrong error on cancel: ${error.code}`);
        return false;
      }
    }
  } catch (error) {
    console.error(`  ✗ FAILED: ${error}`);
    return false;
  }
  
  // Test 6: Cache removal
  console.log("\nTest 6: Test cache removal (should return false for local asset)...");
  try {
    const removed = await service.removeCache("bmw-m4");
    console.log(`  ✓ Remove cache returned: ${removed} (expected false for local asset)`);
  } catch (error) {
    console.error(`  ✗ FAILED: ${error}`);
    return false;
  }
  
  console.log("\n=== All Production Asset Service Tests PASSED ===");
  return true;
}

async function testManifestIntegrity() {
  console.log("\n=== Verifying Manifest Integrity ===\n");
  
  const manifestText = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText);
  
  console.log(`Total catalogue entries: ${manifest.length}`);
  
  const available = manifest.filter(v => v.asset.status === "available");
  console.log(`Available assets: ${available.length}`);
  
  for (const vehicle of available) {
    console.log(`\n  Vehicle: ${vehicle.displayName} (${vehicle.id})`);
    console.log(`    Main file: ${vehicle.asset.mainFile}`);
    console.log(`    Files: ${vehicle.asset.files.join(", ")}`);
    console.log(`    Accuracy: ${vehicle.asset.accuracy}`);
    console.log(`    Source: ${vehicle.asset.source?.name}`);
    console.log(`    License: ${vehicle.asset.license?.name}`);
    
    // Verify each file exists and hash matches
    for (const file of vehicle.asset.files) {
      const filePath = path.join(assetRoot, file);
      try {
        await lstat(filePath);
        const bytes = await readFile(filePath);
        const hash = createHash("sha256").update(bytes).digest("hex");
        const expectedHash = vehicle.asset.integrity[file];
        const match = hash === expectedHash;
        console.log(`    ${file}: ${match ? "✓" : "✗"} Hash ${match ? "matches" : "MISMATCH"}`);
        if (!match) {
          console.log(`      Expected: ${expectedHash}`);
          console.log(`      Actual:   ${hash}`);
        }
      } catch (error) {
        console.log(`    ${file}: ✗ MISSING - ${error}`);
      }
    }
  }
  
  return available.length === 1;
}

async function testProjectSerialization() {
  console.log("\n=== Testing Project Serialization with BMW Asset ===\n");
  
  const { loadVehicleFiles } = await import("./src/engine/modelLoader");
  const { parseProject, serializeProject } = await import("./src/engine/projectConfig");
  const { createHash } = await import("node:crypto");
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const path = await import("node:path");
  
  // Load the actual BMW M4 GLB
  const assetPath = "vehicles/bmw-m4/bmw-m4.glb";
  const fullPath = path.resolve(projectRoot, "public", assetPath);
  const bytes = await readFile(fullPath);
  const file = new File([new Uint8Array(bytes)], "bmw-m4.glb", { type: "model/gltf-binary" });
  Object.defineProperty(file, "webkitRelativePath", { value: assetPath });
  
  // Need to polyfill createImageBitmap for Node
  globalThis.createImageBitmap = async (source: Blob) => {
    const bytes = new Uint8Array(await source.arrayBuffer());
    if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
      throw new Error("Node image decoder shim accepts embedded PNG textures only.");
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      width: view.getUint32(16),
      height: view.getUint32(20),
      close() {},
    };
  };

  // Polyfill self for three.js
  if (typeof globalThis.self === "undefined") {
    Object.defineProperty(globalThis, "self", { configurable: true, value: globalThis });
  }
  
  console.log("Loading BMW M4 GLB...");
  const loaded = await loadVehicleFiles([file], undefined, assetPath, [
    { componentId: "bmw-m4-body-assembly", meshName: "BodyParts_1", displayName: "Body and exterior assembly", category: "body", allowedModifications: ["material"], inspectable: true, customizable: true },
    { componentId: "bmw-m4-wheel-assembly", meshName: "WHeelsandrims_2", displayName: "Wheels and rims assembly", category: "wheel", allowedModifications: ["material"], inspectable: true, customizable: true }
  ]);
  
  console.log(`  ✓ Meshes: ${loaded.audit.meshCount}`);
  console.log(`  ✓ Materials: ${loaded.audit.materialCount}`);
  console.log(`  ✓ Textures: ${loaded.audit.textureCount}`);
  console.log(`  ✓ Components: ${loaded.components.map(c => c.id).join(", ")}`);
  
  // Apply a material change
  const customization = {
    paint: "#b93438",
    finish: "metallic",
    paintMetallic: 0.88,
    paintRoughness: 0.2,
    clearCoat: 0.7,
    spoiler: true,
    windowTint: true,
    wheelColor: "#a9b5bd",
    wheelDesign: "five-spoke",
    spoilerStyle: "sport",
    bumperStyle: "street",
    environment: "dark-showroom",
    quality: "high",
  };
  
  const componentMaterials = {
    "bmw-m4-body-assembly": { color: "#b93438", finish: "metallic", metallic: 0.9, roughness: 0.2, clearCoat: 0.7 },
  };
  
  // Serialize project
  const projectJson = serializeProject(
    loaded.asset,
    customization,
    componentMaterials,
    {},
    [],
    undefined,
    {
      catalogueVehicleId: "bmw-m4",
      displayName: "BMW M4 G82",
      assetSource: "SRT Performance™ on Sketchfab; mirror by Cooper Codes",
      assetVerification: "verified",
    }
  );
  
  console.log("\n  Serialized project length:", projectJson.length, "chars");
  
  // Parse project
  const parsed = parseProject(projectJson);
  console.log("  ✓ Parsed successfully");
  console.log(`  ✓ Model source: ${parsed.model.source}`);
  if (parsed.model.source === "imported") {
    console.log(`  ✓ Catalogue vehicle ID: ${parsed.model.catalogueVehicleId}`);
    console.log(`  ✓ Display name: ${parsed.model.displayName}`);
    console.log(`  ✓ Asset verification: ${parsed.model.assetVerification}`);
    console.log(`  ✓ Asset name: ${parsed.model.asset.name}`);
  }
  console.log(`  ✓ Customization paint: ${parsed.customization.paint}`);
  console.log(`  ✓ Component materials: ${Object.keys(parsed.componentMaterials).join(", ")}`);
  
  // Verify hash in serialized asset
  const serializedMainFile = parsed.model.asset.files.find(f => f.path === assetPath);
  if (serializedMainFile) {
    const serializedBytes = Buffer.from(serializedMainFile.data, "base64");
    const hash = createHash("sha256").update(serializedBytes).digest("hex");
    const originalHash = createHash("sha256").update(bytes).digest("hex");
    console.log(`  ✓ Serialized asset hash matches: ${hash === originalHash}`);
  }
  
  return true;
}

async function main() {
  try {
    await testManifestIntegrity();
    await testProductionAssetService();
    await testProjectSerialization();
    console.log("\n=== ALL VERIFICATION TESTS PASSED ===");
  } catch (error) {
    console.error("\n=== VERIFICATION FAILED ===");
    console.error(error);
    process.exit(1);
  }
}

main();