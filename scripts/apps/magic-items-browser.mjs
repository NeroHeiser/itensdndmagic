import { MagicItemEngine } from "../domain/magic-item-engine.mjs";
import { CompendiumSync } from "../compendium-sync.mjs";

const MODULE_ID = "itensmagicos";

const BaseApplication = typeof foundry !== "undefined" && foundry.applications?.api?.ApplicationV2
  ? foundry.applications.api.ApplicationV2
  : class FakeApplicationV2 {
      constructor(options = {}) {
        this.options = options;
      }
      render() { return this; }
    };

/**
 * Interactive Magic Items Browser application using ApplicationV2.
 * Provides real-time search, filters by rarity, type, attunement, volume,
 * and direct one-click item granting to selected actor sheets.
 */
export class MagicItemsBrowserApp extends BaseApplication {
  constructor(options = {}) {
    super(options);

    this.searchQuery = "";
    this.selectedRarity = "all";
    this.selectedType = "all";
    this.selectedAttunement = "all";
    this.selectedVolume = "all";
    this.selectedItemId = null;
    this.selectedActorId = null;

    this._itemsCache = null;
    this._preserveSearchFocus = false;
    this.searchDebounceMs = 120;
    this._searchTimeout = null;
  }

  static DEFAULT_OPTIONS = {
    id: "itensmagicos-browser",
    classes: ["itensmagicos", "magic-items-browser"],
    tag: "div",
    window: {
      title: "ITENSMAGICOS.Browser.Title",
      icon: "fas fa-hat-wizard",
      resizable: true
    },
    position: {
      width: 960,
      height: 680
    },
    actions: {
      selectItem: MagicItemsBrowserApp.#onSelectItem,
      grantItem: MagicItemsBrowserApp.#onGrantItem,
      setFilter: MagicItemsBrowserApp.#onSetFilter,
      clearFilters: MagicItemsBrowserApp.#onClearFilters,
      selectActor: MagicItemsBrowserApp.#onSelectActor
    }
  };

