/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* tslint:disable */
import {GoogleGenAI} from '@google/genai';
import {html, LitElement} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import * as marked from 'marked';
import {styles} from './styles';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

function blobToBase64(blob: Blob) {
  return new Promise<string>(async (resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      resolve(url.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Applet that summarizes a PDF document with Gemini.
 */
@customElement('gdm-pdf-summary')
export class GdmPdfSummaryApp extends LitElement {
  @state() url = 'https://arxiv.org/pdf/2501.00663';
  @state() numWords = 200;
  @state() level = 'a grad student';
  @state() summarization = '';
  @state() markdown = html`Waiting for selection.`;
  @state() fetching = false;
  @state() generating = false;
  @state() error = '';

  private readonly levels = [
    'a child',
    'a teen',
    'a college student',
    'a grad student',
    'an expert',
    'a fish',
  ];

  private readonly examples = [
    {
      url: 'https://arxiv.org/pdf/1706.03762',
      title: 'Attention Is All You Need',
    },
    {
      url: 'https://arxiv.org/pdf/2501.00663',
      title: 'Titans: Learning to Memorize at Test Time',
    },
    {
      url: 'https://arxiv.org/pdf/2502.18895',
      title:
        'Cohomological Field Theory With Vacuum and Its Virasoro Constraints',
    },
  ];

  static override styles = styles;

  private updateUrl(e: InputEvent) {
    this.url = (e.target as HTMLInputElement).value;
  }

  private async generate(data: string) {
    this.generating = true;
    try {
      const response = await ai.models.generateContentStream({
        model: 'gemini-2.0-flash-exp',
        contents: {
          role: 'USER',
          parts: [
            {
              text: `can you summarize this PDF in ${this.numWords} words at the comprehension level of ${this.level}?`,
            },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data,
              },
            },
          ],
        },
      });

      for await (const chunk of response) {
        this.summarization += chunk.text;
        this.markdown = unsafeHTML(marked.parse(this.summarization));
      }
    } catch (e) {
      this.error = 'Something went wrong.';
    }
    this.generating = false;
  }

  async summarize() {
    this.error = '';
    this.summarization = '';
    this.markdown = html``;
    this.fetching = true;
    try {
      const pdf = await fetch(this.url);
      const base64Data = await blobToBase64(await pdf.blob());
      this.fetching = false;
      await this.generate(base64Data);
    } catch (e) {
      this.fetching = false;
      this.error = 'Fetching failed.';
    }
  }

  private async loadExample(url: string) {
    this.url = url;
    await this.summarize();
  }

  private updateNumWords(e: InputEvent) {
    this.numWords = Number((e.target as HTMLInputElement).value);
  }

  private updateLevel(e: InputEvent) {
    this.level = (e.target as HTMLSelectElement).value;
  }

  render() {
    return html`
      <div>
        <header>
          <h1>PDF Summary</h1>
          <p>This is a demo of Gemini's ability to process a PDF document.</p>
          <p
            >The PDFs are from
            <a href="https://arxiv.org/" target="_blank">arxiv.org</a> URLs.</p
          >
        </header>
        <div>
          <p>Examples:</p>
          <ul>
          ${this.examples.map(
            (example) =>
              html`<li>
                <button @click=${() => this.loadExample(example.url)}>
                  ${example.title}
                </button>
              </li>`,
          )}
          </ul>
        </div>
        <div>
          <div class="instructions">
            <p
              >Take this PDF
              <input type="text" @change=${this.updateUrl} value=${this.url}
            /></p>
            <p>
              and make a summary of it in
              <span><input
                .value=${this.numWords.toString()}
                type="range"
                min="10"
                max="1000"
                step="10"
                @input=${(e: InputEvent) => {
                  this.updateNumWords(e);
                }} />
              ${this.numWords} words</span> <span>at the level of
              <select
                @change=${this.updateLevel}>
                ${this.levels.map(
                  (level) =>
                    html`<option
                      ?selected="${level === this.level ? 'selected' : null}"
                      value=${level}
                      >${level}</option
                    >`,
                )}
              </select></p
            ></span>
          </div>
          <div class="status">
            <button
              @click=${this.summarize}
              ?disabled=${this.fetching || this.generating}
              >Summarize it!</button
            >
            <p>
              ${this.fetching ? html`Fetching PDF...` : html``}
              ${this.generating ? html`Generating...` : html``}
            </p>
            <p class="error">${this.error}</p>
          </div>
          <div class="summarization">${this.markdown}</div>
        </div>
      </div>
    `;
  }
}
