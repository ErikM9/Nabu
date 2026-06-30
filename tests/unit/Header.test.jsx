import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../../src/components/Header';

describe('Header', () => {
  it('renders without crashing', () => {
    render(<Header />);
  });
  it('displays the app name Nabu', () => {
    render(<Header />);
    expect(screen.getByLabelText('Nabu')).toBeInTheDocument();
  });
  it('renders Na span with correct text', () => {
    render(<Header />);
    expect(screen.getByText('Na')).toBeInTheDocument();
  });
  it('renders bu span with correct text', () => {
    render(<Header />);
    expect(screen.getByText('bu')).toBeInTheDocument();
  });
  it('renders the minecraft host image', () => {
    render(<Header />);
    const img = screen.getByAltText('Minecraft host welcoming you');
    expect(img).toBeInTheDocument();
  });
  it('image has src attribute', () => {
    render(<Header />);
    const img = screen.getByAltText('Minecraft host welcoming you');
    expect(img).toHaveAttribute('src');
  });
  it('header element exists', () => {
    render(<Header />);
    expect(document.querySelector('header')).toBeInTheDocument();
  });
  it('h1 has aria-label', () => {
    render(<Header />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveAttribute('aria-label', 'Nabu');
  });
});