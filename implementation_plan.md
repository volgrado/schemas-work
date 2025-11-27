# Implementation Plan - Dependencies & Build Optimization

## Goal
Simplify the build configuration and clarify the persistence architecture to reduce maintenance burden and perceived complexity risks.

## Proposed Changes

### Build Configuration
#### [MODIFY] [vite.config.ts](file:///c:/Users/asoly/OneDrive/Aplicaciones/schemas-work/vite.config.ts)
- Remove the `manualChunks` configuration. Vite's default code splitting is sufficient for most applications and requires zero maintenance.

### Documentation & Architecture
#### [NEW] [src/lib/core/services/persistence_strategy.md](file:///c:/Users/asoly/OneDrive/Aplicaciones/schemas-work/src/lib/core/services/persistence_strategy.md)
- Create a brief documentation file explaining the dual-database strategy:
    - **Documents**: Managed by `Yjs` + `y-indexeddb` (stores updates).
    - **Cards**: Managed by `Dexie` (stores structured objects).
    - **Interaction**: They are orthogonal and do not require synchronization.

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure the build process still works and produces valid chunks.
- Run `npm run preview` to verify the production build loads correctly.

### Manual Verification
- Verify that the application loads and functions correctly (both Documents and Cards) after the build.
