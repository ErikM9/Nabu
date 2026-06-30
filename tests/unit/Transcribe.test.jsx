import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Transcribe from '../../src/components/Transcribe';

describe('Transcribe', () => {
  it('renders without crashing', () => {
    render(<Transcribe />);
  });
  it('displays transcribing heading', () => {
    render(<Transcribe />);
    expect(screen.getByText('Transcription in progress…')).toBeInTheDocument();
  });
  it('displays wait message', () => {
    render(<Transcribe />);
    expect(screen.getByText(/may take a moment/i)).toBeInTheDocument();
  });
  it('heading is h1', () => {
    render(<Transcribe />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Transcription in progress…');
  });
  it('description mentions audio length', () => {
    render(<Transcribe />);
    expect(screen.getByText(/length of your audio/i)).toBeInTheDocument();
  });
});