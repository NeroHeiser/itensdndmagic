const MODULE_ID = "itensmagicos";

/**
 * Compendium synchronization manager for Itens Mágicos.
 * Ensures compendiums are properly populated and resolves proxy routes safely.
 */
export class CompendiumSync {
  static PACKS = [
    {
      id: "magic-items",
      file: "magic-items.json",
      documentName: "Item",
      label: "Magic Items"
    }
  ];

  /**
   * Resolves the base module route respecting proxy prefixes.
   * @param {string} [subpath=""] - Optional subpath to append.
   * @returns {string}
   */
  static resolveBaseRoute(subpath = "") {
    const cleanSubpath = subpath.replace(/^\/+/, "");
    const baseModulePath = cleanSubpath ? `modules/${MODULE_ID}/${cleanSubpath}` : `modules/${MODULE_ID}`;

    if (typeof foundry !== "undefined" && foundry.utils?.getRoute) {
      return foundry.utils.getRoute(baseModulePath);
    }
    return `/${baseModulePath}`;
  }

  /**
   * Initializes compendium synchronization on the ready hook.
   */
  static init() {
    Hooks.once("ready", async () => {
      if (!game.user.isGM) return;

      try {
        await this.syncAll();
      } catch (err) {
        console.error(`Itens Mágicos | Error synchronizing compendiums:`, err);
      }
    });
  }

  /**
   * Synchronizes all registered compendium packs with their JSON data sources.
   * @param {object} [options={}]
   * @param {boolean} [options.force=false] - Force repopulation even if pack is not empty.
   * @returns {Promise<number>} - Count of synchronized packs.
   */
  static async syncAll(options = {}) {
    const isPt = typeof game !== "undefined" && game.i18n?.lang?.startsWith("pt");
    const langFolder = isPt ? "pt-BR" : "en";
    let syncedCount = 0;

    for (const packDef of this.PACKS) {
      const fullPackKey = `${MODULE_ID}.${packDef.id}`;
      const pack = game.packs.get(fullPackKey);

      if (!pack) {
        console.warn(`Itens Mágicos | Pack '${fullPackKey}' not found in game.packs.`);
        continue;
      }

      const index = await pack.getIndex();
      if (index.size > 0 && !options.force) {
        continue;
      }

      const dataUrl = this.resolveBaseRoute(`scripts/data/${langFolder}/${packDef.file}`);
      const response = await fetch(dataUrl);

      if (!response.ok) {
        console.error(`Itens Mágicos | Failed to fetch data from ${dataUrl}: ${response.statusText}`);
        continue;
      }

      const documents = await response.json();
      console.log(`Itens Mágicos | Populating compendium '${packDef.id}' with ${documents.length} items (${langFolder})...`);

      if (options.force && index.size > 0) {
        const docIds = Array.from(index.keys());
        for (const id of docIds) {
          const doc = await pack.getDocument(id);
          if (doc) await doc.delete();
        }
      }

      const DocumentClass = getDocumentClass(packDef.documentName);
      await DocumentClass.createDocuments(documents, { pack: pack.collection, keepId: true });
      syncedCount++;
    }

    return syncedCount;
  }
}
