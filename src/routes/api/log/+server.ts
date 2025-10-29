/**
 * @file A secure and structured endpoint for receiving client-side logs.
 * This edge function validates incoming log data and outputs it as structured JSON
 * to the server console, making it easy to integrate with modern log management systems.
 * @module /api/log
 */

import type { RequestHandler } from './$types';

// --- Configuration ---
export const config = {
  runtime: 'edge', // Explicitly run on the edge for performance.
};

const MAX_LOG_SIZE_BYTES = 10 * 1024; // 10 KB limit to prevent abuse.

// --- Type Definition for incoming log data ---
type LogLevel = 'info' | 'error' | 'fatal';

interface LogPayload {
  level: LogLevel;
  message: string;
  data?: any;
}

/**
 * Validates the incoming log payload to ensure it has the correct structure and types.
 * @param payload The parsed JSON data from the request.
 * @returns A boolean indicating if the payload is valid.
 */
function isValidLogPayload(payload: any): payload is LogPayload {
  if (!payload || typeof payload !== 'object') return false;

  const hasValidLevel =
    typeof payload.level === 'string' &&
    ['info', 'error', 'fatal'].includes(payload.level);
  const hasValidMessage =
    typeof payload.message === 'string' && payload.message.trim() !== '';

  return hasValidLevel && hasValidMessage;
}

/**
 * Handles POST requests to receive and process client-side log messages.
 */
export const POST: RequestHandler = async ({ request }) => {
  // --- Security: Check payload size first ---
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_LOG_SIZE_BYTES) {
    return new Response(JSON.stringify({ error: 'Payload too large.' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await request.json();

    // --- Robust Validation ---
    if (!isValidLogPayload(payload)) {
      return new Response(JSON.stringify({ error: 'Invalid log payload.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- Structured JSON Logging ---
    // This format is easily parsed by log management services like Axiom, Sentry, etc.
    const logEntry = {
      source: 'client',
      timestamp: new Date().toISOString(),
      level: payload.level,
      message: payload.message,
      data: payload.data, // Include extra data if it exists
    };

    // Use different console methods based on severity for better visibility.
    switch (payload.level) {
      case 'error':
      case 'fatal':
        console.error(JSON.stringify(logEntry));
        break;
      case 'info':
      default:
        console.info(JSON.stringify(logEntry));
        break;
    }

    return new Response(null, { status: 204 }); // 204 No Content is perfect here.
  } catch (error) {
    // This catches errors like the request body not being valid JSON.
    console.error('[LOGGING-API-ERROR] Failed to process log request:', error);
    return new Response(JSON.stringify({ error: 'Bad request.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
