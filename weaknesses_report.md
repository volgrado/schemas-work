# Application Weakness Analysis

This document outlines the identified weaknesses in the `schemas-work` application, categorized by Architecture, Performance, Code Quality, and State Management.

## 1. Architecture & Separation of Concerns

### Mixed Concerns in UI Components
- **Issue**: `CardEditorPanel.svelte` contains significant business logic, including drag-and-drop implementation and direct DOM manipulation (e.g., `element.scrollIntoView`, `querySelector`).
- **Impact**: Makes the component harder to test and maintain. UI components should ideally be presentational, delegating complex logic to controllers or composables (actions).
- **Location**: `src/lib/modules/editor/ui/CardEditorPanel.svelte`

### Service Layer Implementation
- **Issue**: `cardService.ts` relies on `JSON.parse(JSON.stringify(...))` for deep cloning and sanitization.
- **Impact**: This is computationally expensive and can be a bottleneck for large datasets. It also strips out non-JSON values (like `Date` objects or `undefined`), which might lead to subtle bugs if not handled explicitly.
- **Location**: `src/lib/services/features/cardService.ts`

## 2. Performance

### Inefficient Object Cloning
- **Issue**: As mentioned above, the use of `JSON.parse(JSON.stringify(...))` in `addCard`, `addCards`, and `updateCard` is a performance anti-pattern.
- **Recommendation**: Use `structuredClone` (modern browser standard) or a dedicated utility like `lodash.cloneDeep` (if necessary, though `structuredClone` is preferred).

### Reactive Overhead
- **Issue**: `CardEditorPanel.svelte` uses `oninput` handlers that trigger `handleUpdate`, which is debounced. However, the debounce implementation creates a new function on every render if not carefully managed (though in this file it seems defined outside the template, which is good).
- **Risk**: Heavy DOM updates or complex reactivity chains in large forms can cause input lag.

## 3. Code Quality & Type Safety

### Type Casting & "Any" Usage
- **Issue**: `cardService.ts` uses `(_exhaustiveCheck as any).type` in the switch default case. While this is a common pattern for exhaustive checks, it can be cleaner.
- **Issue**: `CardEditorPanel.svelte` contains comments like `<!-- FIX: Use onclick for native <button> element -->`, indicating technical debt or incomplete refactors.

### Hardcoded Values
- **Issue**: Magic numbers and hardcoded strings (e.g., `easeFactor: 2.5`) are scattered in `cardService.ts` and `cardEditorStore.svelte.ts`.
- **Recommendation**: Move these to a `constants.ts` or configuration file.

## 4. State Management

### Mixed Reactivity Models
- **Issue**: The codebase mixes Svelte 5 Runes (`$state`, `$effect`) with Svelte 4 Stores (`writable`, `derived`).
- **Example**: `CardEditorPanel.svelte` uses `$state` for local state but imports `cardEditorState` which is a rune-based global state, yet `+layout.svelte` imports `themeStore` which seems to use a mix of patterns (implied by `_applyThemeToDOM`).
- **Impact**: Inconsistent state management makes the codebase harder to reason about and increases the learning curve for new developers.

## 5. Dependencies & Build

### Dependency Complexity
- **Issue**: The project uses both `Dexie` (IndexedDB wrapper) and `Yjs` (CRDT for real-time/offline).
- **Risk**: synchronizing state between a local SQL-like DB (Dexie) and a CRDT (Yjs) is notoriously difficult and prone to edge-case bugs regarding data consistency.

### Manual Chunking
- **Observation**: `vite.config.ts` has a manual chunking strategy. While good for control, it requires maintenance as dependencies change. If not updated, it can lead to suboptimal bundle splitting.
