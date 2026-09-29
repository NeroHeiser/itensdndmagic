import test from "node:test";
import assert from "node:assert/strict";
import { MidiQOLCompat } from "../scripts/midi-qol-compat.mjs";

test("resolveItemSourceId returns custom module sourceId when present in flags", () => {
  const item = {
    _id: "randomitemid0001",
    flags: {
      itensmagicos: {
        sourceId: "canonicalid00001"
      }
    }
  };

  assert.equal(MidiQOLCompat.resolveItemSourceId(item), "canonicalid00001");
});

test("resolveItemSourceId extracts item ID from _stats.compendiumSource", () => {
  const item = {
    _id: "randomitemid0002",
    _stats: {
      compendiumSource: "Compendium.itensmagicos.magic-items.Item.canonicalid00002"
    }
  };

  assert.equal(MidiQOLCompat.resolveItemSourceId(item), "canonicalid00002");
});

test("resolveItemSourceId extracts item ID from flags.core.sourceId", () => {
  const item = {
    _id: "randomitemid0003",
    flags: {
      core: {
        sourceId: "Compendium.itensmagicos.magic-items.Item.canonicalid00003"
      }
    }
  };

  assert.equal(MidiQOLCompat.resolveItemSourceId(item), "canonicalid00003");
});

test("resolveItemSourceId falls back to _id or id when no compendium flags exist", () => {
  assert.equal(MidiQOLCompat.resolveItemSourceId({ _id: "fallbackid000001" }), "fallbackid000001");
  assert.equal(MidiQOLCompat.resolveItemSourceId({ id: "fallbackid000002" }), "fallbackid000002");
});

test("resolveItemSourceId returns null for invalid or null items", () => {
  assert.equal(MidiQOLCompat.resolveItemSourceId(null), null);
  assert.equal(MidiQOLCompat.resolveItemSourceId(undefined), null);
  assert.equal(MidiQOLCompat.resolveItemSourceId({}), null);
});
