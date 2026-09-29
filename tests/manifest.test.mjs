import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

test("module.json exists and has valid required Foundry VTT fields", () => {
  const manifestPath = path.join(ROOT_DIR, "module.json");
  assert.ok(fs.existsSync(manifestPath), "module.json should exist");

  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(raw);

  assert.equal(manifest.id, "itensmagicos");
  assert.equal(manifest.version, "1.0.0");
  assert.ok(manifest.title && manifest.title.length > 0);
  assert.ok(Array.isArray(manifest.esmodules) && manifest.esmodules.includes("scripts/main.mjs"));

  assert.ok(manifest.compatibility, "Compatibility field is required");
  assert.equal(manifest.compatibility.minimum, "12");
  assert.equal(manifest.compatibility.verified, "12");
  assert.equal(manifest.compatibility.maximum, "14");
});

test("package.json exists and maintains parity with module.json", () => {
  const pkgPath = path.join(ROOT_DIR, "package.json");
  const manifestPath = path.join(ROOT_DIR, "module.json");

  assert.ok(fs.existsSync(pkgPath), "package.json should exist");

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  assert.equal(pkg.name, manifest.id);
  assert.equal(pkg.version, manifest.version);
  assert.equal(pkg.type, "module");
  assert.ok(pkg.scripts?.test, "test script must be defined in package.json");
});

test("entry points and styles defined in manifest exist physically on disk", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "module.json"), "utf-8"));

  for (const scriptPath of manifest.esmodules) {
    assert.ok(
      fs.existsSync(path.join(ROOT_DIR, scriptPath)),
      `Script file '${scriptPath}' must exist on disk`
    );
  }

  for (const stylePath of manifest.styles) {
    assert.ok(
      fs.existsSync(path.join(ROOT_DIR, stylePath)),
      `Style file '${stylePath}' must exist on disk`
    );
  }
});

test("all compendium packs defined in module.json exist physically on disk", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "module.json"), "utf-8"));

  assert.ok(Array.isArray(manifest.packs) && manifest.packs.length > 0, "Packs must be declared");

  for (const pack of manifest.packs) {
    const packDir = path.join(ROOT_DIR, pack.path);
    assert.ok(fs.existsSync(packDir), `Compendium directory '${pack.path}' must exist on disk`);
  }
});

test("localization files exist, are valid JSON, and maintain 100% key symmetry", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "module.json"), "utf-8"));
  assert.ok(Array.isArray(manifest.languages) && manifest.languages.length >= 2);

  const keySets = {};

  function extractKeys(obj, prefix = "") {
    const keys = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        keys.push(...extractKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys.sort();
  }

  for (const langConfig of manifest.languages) {
    const langPath = path.join(ROOT_DIR, langConfig.path);
    assert.ok(fs.existsSync(langPath), `Language file '${langConfig.path}' must exist`);

    const content = JSON.parse(fs.readFileSync(langPath, "utf-8"));
    keySets[langConfig.lang] = extractKeys(content);
  }

  assert.deepEqual(
    keySets["en"],
    keySets["pt-BR"],
    "English and Brazilian Portuguese localization keys must be 100% symmetric"
  );
});
