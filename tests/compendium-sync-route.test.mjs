import test from "node:test";
import assert from "node:assert/strict";
import { CompendiumSync } from "../scripts/compendium-sync.mjs";

test("resolveBaseRoute uses foundry.utils.getRoute when present", () => {
  const originalFoundry = globalThis.foundry;

  try {
    globalThis.foundry = {
      utils: {
        getRoute: (path) => `/custom-prefix/${path}`
      }
    };

    const route = CompendiumSync.resolveBaseRoute("scripts/data/en/magic-items.json");
    assert.equal(route, "/custom-prefix/modules/itensmagicos/scripts/data/en/magic-items.json");
  } finally {
    globalThis.foundry = originalFoundry;
  }
});

test("resolveBaseRoute falls back to leading slash module path without foundry global", () => {
  const originalFoundry = globalThis.foundry;

  try {
    delete globalThis.foundry;

    const route = CompendiumSync.resolveBaseRoute("scripts/data/en/magic-items.json");
    assert.equal(route, "/modules/itensmagicos/scripts/data/en/magic-items.json");
  } finally {
    globalThis.foundry = originalFoundry;
  }
});
