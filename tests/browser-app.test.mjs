import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MagicItemsBrowserApp } from "../scripts/apps/magic-items-browser.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

test("MagicItemsBrowserApp instantiates with clean initial filter states", () => {
  const app = new MagicItemsBrowserApp();

  assert.equal(app.searchQuery, "");
  assert.equal(app.selectedRarity, "all");
  assert.equal(app.selectedType, "all");
  assert.equal(app.selectedAttunement, "all");
  assert.equal(app.selectedVolume, "all");
  assert.equal(app._preserveSearchFocus, false);
});

test("MagicItemsBrowserApp DEFAULT_OPTIONS declares correct window metadata and actions", () => {
  const options = MagicItemsBrowserApp.DEFAULT_OPTIONS;

  assert.equal(options.id, "itensmagicos-browser");
  assert.ok(options.classes.includes("magic-items-browser"));
  assert.equal(options.window.icon, "fas fa-hat-wizard");
  assert.equal(options.window.title, "ITENSMAGICOS.Browser.Title");

  assert.ok(typeof options.actions.selectItem === "function");
  assert.ok(typeof options.actions.grantItem === "function");
  assert.ok(typeof options.actions.setFilter === "function");
  assert.ok(typeof options.actions.clearFilters === "function");
  assert.ok(typeof options.actions.selectActor === "function");
});

test("templates/magic-items-browser.hbs exists and contains valid structure", () => {
  const templatePath = path.join(ROOT_DIR, "templates/magic-items-browser.hbs");
  assert.ok(fs.existsSync(templatePath), "Template file must exist");

  const content = fs.readFileSync(templatePath, "utf-8");
  assert.ok(content.includes("itensmagicos-browser-container"));
  assert.ok(content.includes("name=\"searchQuery\""));
  assert.ok(content.includes("data-action=\"selectItem\""));
  assert.ok(content.includes("data-action=\"grantItem\""));
});

test("MagicItemsBrowserApp _prepareContext returns structured data with fallback items", async () => {
  const app = new MagicItemsBrowserApp();

  // Mock getItems method with sample data
  app.getItems = async () => [
    {
      _id: "testitem00000001",
      name: "Moonblade",
      type: "weapon",
      system: { rarity: "legendary", attunement: 1, description: { value: "A legendary sword." } },
      flags: { itensmagicos: { volume: "years-1-3" } }
    },
    {
      _id: "testitem00000002",
      name: "Potion of Healing",
      type: "consumable",
      system: { rarity: "common", attunement: 0, description: { value: "Heals wounds." } },
      flags: { itensmagicos: { volume: "year-4" } }
    }
  ];

  const context = await app._prepareContext();

  assert.equal(context.totalCount, 2);
  assert.equal(context.filteredCount, 2);
  assert.equal(context.items.length, 2);
  assert.equal(context.selectedItemId, "testitem00000001");
  assert.ok(context.selectedItem);
  assert.equal(context.selectedItem.name, "Moonblade");
  assert.equal(context.priceInfo.standard, 100000);
});
