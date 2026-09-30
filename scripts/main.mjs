import { CompendiumSync } from "./compendium-sync.mjs";
import { MidiQOLCompat } from "./midi-qol-compat.mjs";
import { MagicItemEngine } from "./domain/magic-item-engine.mjs";
import { MagicItemsBrowserApp } from "./apps/magic-items-browser.mjs";

const MODULE_ID = "itensmagicos";

/**
 * Foundry VTT Initialization Hook (init).
 */
Hooks.once("init", () => {
  console.log("Itens Mágicos | Initializing module...");

  CompendiumSync.init();
  MidiQOLCompat.init();

  // Register settings menu for browser access
  game.settings?.registerMenu?.(MODULE_ID, "browserMenu", {
    name: "ITENSMAGICOS.Browser.Title",
    label: "ITENSMAGICOS.Browser.Title",
    hint: "ITENSMAGICOS.Description",
    icon: "fas fa-hat-wizard",
    type: MagicItemsBrowserApp,
    restricted: false
  });
});

/**
 * Foundry VTT Ready Hook (ready).
 */
Hooks.once("ready", () => {
  console.log("Itens Mágicos | Module ready for use.");

  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = {
      MODULE_ID,
      CompendiumSync,
      MidiQOLCompat,
      MagicItemEngine,
      MagicItemsBrowserApp,
      openBrowser: (options = {}) => new MagicItemsBrowserApp(options).render({ force: true })
    };
  }
});

/**
 * Injects shortcut button inside the Item Directory sidebar header.
 */
Hooks.on("renderItemDirectory", (app, html) => {
  const container = html[0] || html;
  if (!container?.querySelector) return;

  const headerActions = container.querySelector(".header-actions");
  if (headerActions && !container.querySelector(".itensmagicos-open-browser-btn")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "itensmagicos-open-browser-btn";
    button.innerHTML = `<i class="fas fa-hat-wizard"></i> ${game.i18n.localize("ITENSMAGICOS.Browser.Title")}`;
    button.addEventListener("click", () => new MagicItemsBrowserApp().render({ force: true }));
    headerActions.appendChild(button);
  }
});
