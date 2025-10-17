# Utility Functions

This directory contains reusable utility functions that can be used throughout the application.

## Core Utilities

- **`crypto.ts`**: This module encapsulates all cryptographic operations using the native Web Crypto API. It provides high-level functions to securely encrypt and decrypt data with a password.

- **`debounce.ts`**: This module provides a generic `debounce` utility function. Debouncing is a technique to limit the rate at which a function gets called, which is useful for handling events that can fire rapidly, such as window resizing, scrolling, or user input.
