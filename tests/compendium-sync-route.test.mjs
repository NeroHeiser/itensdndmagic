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

test("CompendiumSync.chunkArray splits arrays cleanly into chunks", () => {
  assert.deepEqual(CompendiumSync.chunkArray([], 50), []);
  assert.deepEqual(CompendiumSync.chunkArray(null, 50), []);

  const items = Array.from({ length: 550 }, (_, i) => ({ id: i }));
  const chunks = CompendiumSync.chunkArray(items, 200);

  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].length, 200);
  assert.equal(chunks[1].length, 200);
  assert.equal(chunks[2].length, 150);
});

test("CompendiumSync.chunkArray enforces positive integer minimum size", () => {
  const items = [1, 2, 3];
  const chunks = CompendiumSync.chunkArray(items, 0);

  assert.equal(chunks.length, 3);
  assert.deepEqual(chunks, [[1], [2], [3]]);
});

