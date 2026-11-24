import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const glbPath = path.resolve(__dirname, "public", "vehicles", "bmw-m4", "bmw-m4.glb");

async function analyzeGLB() {
  console.log("=== BMW M4 GLB Component Audit ===\n");
  
  const bytes = await readFile(glbPath);
  console.log(`File size: ${bytes.length} bytes (${(bytes.length / 1024 / 1024).toFixed(2)} MB)`);
  
  // Parse GLB header
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  console.log(`\nGLB Header:`);
  console.log(`  Magic: ${buffer.toString("ascii", 0, 4)}`);
  console.log(`  Version: ${buffer.readUInt32LE(4)}`);
  console.log(`  Length: ${buffer.readUInt32LE(8)}`);
  console.log(`  JSON chunk type: ${buffer.toString("ascii", 16, 20)}`);
  console.log(`  JSON chunk length: ${buffer.readUInt32LE(12)}`);
  
  const jsonLength = buffer.readUInt32LE(12);
  const jsonText = buffer.toString("utf8", 20, 20 + jsonLength).replace(/\0+$/g, "").trim();
  const gltf = JSON.parse(jsonText);
  
  console.log(`\nGLTF Info:`);
  console.log(`  Asset: ${JSON.stringify(gltf.asset)}`);
  console.log(`  Scenes: ${gltf.scenes?.length || 0}`);
  console.log(`  Nodes: ${gltf.nodes?.length || 0}`);
  console.log(`  Meshes: ${gltf.meshes?.length || 0}`);
  console.log(`  Materials: ${gltf.materials?.length || 0}`);
  console.log(`  Textures: ${gltf.textures?.length || 0}`);
  console.log(`  Images: ${gltf.images?.length || 0}`);
  console.log(`  Buffers: ${gltf.buffers?.length || 0}`);
  console.log(`  BufferViews: ${gltf.bufferViews?.length || 0}`);
  console.log(`  Accessors: ${gltf.accessors?.length || 0}`);
  
  // Analyze nodes (mesh hierarchy)
  console.log(`\nNode Hierarchy:`);
  if (gltf.nodes) {
    const nodeMap = new Map(gltf.nodes.map((n, i) => [i, n]));
    const childrenMap = new Map<number, number[]>();
    
    for (let i = 0; i < gltf.nodes.length; i++) {
      const node = gltf.nodes[i];
      if (node.children) {
        childrenMap.set(i, node.children);
      }
    }
    
    // Find root nodes (not children of any other node)
    const allChildren = new Set<number>();
    for (const children of childrenMap.values()) {
      for (const child of children) allChildren.add(child);
    }
    const rootNodes = gltf.nodes
      .map((_, i) => i)
      .filter(i => !allChildren.has(i));
    
    console.log(`  Root nodes: ${rootNodes.join(", ")}`);
    
    function printNode(nodeIndex: number, indent: string = "") {
      const node = gltf.nodes[nodeIndex];
      const name = node.name || `(unnamed)`;
      const meshInfo = node.mesh !== undefined ? ` [mesh: ${node.mesh}]` : "";
      const children = childrenMap.get(nodeIndex) || [];
      console.log(`${indent}${nodeIndex}: ${name}${meshInfo}`);
      for (const child of children) {
        printNode(child, indent + "  ");
      }
    }
    
    for (const root of rootNodes) {
      printNode(root);
    }
  }
  
  // Analyze meshes
  console.log(`\nMeshes:`);
  if (gltf.meshes) {
    for (let i = 0; i < gltf.meshes.length; i++) {
      const mesh = gltf.meshes[i];
      const name = mesh.name || `(unnamed)`;
      const primCount = mesh.primitives?.length || 0;
      console.log(`  ${i}: ${name} (${primCount} primitive${primCount !== 1 ? "s" : ""})`);
      if (mesh.primitives) {
        for (let j = 0; j < mesh.primitives.length; j++) {
          const prim = mesh.primitives[j];
          const mat = prim.material !== undefined ? prim.material : "none";
          const mode = prim.mode !== undefined ? prim.mode : 4;
          const modeStr = mode === 4 ? "TRIANGLES" : mode === 5 ? "TRIANGLE_STRIP" : mode === 6 ? "TRIANGLE_FAN" : mode === 0 ? "POINTS" : mode === 1 ? "LINES" : mode === 2 ? "LINE_LOOP" : mode === 3 ? "LINE_STRIP" : `unknown(${mode})`;
          const attrs = Object.keys(prim.attributes || {}).join(", ");
          console.log(`    Prim ${j}: material=${mat}, mode=${modeStr}, attrs=[${attrs}]`);
        }
      }
    }
  }
  
  // Analyze materials
  console.log(`\nMaterials:`);
  if (gltf.materials) {
    for (let i = 0; i < gltf.materials.length; i++) {
      const mat = gltf.materials[i];
      const name = mat.name || `(unnamed)`;
      const pbr = mat.pbrMetallicRoughness || {};
      const baseColor = pbr.baseColorFactor ? `[${pbr.baseColorFactor.map(v => v.toFixed(3)).join(", ")}]` : "none";
      const metallic = pbr.metallicFactor !== undefined ? pbr.metallicFactor.toFixed(3) : "1.0";
      const roughness = pbr.roughnessFactor !== undefined ? pbr.roughnessFactor.toFixed(3) : "1.0";
      const alphaMode = mat.alphaMode || "OPAQUE";
      const doubleSided = mat.doubleSided ? "double-sided" : "";
      console.log(`  ${i}: ${name} - baseColor=${baseColor}, metallic=${metallic}, roughness=${roughness}, alphaMode=${alphaMode} ${doubleSided}`);
    }
  }
  
  // Analyze textures/images
  console.log(`\nTextures:`);
  if (gltf.textures) {
    for (let i = 0; i < gltf.textures.length; i++) {
      const tex = gltf.textures[i];
      const source = tex.source !== undefined ? tex.source : "none";
      const sampler = tex.sampler !== undefined ? tex.sampler : "none";
      console.log(`  ${i}: source=${source}, sampler=${sampler}`);
    }
  }
  
  console.log(`\nImages:`);
  if (gltf.images) {
    for (let i = 0; i < gltf.images.length; i++) {
      const img = gltf.images[i];
      const name = img.name || `(unnamed)`;
      const mime = img.mimeType || "unknown";
      const uri = img.uri ? (img.uri.startsWith("data:") ? "embedded" : img.uri) : "bufferView";
      console.log(`  ${i}: ${name} (${mime}) - ${uri}`);
    }
  }
  
  // Check for embedded textures (buffers with image data)
  console.log(`\nEmbedded Images Check:`);
  if (gltf.images) {
    let embeddedCount = 0;
    for (let i = 0; i < gltf.images.length; i++) {
      const img = gltf.images[i];
      if (img.bufferView !== undefined) {
        embeddedCount++;
        const bv = gltf.bufferViews[img.bufferView];
        const buffer = gltf.buffers[bv.buffer];
        console.log(`  Image ${i} (${img.name || "unnamed"}): embedded in bufferView ${img.bufferView}, buffer ${bv.buffer}, byteOffset=${bv.byteOffset || 0}, byteLength=${bv.byteLength}`);
      }
    }
    console.log(`  Total embedded images: ${embeddedCount}`);
  }
  
  // Component mappings from manifest
  console.log(`\nCatalogue Component Mappings:`);
  console.log(`  BodyParts_1 -> bmw-m4-body-assembly (body, 27 meshes)`);
  console.log(`  WHeelsandrims_2 -> bmw-m4-wheel-assembly (wheel, 3 meshes)`);
  
  // Find these nodes
  if (gltf.nodes) {
    const bodyNode = gltf.nodes.findIndex(n => n.name === "BodyParts_1");
    const wheelNode = gltf.nodes.findIndex(n => n.name === "WHeelsandrims_2");
    
    if (bodyNode >= 0) {
      console.log(`\n  BodyParts_1 found at node index ${bodyNode}`);
      const node = gltf.nodes[bodyNode];
      console.log(`    Mesh: ${node.mesh}`);
      if (node.children) {
        console.log(`    Children: ${node.children.length} (${node.children.join(", ")})`);
        // Count meshes in subtree
        let meshCount = 0;
        function countMeshes(nodeIdx: number): number {
          const n = gltf.nodes[nodeIdx];
          let count = n.mesh !== undefined ? 1 : 0;
          if (n.children) {
            for (const child of n.children) {
              count += countMeshes(child);
            }
          }
          return count;
        }
        meshCount = countMeshes(bodyNode);
        console.log(`    Total meshes in subtree: ${meshCount}`);
      }
    } else {
      console.log(`\n  BodyParts_1 NOT FOUND`);
    }
    
    if (wheelNode >= 0) {
      console.log(`\n  WHeelsandrims_2 found at node index ${wheelNode}`);
      const node = gltf.nodes[wheelNode];
      console.log(`    Mesh: ${node.mesh}`);
      if (node.children) {
        console.log(`    Children: ${node.children.length} (${node.children.join(", ")})`);
        let meshCount = 0;
        function countMeshes(nodeIdx: number): number {
          const n = gltf.nodes[nodeIdx];
          let count = n.mesh !== undefined ? 1 : 0;
          if (n.children) {
            for (const child of n.children) {
              count += countMeshes(child);
            }
          }
          return count;
        }
        meshCount = countMeshes(wheelNode);
        console.log(`    Total meshes in subtree: ${meshCount}`);
      }
    } else {
      console.log(`\n  WHeelsandrims_2 NOT FOUND`);
    }
  }
  
  // List all named nodes
  console.log(`\nAll Named Nodes:`);
  if (gltf.nodes) {
    const namedNodes = gltf.nodes.filter((n, i) => n.name && n.name.trim() !== "");
    for (const node of namedNodes) {
      const meshInfo = node.mesh !== undefined ? ` [mesh: ${node.mesh}]` : "";
      console.log(`  ${node.name}${meshInfo}`);
    }
    console.log(`\n  Total named nodes: ${namedNodes.length}`);
    console.log(`  Total nodes: ${gltf.nodes.length}`);
  }
}

analyzeGLB().catch(console.error);