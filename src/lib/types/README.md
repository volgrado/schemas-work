# Type Definitions

This directory contains all of the core data structures, type aliases, and interfaces for the application. Centralizing these definitions provides a single source of truth for the shape of the data that flows through the components and services.

## Core Types

- **`index.ts`**: This is the primary file for type definitions. It includes the core data structures for the application, such as `Identity`, `SchemaMetadata`, `Vault`, and the various `Card` types. It also defines the types for the Spaced Repetition System (SRS) and the tree visualization.

- **`command.ts`**: Defines the `Command` interface, which is a general-purpose data structure for representing actions that can be executed from the command bar, menus, or toolbars.

- **`iconName.ts`**: Defines the `IconName` type, a union of all valid icon names used throughout the application. This provides a centralized and type-safe registry for all icons.

- **`tree.ts`**: Defines the `TreeNodeData` interface, which is the hierarchical data structure required by the D3.js tree visualization component.
