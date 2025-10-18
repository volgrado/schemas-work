# AI Schemas (`/src/lib/schemas`)

This directory defines the data structures (`schemas`) that are used to guide and validate the responses of the large language models (LLMs) with which the application interacts.

## Purpose and Philosophy

The main objective of this directory is to ensure that interactions with the AI are **structured, predictable, and reliable**. Instead of relying on free-text responses from the LLM, we provide it with a Zod schema that defines the exact JSON structure we expect to receive.

This offers several key advantages:

1.  **Reliability**: By forcing the LLM to respond with a JSON that conforms to a schema, we drastically reduce the probability of obtaining malformed or unexpected responses.

2.  **Validation and Type Safety**: We use Zod to validate at runtime that the LLM's response conforms to our schema. This provides us with type safety in our TypeScript code, allowing us to autocomplete and avoid runtime errors.

3.  **Decoupling**: It defines a clear "contract" between our application and the AI service. If the application logic changes, we only need to update the schema, and the `prompt` will be adjusted accordingly.

4.  **Simplified Prompt Engineering**: Instead of textually describing the desired output format in the prompt, we can simply inject the schema definition, which often leads to more accurate results from the LLM.

## Schema Structure

Each file in this directory generally exports:

-   **A Zod schema**: Defines the structure, data types, and constraints of the JSON response we expect.
-   **A TypeScript type**: Automatically inferred from the Zod schema. This is the type we use in the rest of our application.

### Example: `createCardSchema`

-   **`createCardSchema.ts`**: Defines the schema for creating a study card from a text selection.

    -   **Zod Schema**: Specifies that the response must be an object with two properties:
        -   `question`: a string, which will be the question on the card.
        -   `answer`: a string, which will be the answer.

    -   **Associated AI Prompt (conceptual)**: When a user asks to create a card, the `prompt` sent to the LLM will include an instruction such as:

        > "Based on the following text, generate a concise question and answer. Format your output as a JSON object that conforms to the following schema: `{"type":"object","properties":{"question":{"type":"string"},"answer":{"type":"string"}},"required":["question","answer"]}`"

    -   **Usage in the Application**: The service that calls the AI (`aiService`) receives the JSON response, validates it with `createCardSchema.parse(response)`, and if successful, obtains a strongly typed `CreateCard` object that can be safely passed to the `cardService` to create the card in the database.