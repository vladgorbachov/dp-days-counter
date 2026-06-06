#!/usr/bin/env node
/**
 * Cross-platform static file copier for the renderer build.
 * Replaces the previous Windows-only `copy ...` shell script so the project
 * can be built from Windows, macOS or Linux CI agents alike.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const rendererSrc = path.join(projectRoot, 'src', 'renderer');
const rendererOut = path.join(projectRoot, 'dist', 'renderer');
const distDir = path.join(projectRoot, 'dist');
const assetsSrc = path.join(projectRoot, 'assets');
const assetsOut = path.join(distDir, 'assets');

/**
 * Recursively copy a file or directory from src to dest.
 * Throws if the source does not exist (fail loudly — Rule 9: no silent skips).
 * @param {string} src
 * @param {string} dest
 */
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source path missing: ${src}`);
  }
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

fs.mkdirSync(rendererOut, { recursive: true });
fs.mkdirSync(assetsOut, { recursive: true });

const rendererFiles = ['index.html', 'loading.html', 'styles.css'];
for (const name of rendererFiles) {
  copyRecursive(path.join(rendererSrc, name), path.join(rendererOut, name));
}

copyRecursive(path.join(projectRoot, 'version.json'), path.join(rendererOut, 'version.json'));
copyRecursive(path.join(projectRoot, 'installer.nsh'), path.join(distDir, 'installer.nsh'));
copyRecursive(assetsSrc, assetsOut);

console.error('[copy-static] renderer static files copied to dist/');
