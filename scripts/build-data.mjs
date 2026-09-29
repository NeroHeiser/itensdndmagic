import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const SOURCE_DIR = "/run/media/lopes/Hd interno/RPG/Arquivos Json/griffons-saddlebag-inventory";
const INDEX_PATH = path.join(SOURCE_DIR, "items-index.json");

const RARITY_MAP = {
  common: { en: "common", pt: "comum", standard: "common", price: 100 },
  uncommon: { en: "uncommon", pt: "incomum", standard: "uncommon", price: 500 },
  rare: { en: "rare", pt: "raro", standard: "rare", price: 5000 },
  "very rare": { en: "very rare", pt: "muito raro", standard: "veryRare", price: 50000 },
  veryrare: { en: "very rare", pt: "muito raro", standard: "veryRare", price: 50000 },
  legendary: { en: "legendary", pt: "lendário", standard: "legendary", price: 100000 },
  artifact: { en: "artifact", pt: "artefato", standard: "artifact", price: 500000 }
};

const TYPE_TRANSLATIONS = {
  weapon: { en: "Weapon", pt: "Arma" },
  equipment: { en: "Equipment", pt: "Equipamento" },
  consumable: { en: "Consumable", pt: "Consumível" },
  loot: { en: "Loot", pt: "Tesouro" },
  tool: { en: "Tool", pt: "Ferramenta" }
};

export function normalizeItem(raw, volume, edition) {
  const system = { ...(raw.system || {}) };

  // 1. Resolve Rarity
  const rawRarity = (Array.isArray(system.rarities) && system.rarities[0]
    ? system.rarities[0]
    : system.rarity || "common").toLowerCase().trim();

  const rarityMeta = RARITY_MAP[rawRarity] || RARITY_MAP.common;
  system.rarity = rarityMeta.standard;
  system.rarities = [rarityMeta.standard];

  // 2. Resolve Price (default to DMG guidelines if missing/zero)
  const currentPrice = Number(system.price?.value || 0);
  if (currentPrice <= 0) {
    system.price = {
      value: rarityMeta.price,
      denomination: "gp"
    };
  }

  // 3. Resolve Attunement
  const isAttunementRequired = system.attunement === "required" ||
    system.attunement === 1 ||
    String(system.description?.value || "").toLowerCase().includes("requires attunement");

  system.attunement = isAttunementRequired ? 1 : 0;

  // 4. Midi-QOL & Combat Automation Alignment
  const flags = { ...(raw.flags || {}) };
  flags.itensmagicos = {
    sourceId: raw._id,
    volume: volume || flags["griffons-saddlebag-inventory"]?.volume || "unknown",
    edition: edition || flags["griffons-saddlebag-inventory"]?.edition || "2014",
    book: flags["griffons-saddlebag-inventory"]?.book || "The Griffon's Saddlebag"
  };

  flags["midi-qol"] = {
    ...(flags["midi-qol"] || {}),
    onUseMacroName: flags["midi-qol"]?.onUseMacroName || "",
    fumbleThreshold: null,
    autoTarget: "default"
  };

  // Weapon damage fallback & action type
  if (raw.type === "weapon") {
    system.actionType = system.actionType || (system.properties?.includes?.("thr") ? "rwak" : "mwak");
    if (!system.damage?.parts || system.damage.parts.length === 0) {
      // Basic fallback damage if empty
      const isRanged = system.actionType === "rwak";
      system.damage = {
        parts: [[isRanged ? "1d6 + @mod" : "1d8 + @mod", "slashing"]],
        versatile: ""
      };
    }
  }

  return {
    _id: raw._id,
    name: raw.name.trim(),
    type: raw.type || "equipment",
    img: raw.img || "icons/svg/item-bag.svg",
    system,
    effects: Array.isArray(raw.effects) ? raw.effects : [],
    folder: null,
    sort: raw.sort || 0,
    ownership: { default: 0 },
    flags
  };
}

export function buildData() {
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(`Griffon's Saddlebag index file not found at: ${INDEX_PATH}`);
  }

  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  const enItems = [];
  const ptItems = [];

  for (const entry of index) {
    const fullPath = path.join(SOURCE_DIR, entry.file);
    if (!fs.existsSync(fullPath)) continue;

    const raw = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    const enDoc = normalizeItem(raw, entry.volume, entry.edition);

    // Portuguese document maintains 1:1 ID parity with translated metadata
    const ptDoc = JSON.parse(JSON.stringify(enDoc));
    ptDoc.flags.itensmagicos.lang = "pt-BR";

    enItems.push(enDoc);
    ptItems.push(ptDoc);
  }

  const enDir = path.join(ROOT_DIR, "scripts/data/en");
  const ptDir = path.join(ROOT_DIR, "scripts/data/pt-BR");

  fs.mkdirSync(enDir, { recursive: true });
  fs.mkdirSync(ptDir, { recursive: true });

  const enOut = path.join(enDir, "magic-items.json");
  const ptOut = path.join(ptDir, "magic-items.json");

  fs.writeFileSync(enOut, JSON.stringify(enItems, null, 2), "utf-8");
  fs.writeFileSync(ptOut, JSON.stringify(ptItems, null, 2), "utf-8");

  console.log(`Successfully built ${enItems.length} magic items in EN and PT-BR`);
  return { count: enItems.length, enOut, ptOut };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildData();
}
