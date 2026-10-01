import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Transcribe from '../../src/components/Transcribe';

describe('Transcribe', () => {
  it('says transcription is under way, under the app title', () => {
    render(<Transcribe />);

    expect(screen.getByRole('heading', { level: 2, name: 'Transcription in progress…' })).toBeInTheDocument();
  });

  it('warns that the first run also loads the model', () => {
    render(<Transcribe />);

    expect(screen.getByText(/first run the model also needs to load/)).toBeInTheDocument();
  });
});