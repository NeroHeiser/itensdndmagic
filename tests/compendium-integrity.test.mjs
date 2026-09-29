import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const EN_ITEMS_PATH = path.join(ROOT_DIR, "scripts/data/en/magic-items.json");
const PT_ITEMS_PATH = path.join(ROOT_DIR, "scripts/data/pt-BR/magic-items.json");

test("compendium data files exist in both en and pt-BR locales", () => {
  assert.ok(fs.existsSync(EN_ITEMS_PATH), "EN magic items file should exist");
  assert.ok(fs.existsSync(PT_ITEMS_PATH), "PT-BR magic items file should exist");
});

test("compendium files contain 1714 items and maintain 1:1 ID parity", () => {
  const enItems = JSON.parse(fs.readFileSync(EN_ITEMS_PATH, "utf-8"));
  const ptItems = JSON.parse(fs.readFileSync(PT_ITEMS_PATH, "utf-8"));

  assert.equal(enItems.length, 1714, "Should have 1714 items in EN");
  assert.equal(ptItems.length, 1714, "Should have 1714 items in PT-BR");

  const enIds = enItems.map(i => i._id);
  const ptIds = ptItems.map(i => i._id);

  assert.deepEqual(enIds, ptIds, "EN and PT-BR compendiums must maintain exact 1:1 ID parity");
});

test("all items have valid 16-character alphanumeric IDs and required metadata", () => {
  const items = JSON.parse(fs.readFileSync(EN_ITEMS_PATH, "utf-8"));
  const idRegex = /^[a-zA-Z0-9]{16}$/;
  const allowedRarities = new Set(["common", "uncommon", "rare", "veryRare", "legendary", "artifact"]);

  for (const item of items) {
    assert.ok(idRegex.test(item._id), `Item ID '${item._id}' must be 16 alphanumeric chars`);
    assert.ok(item.name && item.name.length > 0, `Item ${item._id} must have a non-empty name`);
    assert.ok(["equipment", "weapon", "consumable", "loot", "tool"].includes(item.type));

    assert.ok(
      allowedRarities.has(item.system?.rarity),
      `Item '${item.name}' has invalid rarity '${item.system?.rarity}'`
    );

    assert.ok(
      [0, 1].includes(item.system?.attunement),
      `Item '${item.name}' attunement must be normalized to 0 or 1`
    );

    assert.ok(
      item.system?.price?.value > 0,
      `Item '${item.name}' must have a valid market price > 0`
    );

    assert.equal(
      item.flags?.itensmagicos?.sourceId,
      item._id,
      `Item '${item.name}' must preserve sourceId in flags.itensmagicos`
    );

    assert.ok(
      item.flags?.["midi-qol"],
      `Item '${item.name}' must possess midi-qol automation flags`
    );
  }
});

test("weapons have proper combat actionType and damage parts configured", () => {
  const items = JSON.parse(fs.readFileSync(EN_ITEMS_PATH, "utf-8"));
  const weapons = items.filter(i => i.type === "weapon");

  assert.ok(weapons.length > 0, "Should have weapon entries");

  for (const weapon of weapons) {
    assert.ok(
      ["mwak", "rwak"].includes(weapon.system?.actionType),
      `Weapon '${weapon.name}' must have valid actionType`
    );

    assert.ok(
      Array.isArray(weapon.system?.damage?.parts) && weapon.system.damage.parts.length > 0,
      `Weapon '${weapon.name}' must have damage parts configured`
    );
  }
});
