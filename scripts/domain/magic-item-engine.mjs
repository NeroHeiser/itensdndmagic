/**
 * MagicItemEngine
 * Pure domain service for magic item mechanics, attunement validation,
 * price calculations, charge parsing, and search filtering.
 */
export class MagicItemEngine {
  static RARITY_BASE_PRICES = Object.freeze({
    common: { min: 50, max: 100, standard: 100 },
    uncommon: { min: 101, max: 500, standard: 500 },
    rare: { min: 501, max: 5000, standard: 5000 },
    veryRare: { min: 5001, max: 50000, standard: 50000 },
    legendary: { min: 50001, max: 200000, standard: 100000 },
    artifact: { min: 200001, max: 500000, standard: 500000 }
  });

  /**
   * Calculates market price and recommended range for a given magic item rarity.
   * Consumable items (potions, scrolls) cost half according to official DMG rules.
   * @param {string} rarity - Item rarity identifier.
   * @param {object} [options={}]
   * @param {boolean} [options.isConsumable=false] - Whether item is consumable.
   * @returns {{min: number, max: number, standard: number}}
   */
  static calculateMarketPrice(rarity, options = {}) {
    const cleanRarity = (rarity || "common").toLowerCase().trim();
    const normalized = cleanRarity === "very rare" || cleanRarity === "veryrare" ? "veryRare" : cleanRarity;
    const base = this.RARITY_BASE_PRICES[normalized] || this.RARITY_BASE_PRICES.common;

    const divisor = options.isConsumable ? 2 : 1;

    return {
      min: Math.floor(base.min / divisor),
      max: Math.floor(base.max / divisor),
      standard: Math.floor(base.standard / divisor)
    };
  }

  /**
   * Determines maximum attunement slots for an actor based on system rules or Artificer levels.
   * @param {object} actor - Foundry Actor representation.
   * @returns {number} Maximum attunement slots (default 3, up to 6 for high-level Artificers).
   */
  static getMaxAttunementSlots(actor) {
    if (!actor) return 3;

    // Direct override from system attributes if available
    const systemMax = actor.system?.attributes?.attunement?.max;
    if (typeof systemMax === "number" && systemMax > 0) {
      return systemMax;
    }

    // Artificer Magic Item Savant / Master progression
    const items = actor.items || [];
    const artificerClass = items.find?.(i => i.type === "class" && i.name?.toLowerCase().includes("artificer"));
    const artificerLevel = Number(artificerClass?.system?.levels || 0);

    if (artificerLevel >= 18) return 6;
    if (artificerLevel >= 14) return 5;
    if (artificerLevel >= 10) return 4;

    return 3;
  }

  /**
   * Calculates currently attuned item count for an actor.
   * @param {object} actor - Foundry Actor representation.
   * @returns {number}
   */
  static getCurrentAttunedCount(actor) {
    if (!actor?.items) return 0;
    const items = Array.isArray(actor.items) ? actor.items : Array.from(actor.items.values?.() || []);

    return items.filter(i => {
      const isAttuned = i.system?.attuned === true || i.system?.attunement === 2;
      return isAttuned;
    }).length;
  }

  /**
   * Checks if an actor is eligible to attune to an item.
   * @param {object} actor - Foundry Actor representation.
   * @param {object} item - Item document.
   * @returns {{eligible: boolean, reason: string|null, currentCount: number, maxCount: number}}
   */
  static checkAttunementEligibility(actor, item) {
    const isAttunementRequired = item?.system?.attunement === 1 ||
      item?.system?.attunement === "required" ||
      String(item?.system?.description?.value || "").toLowerCase().includes("requires attunement");

    if (!isAttunementRequired) {
      return {
        eligible: true,
        reason: null,
        currentCount: this.getCurrentAttunedCount(actor),
        maxCount: this.getMaxAttunementSlots(actor)
      };
    }

    if (!actor) {
      return {
        eligible: false,
        reason: "Actor not specified",
        currentCount: 0,
        maxCount: 3
      };
    }

    const currentCount = this.getCurrentAttunedCount(actor);
    const maxCount = this.getMaxAttunementSlots(actor);

    if (currentCount >= maxCount) {
      return {
        eligible: false,
        reason: `Maximum attunement slots reached (${currentCount}/${maxCount})`,
        currentCount,
        maxCount
      };
    }

    return {
      eligible: true,
      reason: null,
      currentCount,
      maxCount
    };
  }

