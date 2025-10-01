// src/lib/services/core/errorService.ts

/**
 * @file Servicio centralizado para la captura, almacenamiento y gestión de errores.
 * Funciona como una "caja negra" en el navegador del usuario, guardando un historial
 * de problemas que pueden ser reportados voluntariamente para diagnóstico.
 */

// --- Tipos y Constantes ---

/**
 * Define la estructura de una única entrada en el registro de errores.
 */
export interface ErrorLog {
  /** La fecha y hora en formato ISO en que se registró el error. */
  timestamp: string;
  /** El mensaje principal del error. */
  message: string;
  /** El stack trace del error, si está disponible. */
  stack?: string;
  /** Un objeto con información contextual adicional sobre dónde/cuándo ocurrió el error. */
  context?: Record<string, any>;
}

/** La clave utilizada para almacenar los logs de errores en localStorage. */
const ERROR_LOGS_STORAGE_KEY = 'schemas-work-error-logs';

/** El número máximo de registros de error que se mantendrán en el historial. */
const MAX_LOGS = 50;

// --- API del Servicio ---

/**
 * Obtiene todos los registros de error almacenados localmente.
 * @returns {ErrorLog[]} Un array de registros de error, del más reciente al más antiguo.
 */
export function getLogs(): ErrorLog[] {
  try {
    const storedLogs = localStorage.getItem(ERROR_LOGS_STORAGE_KEY);
    return storedLogs ? JSON.parse(storedLogs) : [];
  } catch (e) {
    // Si los logs están corruptos, los limpiamos y devolvemos un array vacío.
    console.error('Error al parsear los logs de error almacenados:', e);
    clearLogs();
    return [];
  }
}

/**
 * Registra un nuevo error en el historial persistente.
 * Esta es la función principal del servicio.
 * @param {Error | any} error - El objeto de error capturado.
 * @param {Record<string, any>} [context] - Datos contextuales adicionales para ayudar en la depuración.
 */
export function reportError(
  error: Error | any,
  context?: Record<string, any>
): void {
  // 1. Crear un nuevo ErrorLog
  const newLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    message: error?.message || 'Error desconocido',
    stack: error?.stack,
    context,
  };

  // 2. Obtener los logs existentes
  const existingLogs = getLogs();

  // 3. Añadir el nuevo log al principio del array
  const updatedLogs = [newLog, ...existingLogs];

  // 4. Limitar el array a MAX_LOGS
  const trimmedLogs = updatedLogs.slice(0, MAX_LOGS);

  // 5. Guardar el array actualizado en localStorage
  try {
    localStorage.setItem(ERROR_LOGS_STORAGE_KEY, JSON.stringify(trimmedLogs));
  } catch (e) {
    console.error(
      'No se pudieron guardar los logs de error en localStorage:',
      e
    );
  }

  // 6. Opcional: Loguear en consola durante el desarrollo para facilitar la depuración
  if (import.meta.env.DEV) {
    console.error('[Error Service Reported]:', newLog.message, {
      logEntry: newLog,
      originalError: error,
    });
  }
}

/**
 * Elimina todos los registros de error del almacenamiento local.
 */
export function clearLogs(): void {
  try {
    localStorage.removeItem(ERROR_LOGS_STORAGE_KEY);
  } catch (e) {
    console.error(
      'No se pudieron limpiar los logs de error de localStorage:',
      e
    );
  }
}
