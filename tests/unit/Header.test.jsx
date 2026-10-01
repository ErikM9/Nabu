import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../../src/components/Header';

describe('Header', () => {
  it('names the app in the page\'s only top-level heading', () => {
    render(<Header />);

    expect(screen.getByRole('heading', { level: 1, name: 'Nabu' })).toBeInTheDocument();
  });

  it('describes the mascot image', () => {
    render(<Header />);

    expect(screen.getByAltText('Minecraft host welcoming you')).toBeInTheDocument();
  });
});