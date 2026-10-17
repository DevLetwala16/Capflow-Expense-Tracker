const fs = require('fs');
const path = require('path');

function getAllDirs(dir, base = '') {
  let results = [];
  try {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (item.isDirectory()) {
        const rel = path.join(base, item.name);
        results.push(rel);
        results = results.concat(getAllDirs(path.join(dir, item.name), rel));
      }
    }
  } catch (err) {
    // Ignore
  }
  return results;
}

function ensureAllDirs() {
  const rootDir = path.resolve(__dirname, '..');
  const baseDirs = [
    path.join(rootDir, '.next', 'static', 'chunks'),
    path.join(rootDir, '.next', 'static', 'chunks', 'app'),
    path.join(rootDir, '.next', 'static', 'chunks', 'pages'),
    path.join(rootDir, '.next', 'static', 'css'),
    path.join(rootDir, '.next', 'static', 'media'),
    path.join(rootDir, '.next', 'types', 'app'),
    path.join(rootDir, '.next', 'server', 'app'),
    path.join(rootDir, '.next', 'cache'),
  ];

  if (fs.existsSync(path.join(rootDir, 'pages'))) {
    baseDirs.push(
      path.join(rootDir, '.next', 'types', 'pages'),
      path.join(rootDir, '.next', 'server', 'pages'),
      path.join(rootDir, '.next', 'static', 'chunks', 'pages')
    );
  }

  for (const b of baseDirs) {
    try {
      fs.mkdirSync(b, { recursive: true });
    } catch (_) {}
  }

  const appPath = path.join(rootDir, 'app');
  if (fs.existsSync(appPath)) {
    const appDirs = getAllDirs(appPath);
    for (const d of appDirs) {
      try {
        fs.mkdirSync(path.join(rootDir, '.next', 'server', 'app', d), { recursive: true });
        fs.mkdirSync(path.join(rootDir, '.next', 'types', 'app', d), { recursive: true });
        fs.mkdirSync(path.join(rootDir, '.next', 'static', 'chunks', 'app', d), { recursive: true });

        const clean = d.replace(/\([^)]+\)[\\/]?/g, '');
        if (clean) {
          fs.mkdirSync(path.join(rootDir, '.next', 'server', 'app', clean), { recursive: true });
          fs.mkdirSync(path.join(rootDir, '.next', 'types', 'app', clean), { recursive: true });
          fs.mkdirSync(path.join(rootDir, '.next', 'static', 'chunks', 'app', clean), { recursive: true });
        }
      } catch (_) {}
    }
  }
}

// Run immediately if executed directly
ensureAllDirs();

module.exports = { ensureAllDirs };
