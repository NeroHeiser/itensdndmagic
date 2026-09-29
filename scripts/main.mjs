import { CompendiumSync } from "./compendium-sync.mjs";
import { MidiQOLCompat } from "./midi-qol-compat.mjs";

const MODULE_ID = "itensmagicos";

/**
 * Foundry VTT Initialization Hook (init).
 */
Hooks.once("init", () => {
  console.log("Itens Mágicos | Initializing module...");
});

/**
 * Foundry VTT Ready Hook (ready).
 */
Hooks.once("ready", () => {
  console.log("Itens Mágicos | Module ready for use.");

  CompendiumSync.init();
  MidiQOLCompat.init();

  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = {
      MODULE_ID,
      CompendiumSync,
      MidiQOLCompat
    };
  }
});
