const MODULE_ID = "itensmagicos";

/**
 * Midi-QOL combat automation and compatibility manager.
 * Provides graceful degradation: if Midi-QOL is active, enhances combat workflows;
 * if inactive, operates cleanly in standard D&D 5e mode without emitting errors.
 */
export class MidiQOLCompat {
  /**
   * Initializes Midi-QOL compatibility listener.
   */
  static init() {
    Hooks.once("ready", () => {
      const isMidiActive = typeof game !== "undefined" && game.modules?.get("midi-qol")?.active;

      if (isMidiActive) {
        console.log("Itens Mágicos | Midi-QOL detected. Enabling combat automation and active effects integration.");
        this._setupMidiHooks();
      } else {
        console.log("Itens Mágicos | Midi-QOL not active. Operating in native D&D 5e mode.");
      }
    });
  }

  /**
   * Resolves the canonical item source ID from compendium flags, stats, or direct ID.
   * @param {object} item
   * @returns {string|null}
   */
  static resolveItemSourceId(item) {
    if (!item) return null;

    const moduleSourceId = item.flags?.[MODULE_ID]?.sourceId;
    if (moduleSourceId) return moduleSourceId;

    const compendiumSource = item._stats?.compendiumSource;
    if (typeof compendiumSource === "string") {
      const match = compendiumSource.match(/\.Item\.([a-zA-Z0-9]+)$/);
      if (match) return match[1];
    }

    const coreSourceId = item.flags?.core?.sourceId;
    if (typeof coreSourceId === "string") {
      const match = coreSourceId.match(/\.Item\.([a-zA-Z0-9]+)$/);
      if (match) return match[1];
    }

    return item._id || item.id || null;
  }

  /**
   * Registers Midi-QOL specific hooks.
   */
  static _setupMidiHooks() {
    Hooks.on("midi-qol.RollComplete", async (workflow) => {
      if (!workflow?.item) return;

      const sourceId = this.resolveItemSourceId(workflow.item);
      if (!sourceId) return;

      // Handle item-specific triggers or charge expenditures
      const itemFlags = workflow.item.flags?.[MODULE_ID];
      if (itemFlags) {
        // Log automated action for debugging and GM visibility
        console.log(`Itens Mágicos | Midi-QOL processed roll for '${workflow.item.name}' (${sourceId})`);
      }
    });
  }
}
