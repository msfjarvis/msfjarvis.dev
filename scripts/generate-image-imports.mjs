#!/usr/bin/env node

import fs from "fs";
import path from "path";

function generateImageImports(imageDir) {
  // Check if image directory exists
  if (!fs.existsSync(imageDir)) {
    console.error(`Image directory not found: ${imageDir}`);
    process.exit(1);
  }

  // Read all files from directory and filter for actual files
  const imageFiles = fs
    .readdirSync(imageDir)
    .map((file) => path.join(imageDir, file))
    .filter((file) => fs.statSync(file).isFile() && path.extname(file) === ".webp")
    .sort();

  if (imageFiles.length === 0) {
    console.log("No images found in directory");
    return;
  }

  // Generate imports
  const imports = imageFiles.map((imagePath) => {
    const imageNameWithoutExt = path.basename(imagePath, path.extname(imagePath));

    // Convert kebab-case to snake_case
    const importName = imageNameWithoutExt.replace(/-/g, "_");

    return `import ${importName} from './${imagePath.replace(imageDir, "")}';`;
  });

  console.log(imports.join("\n"));
}

// Get directory from command line argument
const imageDir = process.argv[2];

if (!imageDir) {
  console.error("Usage: node generate-image-imports.mjs <path-to-mdx-file>");
  console.error("Example: node generate-image-imports.mjs src/content/weeknotes/week-18-2026");
  process.exit(1);
}

generateImageImports(imageDir);
