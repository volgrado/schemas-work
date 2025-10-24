/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Icon from './Icon.svelte';

describe('Icon.svelte', () => {
  it('renders an icon with default props', () => {
    const { container } = render(Icon, { props: { name: 'plus' } });
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '16px');
  });

  it('renders the correct SVG component', () => {
    const { container } = render(Icon, { props: { name: 'minus' } });
    const svg = container.querySelector('svg');
    // We can check for a class that's unique to the MinusIcon component
    expect(svg?.innerHTML).toContain('line');
  });

  it('applies custom size', () => {
    const { container } = render(Icon, { props: { name: 'plus', size: 24 } });
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24px');
  });

  it('applies custom class', () => {
    const { container } = render(Icon, { props: { name: 'plus', class: 'custom-class' } });
    const span = container.querySelector('.custom-class');
    expect(span).toBeInTheDocument();
  });
});
