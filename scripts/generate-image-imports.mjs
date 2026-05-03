#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

function generateImageImports(mdxFilePath) {
  // Normalize the path to be relative to project root if needed
  const fullMdxPath = path.isAbsolute(mdxFilePath)
    ? mdxFilePath
    : path.join(projectRoot, mdxFilePath);

  // Extract the filename without extension
  const fileName = path.basename(fullMdxPath, path.extname(fullMdxPath));

  // Get the directory of the MDX file
  const mdxDir = path.dirname(fullMdxPath);

  // Construct the image directory path
  // If MDX is at src/content/weeknotes/week-18-2026.mdx
  // Images are at src/content/images/weeknotes/week-18-2026/
  const relativePathFromContent = path.relative(
    path.join(projectRoot, 'src', 'content'),
    mdxDir
  );
  const imageDir = path.join(
    projectRoot,
    'src',
    'content',
    'images',
    relativePathFromContent,
    fileName
  );

  // Check if image directory exists
  if (!fs.existsSync(imageDir)) {
    console.error(`Image directory not found: ${imageDir}`);
    process.exit(1);
  }

  // Read all files from directory and filter for actual files
  const imageFiles = fs
    .readdirSync(imageDir)
    .map((file) => path.join(imageDir, file))
    .filter((file) => fs.statSync(file).isFile())
    .sort();

  if (imageFiles.length === 0) {
    console.log('No images found in directory');
    return;
  }

  // Generate imports
  const imports = imageFiles
    .map((imagePath) => {
      const imageNameWithoutExt = path.basename(imagePath, path.extname(imagePath));
      
      // Convert kebab-case to snake_case
      const importName = imageNameWithoutExt.replace(/-/g, '_');

      // Calculate relative path from MDX file to image
      const relativePath = path.relative(mdxDir, imagePath);

      return `import ${importName} from '${relativePath.replace(/\\/g, '/')}';`;
    });

  console.log(imports.join('\n'));
}

// Get MDX file path from command line argument
const mdxFilePath = process.argv[2];

if (!mdxFilePath) {
  console.error('Usage: node generate-image-imports.mjs <path-to-mdx-file>');
  console.error('Example: node generate-image-imports.mjs src/content/weeknotes/week-18-2026.mdx');
  process.exit(1);
}

generateImageImports(mdxFilePath);
