/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { handle } from './hooks.server';

describe('hooks.server.ts', () => {
  it('sets the lang attribute on the HTML element for supported languages', async () => {
    const resolve = vi.fn((event, options) => {
      if (options?.transformPageChunk) {
        return {
          html: options.transformPageChunk({ html: '<html lang="%lang%"></html>' }),
        };
      }
      return { html: '<html lang="en"></html>' };
    });

    const event = {
      url: new URL('http://localhost/en/some-page'),
    };

    const result = await handle({ event, resolve } as any);
    expect(result.html).toBe('<html lang="en"></html>');
  });

  it('does not set the lang attribute for unsupported languages', async () => {
    const resolve = vi.fn().mockResolvedValue({ html: '<html></html>' });
    const event = {
      url: new URL('http://localhost/fr/some-page'),
    };

    await handle({ event, resolve } as any);
    expect(resolve).toHaveBeenCalledWith(event);
  });
});
