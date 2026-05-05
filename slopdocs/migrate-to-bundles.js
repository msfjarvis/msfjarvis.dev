#!/usr/bin/env node

/**
 * Migrate content to Hugo-style page bundles
 * - Moves MDX files to <slug>/index.mdx
 * - Co-locates images with content
 * - Updates import paths in MDX files
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, "../src/content");
const IMAGES_DIR = path.join(CONTENT_DIR, "images");

const CONTENT_TYPES = ["posts", "notes", "weeknotes"];

function getSlugFromFilename(filename) {
  return path.basename(filename, path.extname(filename));
}

function migrateContentType(contentType) {
  const contentTypeDir = path.join(CONTENT_DIR, contentType);
  const imagesTypeDir = path.join(IMAGES_DIR, contentType);

  console.log(`\n🔄 Migrating ${contentType}...`);

  const files = fs.readdirSync(contentTypeDir).filter((f) => f.endsWith(".mdx"));
  console.log(`   Found ${files.length} files`);

  files.forEach((file) => {
    const slug = getSlugFromFilename(file);
    const sourcePath = path.join(contentTypeDir, file);
    const bundleDir = path.join(contentTypeDir, slug);
    const indexPath = path.join(bundleDir, "index.mdx");

    // Create bundle directory
    if (!fs.existsSync(bundleDir)) {
      fs.mkdirSync(bundleDir, { recursive: true });
    }

    // Read and update MDX content
    let content = fs.readFileSync(sourcePath, "utf-8");

    // Extract generic type-level images (no slash in filename) BEFORE we replace them
    // This regex captures only filenames without directory separators
    const genericImageRegex = /from\s+['"]\.\.\/\.\.\/content\/images\/\w+\/([^\/'"]+\.webp)['"]/g;
    const genericMatches = Array.from(content.matchAll(genericImageRegex));

    // Order matters: do specific replacements first

    // 1. Handle ../images/<type>/<slug>/<image> pattern (from original non-bundled structure)
    content = content.replace(
      /from\s+['"]\.\.\/images\/\w+\/\w[\w\-]*\/([^'"]+)['"]/g,
      "from './$1'",
    );

    // 2. Update image imports in slug folders: '../../content/images/<type>/<slug>/<image>' -> './<image>'
    content = content.replace(
      /from\s+['"]\.\.\/\.\.\/content\/images\/\w+\/\w[\w\-]*\/([^'"]+)['"]/g,
      "from './$1'",
    );

    // 3. Handle generic type-level images (no slash): '../../content/images/<type>/<image>' -> './<image>'
    content = content.replace(
      /from\s+['"]\.\.\/\.\.\/content\/images\/\w+\/([^\/'"]+\.webp)['"]/g,
      "from './$1'",
    );

    // 4. Update component imports: '../../components/*' -> '../../../components/*'
    content = content.replace(
      /from\s+['"]\.\.\/\.\.\/components\/([^'"]+)['"]/g,
      "from '../../../components/$1'",
    );

    // 5. Update other relative imports from src: '../../<path>' -> '../../../<path>'
    // Only match if still has ../../ (i.e. wasn't caught by previous patterns)
    // Exclude patterns that start with ../ (to avoid matching ../../../)
    content = content.replace(
      /from\s+['"]\.\.\/\.\.\/(?!\.\.\/|components\/|content\/)([^'"]+)['"]/g,
      "from '../../../$1'",
    );

    // Write updated content to bundle
    fs.writeFileSync(indexPath, content);
    console.log(`   ✓ ${slug}/index.mdx`);

    // Move associated images from slug-specific folder
    const imageSourceDir = path.join(imagesTypeDir, slug);
    if (fs.existsSync(imageSourceDir)) {
      const images = fs.readdirSync(imageSourceDir);
      images.forEach((img) => {
        const src = path.join(imageSourceDir, img);
        const dest = path.join(bundleDir, img);
        fs.copyFileSync(src, dest);
      });
      console.log(`   ✓ Moved ${images.length} image(s) from slug folder`);
    }

    // Move generic type-level images referenced in this content
    genericMatches.forEach((match) => {
      const imageName = match[1]; // Group 1, not 2
      const imagePath = path.join(imagesTypeDir, imageName);
      if (fs.existsSync(imagePath)) {
        const dest = path.join(bundleDir, imageName);
        fs.copyFileSync(imagePath, dest);
        console.log(`   ✓ Moved generic image: ${imageName}`);
      }
    });

    // Remove original MDX file
    fs.unlinkSync(sourcePath);
  });
}

function removeOldImageDir() {
  console.log(`\n🧹 Cleaning up old images directory...`);

  // Only remove if empty or only contains empty dirs
  const removeEmptyDirs = (dir) => {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    items.forEach((item) => {
      const itemPath = path.join(dir, item);
      if (fs.statSync(itemPath).isDirectory()) {
        removeEmptyDirs(itemPath);
      }
    });

    try {
      if (fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
        console.log(`   ✓ Removed ${dir}`);
      }
    } catch (e) {
      // Skip if not empty
    }
  };

  removeEmptyDirs(IMAGES_DIR);
}

function main() {
  console.log("📦 Starting page bundles migration...");

  try {
    CONTENT_TYPES.forEach(migrateContentType);
    removeOldImageDir();

    console.log("\n✅ Migration complete!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  }
}

main();