  static PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/magic-items-browser.hbs`
    }
  };

  /**
   * Fetches and caches magic items from compendium or static JSON data.
   * @returns {Promise<Array<object>>}
   */
  async getItems() {
    if (this._itemsCache && this._itemsCache.length > 0) {
      return this._itemsCache;
    }

    const isPt = typeof game !== "undefined" && game.i18n?.lang?.startsWith("pt");
    const langFolder = isPt ? "pt-BR" : "en";

    try {
      const dataUrl = CompendiumSync.resolveBaseRoute(`scripts/data/${langFolder}/magic-items.json`);
      const response = await fetch(dataUrl);
      if (response.ok) {
        this._itemsCache = await response.json();
        return this._itemsCache;
      }
    } catch {
      // Fallback to empty if fetch fails
    }

    return [];
  }

  /**
   * Prepares context data for Handlebars rendering.
   * @param {object} [options={}]
   * @returns {Promise<object>}
   */
  async _prepareContext(options = {}) {
    const rawItems = await this.getItems();

    const filteredItems = MagicItemEngine.filterItems(rawItems, {
      query: this.searchQuery,
      rarity: this.selectedRarity,
      type: this.selectedType,
      attunement: this.selectedAttunement,
      volume: this.selectedVolume
    });

    // Auto-select first item if current selection is invalid
    if (!this.selectedItemId && filteredItems.length > 0) {
      this.selectedItemId = filteredItems[0]._id;
    } else if (this.selectedItemId && !filteredItems.some(i => i._id === this.selectedItemId)) {
      this.selectedItemId = filteredItems[0]?._id || null;
    }

    const selectedItem = rawItems.find(i => i._id === this.selectedItemId) || null;

    // Available target actors
    const actors = typeof game !== "undefined" && game.actors
      ? game.actors.filter(a => (a.type === "character" || a.type === "npc") && a.isOwner)
      : [];

    if (!this.selectedActorId && actors.length > 0) {
      this.selectedActorId = actors[0].id;
    }

    const targetActor = actors.find(a => a.id === this.selectedActorId) || null;
    const attunementStatus = targetActor && selectedItem
      ? MagicItemEngine.checkAttunementEligibility(targetActor, selectedItem)
      : null;

    const priceInfo = selectedItem
      ? MagicItemEngine.calculateMarketPrice(selectedItem.system?.rarity, {
          isConsumable: selectedItem.type === "consumable"
        })
      : null;

    return {
      searchQuery: this.searchQuery,
      selectedRarity: this.selectedRarity,
      selectedType: this.selectedType,
      selectedAttunement: this.selectedAttunement,
      selectedVolume: this.selectedVolume,
      totalCount: rawItems.length,
      filteredCount: filteredItems.length,
      items: filteredItems.slice(0, 100), // Render top 100 to prevent heavy DOM rendering
      selectedItem,
      selectedItemId: this.selectedItemId,
      priceInfo,
      actors,
      selectedActorId: this.selectedActorId,
      attunementStatus
    };
  }

  /**
   * Attaches interactive DOM listeners and preserves search input focus.
   * @param {object} context
   * @param {object} options
   */
  _onRender(context, options) {
    const html = this.element;
    if (!html) return;

    const searchInput = html.querySelector("input[name='searchQuery']");
    if (searchInput) {
      if (this._preserveSearchFocus) {
        searchInput.focus();
        const len = searchInput.value.length;
        searchInput.setSelectionRange(len, len);
        this._preserveSearchFocus = false;
      }

      searchInput.addEventListener("input", event => {
        this.searchQuery = event.target.value;
        this._preserveSearchFocus = true;

        if (this._searchTimeout) clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => {
          this.render();
        }, this.searchDebounceMs);
      });
    }

    // Dropdown filters change listeners
    const raritySelect = html.querySelector("select[name='filterRarity']");
    if (raritySelect) {
      raritySelect.addEventListener("change", event => {
        this.selectedRarity = event.target.value;
        this.render();
      });
    }

    const typeSelect = html.querySelector("select[name='filterType']");
    if (typeSelect) {
      typeSelect.addEventListener("change", event => {
        this.selectedType = event.target.value;
        this.render();
      });
    }

    const attunementSelect = html.querySelector("select[name='filterAttunement']");
    if (attunementSelect) {
      attunementSelect.addEventListener("change", event => {
        this.selectedAttunement = event.target.value;
        this.render();
      });
    }

    const volumeSelect = html.querySelector("select[name='filterVolume']");
    if (volumeSelect) {
      volumeSelect.addEventListener("change", event => {
        this.selectedVolume = event.target.value;
        this.render();
      });
    }

    const actorSelect = html.querySelector("select[name='targetActor']");
    if (actorSelect) {
      actorSelect.addEventListener("change", event => {
        this.selectedActorId = event.target.value;
        this.render();
      });
    }
  }

  static #onSelectItem(event, target) {
    const itemId = target.dataset.itemId;
    if (!itemId) return;
    this.selectedItemId = itemId;
    this.render();
  }

  static #onSelectActor(event, target) {
    this.selectedActorId = target.value;
    this.render();
  }

  static #onSetFilter(event, target) {
    const filterName = target.dataset.filter;
    const filterValue = target.dataset.value;
    if (filterName && filterValue) {
      this[filterName] = filterValue;
      this.render();
    }
  }

  static #onClearFilters() {
    this.searchQuery = "";
    this.selectedRarity = "all";
    this.selectedType = "all";
    this.selectedAttunement = "all";
    this.selectedVolume = "all";
    this.render();
  }

  /**
   * Grants a magic item to a designated actor sheet with defensive cloning.
   * @param {string} [itemId=this.selectedItemId]
   * @param {string} [actorId=this.selectedActorId]
   * @returns {Promise<Array<object>|null>}
   */
  async grantItem(itemId = this.selectedItemId, actorId = this.selectedActorId) {
    if (!itemId) return null;

    const items = await this.getItems();
    const itemData = items.find(i => i._id === itemId);
    if (!itemData) return null;

    const actor = typeof game !== "undefined" && game.actors ? game.actors.get(actorId) : null;
    if (!actor) {
      if (typeof ui !== "undefined" && ui.notifications) {
        ui.notifications.warn(game.i18n.localize("ITENSMAGICOS.Browser.NoActorSelected"));
      }
      return null;
    }

    // Defensive cloning to prevent mutating cached item reference in memory
    const clonedData = typeof foundry !== "undefined" && foundry.utils?.duplicate
      ? foundry.utils.duplicate(itemData)
      : JSON.parse(JSON.stringify(itemData));

    // Remove compendium _id so Foundry creates a fresh embedded document ID on the actor
    delete clonedData._id;

    const created = await actor.createEmbeddedDocuments("Item", [clonedData]);

    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.info(game.i18n.format("ITENSMAGICOS.Browser.ItemGranted", {
        item: itemData.name,
        actor: actor.name
      }));
    }

    return created;
  }

  static async #onGrantItem(event, target) {
    const itemId = target.dataset.itemId || this.selectedItemId;
    await this.grantItem(itemId, this.selectedActorId);
  }
}
