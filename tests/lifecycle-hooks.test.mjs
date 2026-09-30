import test from "node:test";
import assert from "node:assert/strict";
import { CompendiumSync } from "../scripts/compendium-sync.mjs";
import { MidiQOLCompat } from "../scripts/midi-qol-compat.mjs";

test("CompendiumSync.init registers ready hook when game.ready is not true", () => {
  const originalHooks = globalThis.Hooks;
  const originalGame = globalThis.game;

  let hookRegistered = null;
  let hookCallback = null;

  try {
    globalThis.Hooks = {
      once: (hookName, cb) => {
        hookRegistered = hookName;
        hookCallback = cb;
      }
    };
    globalThis.game = { ready: false };

    CompendiumSync.init();

    assert.equal(hookRegistered, "ready");
    assert.equal(typeof hookCallback, "function");
  } finally {
    globalThis.Hooks = originalHooks;
    globalThis.game = originalGame;
  }
});

test("CompendiumSync.init executes immediately when game.ready is true", async () => {
  const originalHooks = globalThis.Hooks;
  const originalGame = globalThis.game;
  const originalSyncAll = CompendiumSync.syncAll;

  let syncAllCalled = false;
  let hookRegistered = null;

  try {
    globalThis.Hooks = {
      once: (hookName) => {
        hookRegistered = hookName;
      }
    };
    globalThis.game = {
      ready: true,
      user: { isGM: true }
    };

    CompendiumSync.syncAll = async () => {
      syncAllCalled = true;
      return 1;
    };

    CompendiumSync.init();

    assert.equal(hookRegistered, null);
    assert.equal(syncAllCalled, true);
  } finally {
    globalThis.Hooks = originalHooks;
    globalThis.game = originalGame;
    CompendiumSync.syncAll = originalSyncAll;
  }
});

test("MidiQOLCompat.init registers ready hook when game.ready is not true", () => {
  const originalHooks = globalThis.Hooks;
  const originalGame = globalThis.game;

  let hookRegistered = null;
  let hookCallback = null;

  try {
    globalThis.Hooks = {
      once: (hookName, cb) => {
        hookRegistered = hookName;
        hookCallback = cb;
      }
    };
    globalThis.game = { ready: false };

    MidiQOLCompat.init();

    assert.equal(hookRegistered, "ready");
    assert.equal(typeof hookCallback, "function");
  } finally {
    globalThis.Hooks = originalHooks;
    globalThis.game = originalGame;
  }
});

test("MidiQOLCompat.init executes immediately when game.ready is true", () => {
  const originalHooks = globalThis.Hooks;
  const originalGame = globalThis.game;
  const originalSetup = MidiQOLCompat._setupMidiHooks;

  let setupMidiHooksCalled = false;
  let hookRegistered = null;

  try {
    globalThis.Hooks = {
      once: (hookName) => {
        hookRegistered = hookName;
      }
    };
    globalThis.game = {
      ready: true,
      modules: {
        get: (id) => (id === "midi-qol" ? { active: true } : null)
      }
    };

    MidiQOLCompat._setupMidiHooks = () => {
      setupMidiHooksCalled = true;
    };

    MidiQOLCompat.init();

    assert.equal(hookRegistered, null);
    assert.equal(setupMidiHooksCalled, true);
  } finally {
    globalThis.Hooks = originalHooks;
    globalThis.game = originalGame;
    MidiQOLCompat._setupMidiHooks = originalSetup;
  }
});
