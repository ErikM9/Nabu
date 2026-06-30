import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Info from '../../src/components/Info';

/* Covers translation worker interaction, tab switching, and the language dropdown */
describe('Info', () => {
  const mockOnReset = vi.fn();
  const mockOutput = [
    { text: 'Hello world' },
    { text: 'This is a test' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
  });
  it('displays result heading', () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    expect(screen.getByText('Here is your result:')).toBeInTheDocument();
  });
  it('shows Transcription tab', () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    expect(screen.getByText('Transcription')).toBeInTheDocument();
  });
  it('shows Translation tab', () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    expect(screen.getByText('Translation')).toBeInTheDocument();
  });
  it('shows Copy button', () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });
  it('shows Download button', () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    expect(screen.getByText('Download')).toBeInTheDocument();
  });
  it('shows Restart button', () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    expect(screen.getByText('Restart')).toBeInTheDocument();
  });
  it('displays transcription text', () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    expect(screen.getByText(/Hello world/)).toBeInTheDocument();
  });
  it('combines multiple output texts', () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    expect(screen.getByText(/Hello world This is a test/)).toBeInTheDocument();
  });
  it('calls onReset when Restart clicked', async () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const restartBtn = screen.getByText('Restart');
    await userEvent.click(restartBtn);
    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });
  it('Copy button triggers clipboard', async () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const copyBtn = screen.getByText('Copy');
    await userEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
  it('switches to Translation tab', async () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const translationTab = screen.getByText('Translation');
    await userEvent.click(translationTab);
    expect(screen.getByText('Select language')).toBeInTheDocument();
  });
  it('shows language dropdown in Translation tab', async () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const translationTab = screen.getByText('Translation');
    await userEvent.click(translationTab);
    const select = screen.getByLabelText('Target language');
    expect(select).toBeInTheDocument();
  });
  it('shows Translate button in Translation tab', async () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const translationTab = screen.getByText('Translation');
    await userEvent.click(translationTab);
    expect(screen.getByLabelText('Start translation')).toBeInTheDocument();
  });
  it('Translate button disabled without language selected', async () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const translationTab = screen.getByText('Translation');
    await userEvent.click(translationTab);
    const translateBtn = screen.getByLabelText('Start translation');
    expect(translateBtn).toBeDisabled();
  });
  it('has copy icon', () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const icon = document.querySelector('.fa-link');
    expect(icon).toBeInTheDocument();
  });
  it('has download icon', () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const icon = document.querySelector('.fa-download');
    expect(icon).toBeInTheDocument();
  });
  it('has restart icon', () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const icon = document.querySelector('.fa-arrow-rotate-left');
    expect(icon).toBeInTheDocument();
  });
  it('Transcription tab has selected class when active', () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const transcriptionTab = screen.getByText('Transcription').closest('button');
    expect(transcriptionTab).toHaveClass('selected');
  });
  it('Translation tab gets selected class when clicked', async () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const translationTab = screen.getByText('Translation');
    await userEvent.click(translationTab);
    expect(translationTab.closest('button')).toHaveClass('selected');
  });
  it('handles empty output gracefully', () => {
    render(<Info output={[]} onReset={mockOnReset} />);
    expect(screen.getByText('Here is your result:')).toBeInTheDocument();
  });
  it('language dropdown has many options', async () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const translationTab = screen.getByText('Translation');
    await userEvent.click(translationTab);

    const trigger = screen.getByRole('button', { name: 'Select language' });
    await userEvent.click(trigger);
    const options = document.querySelectorAll('[role="option"]');
    expect(options.length).toBeGreaterThan(100);
  });
});

describe('Info Download', () => {
  const mockOnReset = vi.fn();
  const mockOutput = [{ text: 'Test content' }];

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('Download button creates blob', async () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const downloadBtn = screen.getByText('Download');
    await userEvent.click(downloadBtn);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
  it('Download revokes URL after use', async () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);
    const downloadBtn = screen.getByText('Download');
    await userEvent.click(downloadBtn);
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });
});

describe('Info cancelTranslation', () => {
  const mockOnReset = vi.fn();
  const mockOutput = [{ text: 'Hello world' }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clicking Cancel during translation resets translating state', async () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);

    await userEvent.click(screen.getByText('Translation'));

    const trigger = screen.getByRole('button', { name: 'Select language' });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByText('French'));

    await userEvent.click(screen.getByLabelText('Start translation'));

    await waitFor(() => {
      expect(screen.getByLabelText('Cancel translation')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Cancel translation'));

    await waitFor(() => {
      expect(screen.getByLabelText('Start translation')).toBeInTheDocument();
    });
  });

  it('clicking Cancel clears download progress', async () => {
    render(<Info output={mockOutput} onReset={mockOnReset} />);

    await userEvent.click(screen.getByText('Translation'));

    const trigger = screen.getByRole('button', { name: 'Select language' });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByText('French'));
    await userEvent.click(screen.getByLabelText('Start translation'));

    await waitFor(() => {
      expect(screen.getByLabelText('Cancel translation')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Cancel translation'));

    await waitFor(() => {
      expect(screen.queryByText(/loading translation model/i)).not.toBeInTheDocument();
    });
  });
});