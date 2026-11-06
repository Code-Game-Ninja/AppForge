const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Load the actual modules, with explicit test doubles for external boundaries.
module.exports = function createLoader(overrides = {}) {
  const cache = new Map();
  const root = path.resolve(__dirname, '../..');
  function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = new Module(filename, module);
    cache.set(filename, loaded);
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    const originalRequire = loaded.require.bind(loaded);
    loaded.require = id => {
      if (Object.prototype.hasOwnProperty.call(overrides, id)) return overrides[id];
      if (id === 'server-only') return {};
      if (id.startsWith('.') || id.startsWith('@/')) {
        const candidate = id.startsWith('@/') ? path.resolve(root, 'src', id.slice(2)) : path.resolve(path.dirname(filename), id);
        for (const extension of ['', '.ts', '.tsx', '/index.ts']) {
          const resolved = candidate + extension;
          if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return load(resolved);
        }
      }
      return originalRequire(id);
    };
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    loaded._compile(compiled.outputText, filename);
    return loaded.exports;
  }
  return load;
};
