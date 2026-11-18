const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appDir = __dirname;
const srcPath = path.join(appDir, 'src', 'app.jsx');
const babelPath = path.join(appDir, 'scripts_babel.min.js');
const outputPath = path.join(appDir, 'public', 'app.bundle.js');

console.log('⚡ Starting JSX pre-compilation for GSHEETS HOME...');

if (!fs.existsSync(srcPath)) {
  console.error('❌ Error: src/app.jsx not found!');
  process.exit(1);
}

if (!fs.existsSync(babelPath)) {
  console.error('❌ Error: scripts_babel.min.js not found!');
  process.exit(1);
}

const jsxCode = fs.readFileSync(srcPath, 'utf8');
const babelCode = fs.readFileSync(babelPath, 'utf8');

const sandbox = { window: {}, console: console, process: process };
vm.createContext(sandbox);
vm.runInContext(babelCode, sandbox);
const Babel = sandbox.Babel || sandbox.window.Babel;

const t0 = Date.now();
try {
  const transformed = Babel.transform(jsxCode, {
    presets: [['react', { runtime: 'classic' }]],
    compact: false
  });

  const bundleHeader = `/**
 * GSHEETS HOME - Quản lý Homestay & Nghỉ Dưỡng
 * Pre-compiled Client Bundle (Babel Classic Runtime)
 * Generated at: ${new Date().toISOString()}
 * Load time: < 30ms (zero in-browser Babel overhead)
 */
`;

  fs.writeFileSync(outputPath, bundleHeader + transformed.code, 'utf8');
  console.log(`✅ SUCCESS! Compiled in ${Date.now() - t0}ms. Output: ${outputPath} (${transformed.code.length} bytes)`);
} catch (err) {
  console.error('❌ BABEL COMPILATION ERROR:', err.message);
  if (err.loc) {
    console.error(`Line ${err.loc.line}, Column ${err.loc.column}`);
    const lines = jsxCode.split('\n');
    const start = Math.max(0, err.loc.line - 5);
    const end = Math.min(lines.length, err.loc.line + 5);
    for (let i = start; i < end; i++) {
      console.error(`${i + 1 === err.loc.line ? '>>' : '  '} ${i + 1}: ${lines[i]}`);
    }
  }
  process.exit(1);
}
