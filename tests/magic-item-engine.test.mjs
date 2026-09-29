import test from "node:test";
import assert from "node:assert/strict";
import { MagicItemEngine } from "../scripts/domain/magic-item-engine.mjs";

test("calculateMarketPrice calculates standard DMG pricing by rarity", () => {
  const common = MagicItemEngine.calculateMarketPrice("common");
  assert.equal(common.standard, 100);
  assert.equal(common.min, 50);
  assert.equal(common.max, 100);

  const uncommon = MagicItemEngine.calculateMarketPrice("uncommon");
  assert.equal(uncommon.standard, 500);

  const rare = MagicItemEngine.calculateMarketPrice("rare");
  assert.equal(rare.standard, 5000);

  const veryRare = MagicItemEngine.calculateMarketPrice("veryRare");
  assert.equal(veryRare.standard, 50000);

  const legendary = MagicItemEngine.calculateMarketPrice("legendary");
  assert.equal(legendary.standard, 100000);

  const artifact = MagicItemEngine.calculateMarketPrice("artifact");
  assert.equal(artifact.standard, 500000);
});

test("calculateMarketPrice halves cost for consumable items", () => {
  const normalPotion = MagicItemEngine.calculateMarketPrice("uncommon", { isConsumable: true });
  assert.equal(normalPotion.standard, 250);
  assert.equal(normalPotion.min, 50);
  assert.equal(normalPotion.max, 250);
});

test("getMaxAttunementSlots respects default 3 and Artificer level milestones", () => {
  assert.equal(MagicItemEngine.getMaxAttunementSlots(null), 3);

  const regularFighter = {
    items: [{ type: "class", name: "Fighter", system: { levels: 15 } }]
  };
  assert.equal(MagicItemEngine.getMaxAttunementSlots(regularFighter), 3);

  const artificer10 = {
    items: [{ type: "class", name: "Artificer", system: { levels: 10 } }]
  };
  assert.equal(MagicItemEngine.getMaxAttunementSlots(artificer10), 4);

  const artificer14 = {
    items: [{ type: "class", name: "Artificer", system: { levels: 14 } }]
  };
  assert.equal(MagicItemEngine.getMaxAttunementSlots(artificer14), 5);

  const artificer18 = {
    items: [{ type: "class", name: "Artificer", system: { levels: 18 } }]
  };
  assert.equal(MagicItemEngine.getMaxAttunementSlots(artificer18), 6);
});

test("checkAttunementEligibility verifies slots and non-attunement passes", () => {
  const nonAttunedItem = { name: "Potion of Healing", system: { attunement: 0 } };
  const resNonAttuned = MagicItemEngine.checkAttunementEligibility(null, nonAttunedItem);
  assert.equal(resNonAttuned.eligible, true);

  const attunementItem = { name: "Ring of Protection", system: { attunement: 1 } };

  // Actor with 2 attuned items
  const actorWithSlots = {
    items: [
      { name: "Item 1", system: { attunement: 2, attuned: true } },
      { name: "Item 2", system: { attunement: 2, attuned: true } },
      { name: "Item 3", system: { attunement: 1, attuned: false } }
    ]
  };
  const resEligible = MagicItemEngine.checkAttunementEligibility(actorWithSlots, attunementItem);
  assert.equal(resEligible.eligible, true);
  assert.equal(resEligible.currentCount, 2);
  assert.equal(resEligible.maxCount, 3);

  // Actor with 3 attuned items (full)
  const actorFull = {
    items: [
      { name: "Item 1", system: { attuned: true } },
      { name: "Item 2", system: { attuned: true } },
      { name: "Item 3", system: { attuned: true } }
    ]
  };
  const resFull = MagicItemEngine.checkAttunementEligibility(actorFull, attunementItem);
  assert.equal(resFull.eligible, false);
  assert.match(resFull.reason, /Maximum attunement slots reached/);
});

test("parseItemCharges extracts charges and dawn recovery from description or uses", () => {
  const wand = {
    name: "Wand of Fireballs",
    system: {
      description: {
        value: "<p>This wand has 7 charges. While holding it, you can expend charges... It regains 1d6 + 1 expended charges daily at dawn.</p>"
      }
    }
  };

  const parsed = MagicItemEngine.parseItemCharges(wand);
  assert.equal(parsed.max, 7);
  assert.equal(parsed.rechargeFormula, "1d6 + 1");
  assert.equal(parsed.rechargeTiming, "dawn");

  const systemWand = {
    name: "Staff of Power",
    system: {
      uses: {
        max: 20,
        recovery: "2d8 + 4",
        per: "dawn"
      }
    }
  };

  const parsedSystem = MagicItemEngine.parseItemCharges(systemWand);
  assert.equal(parsedSystem.max, 20);
  assert.equal(parsedSystem.rechargeFormula, "2d8 + 4");
  assert.equal(parsedSystem.rechargeTiming, "dawn");
});

test("filterItems filters by text query, rarity, type, attunement, and volume", () => {
  const sampleItems = [
    {
      name: "Flame Tongue",
      type: "weapon",
      system: { rarity: "rare", attunement: 1 },
      flags: { itensmagicos: { volume: "years-1-3" } }
    },
    {
      name: "Potion of Invisibility",
      type: "consumable",
      system: { rarity: "veryRare", attunement: 0 },
      flags: { itensmagicos: { volume: "years-1-3" } }
    },
    {
      name: "Ring of Spell Storing",
      type: "equipment",
      system: { rarity: "rare", attunement: 1 },
      flags: { itensmagicos: { volume: "year-4" } }
    },
    {
      name: "Holy Avenger",
      type: "weapon",
      system: { rarity: "legendary", attunement: 1 },
      flags: { itensmagicos: { volume: "year-5" } }
    }
  ];

  // Query filter
  assert.equal(MagicItemEngine.filterItems(sampleItems, { query: "flame" }).length, 1);

  // Rarity filter
  assert.equal(MagicItemEngine.filterItems(sampleItems, { rarity: "rare" }).length, 2);

  // Type filter
  assert.equal(MagicItemEngine.filterItems(sampleItems, { type: "weapon" }).length, 2);

  // Attunement filter
  assert.equal(MagicItemEngine.filterItems(sampleItems, { attunement: "required" }).length, 3);
  assert.equal(MagicItemEngine.filterItems(sampleItems, { attunement: "none" }).length, 1);

  // Volume filter
  assert.equal(MagicItemEngine.filterItems(sampleItems, { volume: "year-4" }).length, 1);
});
