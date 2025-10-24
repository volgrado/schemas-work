/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AutosizeTest from './AutosizeTest.svelte';

describe('autosize action', () => {
  it('resizes the textarea on input', async () => {
    const { getByRole } = render(AutosizeTest);
    const textarea = getByRole('textbox') as HTMLTextAreaElement;

    // Mock scrollHeight because jsdom doesn't calculate it
    let scrollHeight = 20;
    Object.defineProperty(textarea, 'scrollHeight', {
      get: () => scrollHeight,
    });

    // Initial resize
    await fireEvent.input(textarea, { target: { value: '' } });
    expect(textarea.style.height).toBe('20px');

    // Simulate user typing and increasing scroll height
    scrollHeight = 100;
    await fireEvent.input(textarea, { target: { value: 'a\nb\nc' } });

    expect(textarea.style.height).toBe('100px');
  });
});
