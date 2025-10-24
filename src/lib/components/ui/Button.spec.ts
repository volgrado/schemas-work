/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Button from './Button.svelte';
import SlotTestWrapper from './SlotTestWrapper.svelte';

describe('Button.svelte', () => {
  it('renders a button with default props', () => {
    const { getByRole } = render(Button, { props: { variant: 'primary', size: 'md' } });
    const button = getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn');
    expect(button).toHaveClass('btn-primary');
    expect(button).toHaveClass('btn-md');
  });

  it('renders slot content', () => {
    const { getByText } = render(SlotTestWrapper, {
      props: {
        Component: Button,
        props: { variant: 'primary', size: 'md' },
      },
    });
    const button = getByText('Click me');
    expect(button).toBeInTheDocument();
  });

  it('applies correct classes for variant and size', () => {
    const { getByRole } = render(Button, { props: { variant: 'secondary', size: 'lg' } });
    const button = getByRole('button');
    expect(button).toHaveClass('btn-secondary');
    expect(button).toHaveClass('btn-lg');
  });

  it('forwards click events', async () => {
    const handleClick = vi.fn();
    const { getByRole } = render(Button, { props: { variant: 'primary', size: 'md' } });
    const button = getByRole('button');

    button.addEventListener('click', handleClick);
    await fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('passes rest props to the button element', () => {
    const { getByRole } = render(Button, { props: { variant: 'primary', size: 'md', disabled: true, 'aria-label': 'Test Button' } });
    const button = getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-label', 'Test Button');
  });
});
