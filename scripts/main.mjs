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

  // Register settings menu for manual compendium synchronization (GM restricted)
  game.settings?.registerMenu?.(MODULE_ID, "syncMenu", {
    name: "ITENSMAGICOS.Settings.SyncMenu.Name",
    label: "ITENSMAGICOS.Settings.SyncMenu.Label",
    hint: "ITENSMAGICOS.Settings.SyncMenu.Hint",
    icon: "fas fa-sync-alt",
    type: class SyncCompendiumsForm extends (typeof FormApplication !== "undefined" ? FormApplication : class {}) {
      static get defaultOptions() {
        return typeof foundry !== "undefined" && foundry.utils?.mergeObject
          ? foundry.utils.mergeObject(super.defaultOptions, {
              title: game.i18n.localize("ITENSMAGICOS.Compendium.SyncDialogTitle"),
              template: "templates/generic-form.html",
              width: 400,
              height: "auto"
            })
          : {};
      }
      async render() {
        if (typeof Dialog !== "undefined") {
          new Dialog({
            title: game.i18n.localize("ITENSMAGICOS.Compendium.SyncDialogTitle"),
            content: `<p>${game.i18n.localize("ITENSMAGICOS.Compendium.SyncDialogContent")}</p>`,
            buttons: {
              confirm: {
                icon: '<i class="fas fa-sync"></i>',
                label: game.i18n.localize("ITENSMAGICOS.Compendium.SyncNow"),
                callback: async () => {
                  ui.notifications?.info(game.i18n.localize("ITENSMAGICOS.Compendium.SyncStart"));
                  await CompendiumSync.syncAll({ force: true });
                  ui.notifications?.info(game.i18n.localize("ITENSMAGICOS.Compendium.SyncSuccess"));
                }
              },
              cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("ITENSMAGICOS.Compendium.Cancel")
              }
            },
            default: "confirm"
          }).render(true);
        }
      }
    },
    restricted: true
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
      openBrowser: (options = {}) => new MagicItemsBrowserApp(options).render({ force: true }),
      syncCompendiums: (options = {}) => CompendiumSync.syncAll({ force: true, ...options })
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
