# Bugs and Inconsistencies

This document lists the bugs, inconsistencies, and potential improvements discovered during the documentation and testing process.

## Testing Environment

The testing environment is not fully set up, which is causing several issues:

*   **Missing Playwright Dependencies**: The e2e tests are failing because Playwright is missing some system-level dependencies.
*   **Vitest Configuration**: The `vite.config.ts` file is not correctly configured to run the component tests in a `jsdom` environment. This is causing the component tests to fail.
*   **Test Failures**: Several tests are failing due to changes in the codebase that were not reflected in the tests.

## Svelte Compiler Warnings

The Svelte compiler is throwing several warnings:

*   `lifecycle_function_unavailable`: This is likely due to the Vitest configuration issue mentioned above.
*   `a11y_click_events_have_key_events`: Some elements with click events are missing keyboard event handlers.
*   `a11y_no_static_element_interactions`: Some non-interactive elements have click handlers.
*   `non_reactive_update`: Some variables are being updated without being declared with `$state`.
*   `css_unused_selector`: Some CSS selectors are not being used.
*   `element_invalid_self_closing_tag`: Some elements are being self-closed when they shouldn't be.
*   `a11y_no_noninteractive_tabindex`: Some non-interactive elements have a `tabindex`.

## Potential Improvements

*   **Test Coverage**: The test coverage for the application could be improved. There are several components and services that do not have any tests.
*   **Code Quality**: The Svelte compiler warnings should be addressed to improve the quality of the code.
*   **CI/CD**: A CI/CD pipeline could be set up to automatically run the tests and report any failures.