  /**
   * Parses charges and daily recharge mechanics from description or system fields.
   * @param {object} item - Item document.
   * @returns {{max: number, rechargeFormula: string|null, rechargeTiming: string|null}}
   */
  static parseItemCharges(item) {
    const systemUsesMax = Number(item?.system?.uses?.max || 0);
    if (systemUsesMax > 0) {
      return {
        max: systemUsesMax,
        rechargeFormula: item.system?.uses?.recovery || null,
        rechargeTiming: item.system?.uses?.per || null
      };
    }

    const desc = String(item?.system?.description?.value || "").toLowerCase();

    // Parse charges count: e.g. "has 7 charges", "has 10 charges"
    const chargesMatch = desc.match(/has\s+(\d+)\s+charges/i) || desc.match(/(\d+)\s+charges/i);
    const max = chargesMatch ? parseInt(chargesMatch[1], 10) : 0;

    // Parse daily recharge: e.g. "regains 1d6 + 1 expended charges daily at dawn"
    const rechargeMatch = desc.match(/regains\s+([^,]+?)\s+(?:expended\s+)?charges\s+daily\s+at\s+dawn/i);
    const rechargeFormula = rechargeMatch ? rechargeMatch[1].trim() : null;
    const rechargeTiming = rechargeFormula ? "dawn" : null;

    return {
      max,
      rechargeFormula,
      rechargeTiming
    };
  }

  /**
   * Filters a list of magic items based on multi-parameter search criteria.
   * @param {Array<object>} items - Collection of items.
   * @param {object} [criteria={}]
   * @param {string} [criteria.query=""] - Text search query (matches name or identifier).
   * @param {string} [criteria.rarity="all"] - Rarity filter.
   * @param {string} [criteria.type="all"] - Item type filter.
   * @param {string} [criteria.attunement="all"] - Attunement filter ("all", "required", "none").
   * @param {string} [criteria.volume="all"] - Volume filter.
   * @returns {Array<object>}
   */
  static filterItems(items = [], criteria = {}) {
    const query = (criteria.query || "").trim().toLowerCase();
    const rarity = (criteria.rarity || "all").toLowerCase();
    const type = (criteria.type || "all").toLowerCase();
    const attunement = (criteria.attunement || "all").toLowerCase();
    const volume = (criteria.volume || "all").toLowerCase();

    return items.filter(item => {
      // 1. Text Query Filter
      if (query.length > 0) {
        const name = (item.name || "").toLowerCase();
        const identifier = (item.system?.identifier || "").toLowerCase();
        if (!name.includes(query) && !identifier.includes(query)) {
          return false;
        }
      }

      // 2. Rarity Filter
      if (rarity !== "all") {
        const itemRarity = (item.system?.rarity || "common").toLowerCase();
        if (itemRarity !== rarity) {
          return false;
        }
      }

      // 3. Type Filter
      if (type !== "all") {
        const itemType = (item.type || "equipment").toLowerCase();
        if (itemType !== type) {
          return false;
        }
      }

      // 4. Attunement Filter
      if (attunement !== "all") {
        const isAttuned = item.system?.attunement === 1 || item.system?.attunement === "required";
        if (attunement === "required" && !isAttuned) return false;
        if (attunement === "none" && isAttuned) return false;
      }

      // 5. Volume Filter
      if (volume !== "all") {
        const itemVolume = (item.flags?.itensmagicos?.volume || "").toLowerCase();
        if (!itemVolume.includes(volume)) {
          return false;
        }
      }

      return true;
    });
  }
}
