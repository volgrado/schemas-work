import type { RequestHandler } from './$types';

// This endpoint is only for receiving log messages and printing them.
// We only allow POST requests.
export const POST: RequestHandler = async ({ request }) => {
  try {
    const logData = await request.json();

    // Log the message with a clear prefix to distinguish it from server logs.
    console.log(
      `[CLIENT-LOG] ${logData.level.toUpperCase()}: ${logData.message}`,
      logData.data || ''
    );

    // Respond with a simple 200 OK. We don't need to send anything back.
    return new Response(null, { status: 204 }); // 204 No Content is efficient
  } catch (error) {
    // If something goes wrong with logging, just log the error and ignore.
    console.error('[LOGGING-API-ERROR]', error);
    return new Response(null, { status: 500 });
  }
};
