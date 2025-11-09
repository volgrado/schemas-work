/**
 * @file AiValidationError.ts
 * @class
 *
 * @description
 * This file defines a custom error class that is thrown specifically when the JSON
 * response from an AI service fails validation against its Zod schema.
 *
 * Its primary purpose is to enable the self-healing retry loop in `aiService.ts`.
 * By throwing this specific error type, the `catch` block in the service can
 * distinguish a "retryable" validation failure from a "non-retryable" network
 * or API error, allowing it to automatically ask the AI to correct its own mistake.
 */

import type { ZodError } from 'zod';

export class AiValidationError extends Error {
  /**
   * Creates an instance of AiValidationError.
   * @param zodError - The original ZodError object from the failed validation.
   */
  constructor(zodError: ZodError) {
    // Extract the first issue from the Zod error to create a concise message.
    // A ZodError is guaranteed to have at least one issue.
    const issue = zodError.issues[0];

    // Format a developer-friendly message that pinpoints the validation problem.
    const message = `AI response validation failed at path '${issue.path.join('.')}': ${issue.message}`;

    // Pass the formatted message to the base Error class constructor.
    super(message);

    // Set the name of the error for clear identification in logs and catch blocks.
    this.name = 'AiValidationError';
  }
}
