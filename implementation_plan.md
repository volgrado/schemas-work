# Implementation Plan - Refactoring Card Editor & Service

## Goal
Address architectural weaknesses by refactoring `CardEditorPanel.svelte` to separate concerns and optimizing `cardService.ts` to remove inefficient object cloning.

## User Review Required
> [!IMPORTANT]
> **Breaking Change in `cardService.ts`**: Replacing `JSON.parse(JSON.stringify(...))` with `structuredClone(...)`.
> - `structuredClone` preserves `Date` objects, whereas JSON serialization converts them to strings.
> - **Verification**: I will ensure `Dexie` (IndexedDB) handles `Date` objects correctly (it does).
> - **Proxy Handling**: `structuredClone` works on Svelte 5 proxies to create a plain copy, which is the desired behavior for storage.

## Proposed Changes

### Service Layer
#### [MODIFY] [cardService.ts](file:///c:/Users/asoly/OneDrive/Aplicaciones/schemas-work/src/lib/services/features/cardService.ts)
- Replace `JSON.parse(JSON.stringify(...))` with `structuredClone(...)`.
- Remove `(_exhaustiveCheck as any).type` casting in favor of a cleaner error message or type guard.

### UI Layer
#### [NEW] [CardEditorController.svelte.ts](file:///c:/Users/asoly/OneDrive/Aplicaciones/schemas-work/src/lib/modules/editor/ui/CardEditorController.svelte.ts)
- Create a controller class `CardEditorController` using Svelte 5 runes.
- Move Drag-and-Drop state (`draggedItemIndex`, `dropTargetIndex`) and logic (`handleDragStart`, `handleDrop`, etc.) here.
- Move `cardElements` map and scroll-into-view logic here (or expose methods to handle it).

#### [MODIFY] [CardEditorPanel.svelte](file:///c:/Users/asoly/OneDrive/Aplicaciones/schemas-work/src/lib/modules/editor/ui/CardEditorPanel.svelte)
- Instantiate `CardEditorController`.
- Replace local state and functions with controller calls.
- Use the controller for Drag-and-Drop operations.

## Verification Plan

### Automated Tests
- Run `npm run check` to ensure type safety.
- Run `npm run test:unit` if applicable (though specific unit tests for this might not exist, I will check).

### Manual Verification
1.  **Card Operations**:
    - Create a new card (Basic, Input, Sequencing).
    - Edit a card.
    - Delete and Restore a card.
    - Verify persistence (reload page).
2.  **Drag and Drop**:
    - Create a Sequencing card.
    - Add items.
    - Drag and drop items to reorder.
    - Verify the order is saved and persisted.
3.  **Scroll to New**:
    - Add a card and verify the view scrolls to it and focuses the input.
