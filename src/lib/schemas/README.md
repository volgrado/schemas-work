# Esquemas de IA (`/src/lib/schemas`)

Este directorio define las estructuras de datos (`schemas`) que se utilizan para guiar y validar las respuestas de los modelos de lenguaje grandes (LLMs) con los que interactúa la aplicación.

## Propósito y Filosofía

El objetivo principal de este directorio es asegurar que las interacciones con la IA sean **estructuradas, predecibles y fiables**. En lugar de depender de respuestas de texto libre del LLM, le proporcionamos un esquema Zod que define la estructura JSON exacta que esperamos recibir.

Esto ofrece varias ventajas clave:

1.  **Fiabilidad**: Al forzar al LLM a responder con un JSON que se ajusta a un esquema, reducimos drásticamente la probabilidad de obtener respuestas malformadas o inesperadas.

2.  **Validación y Seguridad de Tipos**: Usamos Zod para validar en tiempo de ejecución que la respuesta del LLM se ajusta a nuestro esquema. Esto nos proporciona seguridad de tipos (`type-safety`) en nuestro código TypeScript, permitiéndonos autocompletar y evitar errores de `runtime`.

3.  **Desacoplamiento**: Define un "contrato" claro entre nuestra aplicación y el servicio de IA. Si la lógica de la aplicación cambia, solo necesitamos actualizar el esquema, y el `prompt` se ajustará en consecuencia.

4.  **Ingeniería de Prompts Simplificada**: En lugar de describir textualmente el formato de salida deseado en el prompt, podemos simplemente inyectar la definición del esquema, lo que a menudo conduce a resultados más precisos por parte del LLM.

## Estructura de un Esquema

Cada archivo en este directorio generalmente exporta:

-   **Un esquema Zod (`zod schema`)**: Define la estructura, los tipos de datos y las restricciones de la respuesta JSON que esperamos.
-   **Un tipo de TypeScript (`type`)**: Inferido automáticamente del esquema Zod. Este es el tipo que usamos en el resto de nuestra aplicación.

### Ejemplo: `createCardSchema`

-   **`createCardSchema.ts`**: Define el esquema para la creación de una tarjeta de estudio a partir de una selección de texto.

    -   **Esquema Zod**: Especifica que la respuesta debe ser un objeto con dos propiedades:
        -   `question`: una cadena de texto, que será la pregunta de la tarjeta.
        -   `answer`: una cadena de texto, que será la respuesta.

    -   **Prompt de IA Asociado (conceptual)**: Cuando un usuario pide crear una tarjeta, el `prompt` enviado al LLM incluirá una instrucción como:

        > "Basado en el siguiente texto, genera una pregunta y una respuesta concisa. Formatea tu salida como un objeto JSON que se ajuste al siguiente esquema: `{"type":"object","properties":{"question":{"type":"string"},"answer":{"type":"string"}},"required":["question","answer"]}`"

    -   **Uso en la Aplicación**: El servicio que llama a la IA (`aiService`) recibe la respuesta JSON, la valida con `createCardSchema.parse(response)`, y si tiene éxito, obtiene un objeto `CreateCard` fuertemente tipado que puede pasar de forma segura al `cardService` para crear la tarjeta en la base de datos.