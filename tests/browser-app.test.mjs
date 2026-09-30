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

test("MagicItemsBrowserApp grantItem creates item on actor with deep clone and stripped _id", async () => {
  const originalGame = globalThis.game;
  const originalUi = globalThis.ui;

  try {
    let createdPayload = null;
    const mockActor = {
      id: "actor123",
      name: "Valeros",
      createEmbeddedDocuments: async (embeddedName, items) => {
        createdPayload = items;
        return items;
      }
    };

    globalThis.game = {
      actors: {
        get: (id) => (id === "actor123" ? mockActor : null)
      },
      i18n: {
        localize: (k) => k,
        format: (k, data) => `${k}: ${data.item} -> ${data.actor}`
      }
    };
    globalThis.ui = {
      notifications: {
        info: () => {},
        warn: () => {}
      }
    };

    const app = new MagicItemsBrowserApp();
    const sourceItem = {
      _id: "original_compendium_id",
      name: "Flame Tongue",
      type: "weapon",
      system: { rarity: "rare" }
    };

    app.getItems = async () => [sourceItem];

    const result = await app.grantItem("original_compendium_id", "actor123");

    assert.ok(result);
    assert.equal(createdPayload.length, 1);
    assert.equal(createdPayload[0].name, "Flame Tongue");
    assert.equal(createdPayload[0]._id, undefined, "_id must be stripped from the granted item");
    assert.equal(sourceItem._id, "original_compendium_id", "Original cached item must retain its _id");
  } finally {
    globalThis.game = originalGame;
    globalThis.ui = originalUi;
  }
});

test("MagicItemsBrowserApp _onRender binds targetActor change event listener", () => {
  const app = new MagicItemsBrowserApp();

  let changeListener = null;
  const mockSelect = {
    addEventListener: (event, handler) => {
      if (event === "change") changeListener = handler;
    }
  };

  app.element = {
    querySelector: (selector) => {
      if (selector === "select[name='targetActor']") return mockSelect;
      return null;
    }
  };

  app.render = () => {};

  app._onRender({}, {});

  assert.ok(typeof changeListener === "function", "change listener must be registered on select[name='targetActor']");

  // Trigger change
  changeListener({ target: { value: "new_actor_456" } });
  assert.equal(app.selectedActorId, "new_actor_456");
});

