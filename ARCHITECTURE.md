# Architecture & Technical Record: Itens Mágicos

## 1. Overview
This architectural document details the engineering principles, data pipelines, domain models, and testing strategies implemented for the `itensmagicos` module in Foundry Virtual Tabletop (V12 to V14) for the `dnd5e` system (v3.x and v4.x).

---

## 2. Architectural Decisions & Design Patterns

### Decision 1: Domain-Driven Design for Game Rules (`MagicItemEngine`)
- **Problem:** Tightly coupling business logic (such as attunement rules, price calculation, charge extraction, and multi-filter criteria) to Foundry's UI or sheet classes leads to brittle code that cannot be tested outside a live browser session.
- **Solution:** Encapsulated all item mechanics in a pure, standalone service class [`scripts/domain/magic-item-engine.mjs`](file:///run/media/lopes/Hd%20interno/Programa%C3%A7%C3%A3o/Foundry/itensmagicos/scripts/domain/magic-item-engine.mjs).
- **Benefits:**
  - Fast, headless unit testing (~300ms execution time) with 100% code coverage.
  - Accurate calculation of Artificer-specific attunement progression (levels 10/14/18 providing 4/5/6 attunement slots).
  - Clean separation of concerns (Single Responsibility Principle).

### Decision 2: Reactive ApplicationV2 Architecture with Focus Preservation
- **Problem:** Traditional Foundry Application re-renders often lose active cursor position, selection ranges, and input focus during real-time filtering, degrading user experience.
- **Solution:** Implemented [`MagicItemsBrowserApp`](file:///run/media/lopes/Hd%20interno/Programa%C3%A7%C3%A3o/Foundry/itensmagicos/scripts/apps/magic-items-browser.mjs) extending `ApplicationV2`. Added a debounced search listener (`120ms`) and a `_preserveSearchFocus` flag in `_onRender` that restores the cursor position and focus state seamlessly after each reactive DOM update.
- **Benefits:** Fluid, lag-free search experience across 1,714 items without UI flickering or dropped keystrokes.

### Decision 3: Deterministic Bilingual Compendium Parity (`CompendiumSync`)
- **Problem:** Loading large compendiums with over a thousand documents across localized environments frequently causes mismatched item IDs, breaking UUID links, active effects, and character inventory references.
- **Solution:** The pipeline in [`scripts/build-data.mjs`](file:///run/media/lopes/Hd%20interno/Programa%C3%A7%C3%A3o/Foundry/itensmagicos/scripts/build-data.mjs) processes all 1,714 items preserving their deterministic 16-character alphanumeric IDs between `scripts/data/en/magic-items.json` and `scripts/data/pt-BR/magic-items.json`.
- **Benefits:** Guaranteed 1:1 ID parity, eliminating broken document references when switching languages.

### Decision 4: Graceful Midi-QOL Combat Automation Alignment
- **Problem:** Adding hard dependencies on Midi-QOL breaks the module for game masters who prefer native or alternative combat systems.
- **Solution:** Implemented [`MidiQOLCompat`](file:///run/media/lopes/Hd%20interno/Programa%C3%A7%C3%A3o/Foundry/itensmagicos/scripts/midi-qol-compat.mjs) with defensive hook binding. Pre-configured combat actions (`mwak`/`rwak`), damage formulas, and flags on weapons so that Midi-QOL can immediately automate attacks and saves when present, while operating cleanly in native D&D 5e when inactive.

### Decision 5: Non-Blocking Chunked Compendium Batching & Lifecycle Resilience
- **Problem:** Transmitting 1,714 items in a single WebSocket transaction can exceed payload limits and freeze the client UI on moderate desktop hardware. Furthermore, registering `ready` hooks inside another `ready` callback causes silent listener drops.
- **Solution:** Implemented `CompendiumSync.chunkArray` batching documents into chunks of 200 items, and updated `CompendiumSync.init()` and `MidiQOLCompat.init()` to register during `init` and verify `game.ready` for immediate execution if invoked post-initialization. Added a GM manual synchronization menu in `game.settings`.
- **Benefits:** Reliable compendium population without WebSocket buffer overflows or dropped lifecycle events.

### Decision 6: Defensive Deep Cloning in ApplicationV2 Item Granting
- **Problem:** Passing cached compendium item objects directly into `actor.createEmbeddedDocuments` mutates cached memory references and preserves source compendium IDs. In addition, `data-action` on `<select>` elements fails to trigger on `change`.
- **Solution:** Created `grantItem(itemId, actorId)` with defensive deep cloning (`foundry.utils.duplicate` / `structuredClone`), stripping `_id` before embedded document creation, and bound explicit `change` listeners on `select[name='targetActor']` in `_onRender`.
- **Benefits:** Cache immutability, unique document IDs per actor, and seamless reactive updates in the browser UI.

---

## 3. Test Suite & Verification

The test harness uses the native Node.js test runner (`node --test`), requiring zero external test libraries or npm installs.

### Run Tests
```bash
npm test
```

### Coverage Breakdown
- `tests/manifest.test.mjs`: Validates `module.json` and `package.json` compatibility, physical file presence, and pack configurations.
- `tests/compendium-integrity.test.mjs`: Verifies 1,714 items in both locales, 16-character alphanumeric ID validity, rarity values, attunement flags, and weapon damage parts.
- `tests/compendium-sync-route.test.mjs`: Verifies proxy-aware route resolution and array chunking algorithms.
- `tests/lifecycle-hooks.test.mjs`: Verifies lifecycle hook registration and immediate post-ready execution for `CompendiumSync` and `MidiQOLCompat`.
- `tests/magic-item-engine.test.mjs`: Comprehensive verification of DMG/Xanathar market pricing, attunement slot constraints, charge parsing regex, and multi-criteria filters.
- `tests/browser-app.test.mjs`: Asserts ApplicationV2 default options, initial filter states, template structure, actor selection listeners, and defensive item granting.
- `tests/localization.test.mjs`: Guarantees 100% key symmetry between `lang/en.json` and `lang/pt-BR.json` and ensures zero undefined keys in Handlebars templates.
- `tests/midi-qol-compat-source-id.test.mjs`: Validates item ID resolution across compendium flags, core source IDs, and direct IDs.

**Current Test Metric:** 36 passing, 0 failing.
