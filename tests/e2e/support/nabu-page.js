import path from 'node:path';

export const FIXTURES = {
  tone: path.join(process.cwd(), 'tests', 'fixtures', 'tone.wav'),
  noAudio: path.join(process.cwd(), 'tests', 'fixtures', 'no-audio.wav'),
};

/* Page model for Nabu: locators and actions here, assertions in the specs */
export class NabuPage {
  constructor(page) {
    this.page = page;
    this.recordButton = page.getByRole('button', { name: 'Record' });
    this.stopButton = page.getByRole('button', { name: 'Stop' });
    this.uploadInput = page.getByLabel('Audio File');
    this.fileHeading = page.getByRole('heading', { name: 'Here is your file:' });
    this.resultHeading = page.getByRole('heading', { name: 'Here is your result:' });
    this.progressHeading = page.getByRole('heading', { name: 'Transcription in progress…' });
    this.transcribeButton = page.getByRole('button', { name: 'Transcribe' });
    this.restartButton = page.getByRole('button', { name: 'Restart' });
    this.cancelTranscription = page.getByRole('button', { name: 'Cancel transcription' });
    this.transcriptionView = page.getByRole('button', { name: 'Transcription' });
    this.translationView = page.getByRole('button', { name: 'Translation' });
    this.languagePicker = page.getByRole('combobox', { name: 'Target language' });
    this.translateButton = page.getByRole('button', { name: 'Translate' });
    this.cancelTranslation = page.getByRole('button', { name: 'Cancel translation' });
    this.copyButton = page.getByRole('button', { name: 'Copy' });
    this.downloadButton = page.getByRole('button', { name: 'Download' });
    this.alert = page.getByRole('alert');
    this.status = page.getByRole('status');
  }

  async open() {
    await this.page.goto('/');
  }

  /* Opens the file chooser from its label, the way a person picking a file would */
  async upload(file = FIXTURES.tone) {
    const [chooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      this.page.locator('label[for="file-upload"]').click(),
    ]);
    await chooser.setFiles(file);
    await this.fileHeading.waitFor();
  }

  async transcribe(file) {
    await this.upload(file);
    await this.transcribeButton.click();
  }

  async chooseLanguageByKeyboard(typed) {
    await this.translationView.click();
    await this.languagePicker.focus();
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.type(typed);
    await this.page.keyboard.press('Enter');
  }
}