import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const EN_PATH = path.join(ROOT_DIR, "lang/en.json");
const PT_PATH = path.join(ROOT_DIR, "lang/pt-BR.json");
const TEMPLATE_PATH = path.join(ROOT_DIR, "templates/magic-items-browser.hbs");

function getNestedKeys(obj, prefix = "") {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys = keys.concat(getNestedKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

test("localization files exist, are valid JSON, and have 100% symmetric keys", () => {
  assert.ok(fs.existsSync(EN_PATH), "lang/en.json must exist");
  assert.ok(fs.existsSync(PT_PATH), "lang/pt-BR.json must exist");

  const en = JSON.parse(fs.readFileSync(EN_PATH, "utf-8"));
  const pt = JSON.parse(fs.readFileSync(PT_PATH, "utf-8"));

  const enKeys = getNestedKeys(en);
  const ptKeys = getNestedKeys(pt);

  assert.deepEqual(enKeys, ptKeys, "English and Portuguese keys must be strictly identical");
});

test("all Handlebars {{localize}} calls in templates correspond to defined keys", () => {
  assert.ok(fs.existsSync(TEMPLATE_PATH), "Template file must exist");

  const templateContent = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  const en = JSON.parse(fs.readFileSync(EN_PATH, "utf-8"));
  const definedKeys = new Set(getNestedKeys(en));

  // Match: {{localize 'KEY'}} or {{localize "KEY"}}
  const localizeRegex = /\{\{localize\s+['"]([^'"]+)['"]\}\}/g;
  let match;
  const referencedKeys = new Set();

  while ((match = localizeRegex.exec(templateContent)) !== null) {
    referencedKeys.add(match[1]);
  }

  assert.ok(referencedKeys.size > 0, "Template should contain localized keys");

  for (const key of referencedKeys) {
    assert.ok(
      definedKeys.has(key),
      `Template references undefined localization key '${key}'`
    );
  }
});
