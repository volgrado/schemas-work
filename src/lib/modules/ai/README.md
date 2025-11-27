# Architectural Overview: AI Services

## Philosophy

This directory encapsulates all services related to Artificial Intelligence. The primary goal is to abstract the complexities of AI interactions, providing a simple and consistent API for the rest of the application. The key service in this module is `aiService.ts`, which acts as a facade for the underlying AI model.

The `prompts.ts` file is a critical part of this architecture, as it contains the carefully crafted instructions that guide the AI's behavior. By separating the prompts from the service logic, we can easily iterate on the AI's instructions without modifying the application code.
