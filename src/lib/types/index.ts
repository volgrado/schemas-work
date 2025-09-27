/**
 * Representa la identidad criptográfica única del usuario, generada y
 * almacenada localmente en su navegador.
 */
export interface Identity {
  publicKey: string;
  privateKey: string; // Nota: En un entorno de producción real, el acceso a la clave privada
  // se gestionaría a través de la API CryptoKey para mayor seguridad,
  // en lugar de almacenarla directamente como un string.
}

/**
 * Representa los metadatos de un esquema (documento) en el directorio del usuario.
 * No contiene el contenido del documento, solo la información para listarlo y gestionarlo.
 */
export interface SchemaMetadata {
  id: string; // Identificador único del documento (UUID v4)
  title: string; // Título del esquema, editable por el usuario
  createdAt: number; // Timestamp de la creación del esquema (en milisegundos)
  updatedAt: number; // Timestamp de la última modificación
}
