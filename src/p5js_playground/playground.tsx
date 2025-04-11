/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* tslint:disable */
import {html, LitElement} from 'lit';
import {customElement, query, state} from 'lit/decorators.js';
// tslint:disable-next-line:ban-malformed-import-paths
import hljs from 'highlight.js';
import {classMap} from 'lit/directives/class-map.js';
import {Marked} from 'marked';
import {markedHighlight} from 'marked-highlight';

/** Markdown formatting function with syntax hilighting */
export const marked = new Marked(
  markedHighlight({
    async: true,
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, {language}).value;
    },
  }),
);

const ICON_BUSY = html`<svg
  class="rotating"
  xmlns="http://www.w3.org/2000/svg"
  height="24px"
  viewBox="0 -960 960 960"
  width="24px"
  fill="currentColor">
  <path
    d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q17 0 28.5 11.5T520-840q0 17-11.5 28.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-17 11.5-28.5T840-520q17 0 28.5 11.5T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Z" />
</svg>`;
const ICON_EDIT = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  height="16px"
  viewBox="0 -960 960 960"
  width="16px"
  fill="currentColor">
  <path
    d="M120-120v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm584-528 56-56-56-56-56 56 56 56Z" />
</svg>`;

const p5jsCdnUrl =
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.3/p5.min.js';

/**
 * Chat state enum to manage the current state of the chat interface.
 */
export enum ChatState {
  IDLE,
  GENERATING,
  THINKING,
  CODING,
}

/**
 * Chat tab enum to manage the current selected tab in the chat interface.
 */
enum ChatTab {
  GEMINI,
  CODE,
}

/**
 * Chat role enum to manage the current role of the message.
 */
export enum ChatRole {
  USER,
  ASSISTANT,
  SYSTEM,
}

/**
 * Playground component for p5js.
 */
@customElement('gdm-playground')
export class Playground extends LitElement {
  @query('#anchor') anchor;
  @query('#reloadTooltip') reloadTooltip;
  private readonly codeSyntax = document.createElement('div');

  @state() chatState = ChatState.IDLE;
  @state() isRunning = true;
  @state() selectedChatTab = ChatTab.GEMINI;
  @state() inputMessage = '';
  @state() code = '';
  @state() messages: HTMLElement[] = [];
  @state() codeHasChanged = true;
  @state() codeNeedsReload = false;

  private defaultCode = '';
  private readonly previewFrame: HTMLIFrameElement =
    document.createElement('iframe');
  private lastError = '';
  private reportedError = false;

  sendMessageHandler?: CallableFunction;
  resetHandler?: CallableFunction;

  constructor() {
    super();
    this.previewFrame.classList.add('preview-iframe');
    this.previewFrame.setAttribute('allowTransparency', 'true');

    this.codeSyntax.classList.add('code-syntax');

    /* Receive message from the iframe in case any error occures. */
    window.addEventListener(
      'message',
      (msg) => {
        if (msg.data && typeof msg.data === 'string') {
          try {
            const message = JSON.parse(msg.data).message;
            this.runtimeErrorHandler(message);
          } catch (e) {
            console.error(e);
          }
        }
      },
      false,
    );
  }

  /** Disable shadow DOM */
  createRenderRoot() {
    return this;
  }

  setDefaultCode(code: string) {
    this.defaultCode = code;
  }

  async setCode(code: string) {
    this.code = code;
    this.runCode(code);

    this.codeSyntax.innerHTML = await marked.parse(
      '```javascript\n' + code + '\n```',
    );
  }

  setChatState(state: ChatState) {
    this.chatState = state;
  }

  runCode(code: string) {
    this.reportedError = false;
    this.lastError = '';

    const htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>p5.js Sketch</title>
                    <style>
                        body { margin: 0; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f8f9fa; }
                        main { display: flex; justify-content: center; align-items: center; }
                        .console { position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(0, 0, 0, 0.7); padding: 1em; margin: 0; color: red; font-family: monospace;}
                    </style>
                    <script src="${p5jsCdnUrl}"></script>
                    <script>
                      window.addEventListener('message', (event) => {
                          if (event.data === 'stop' && typeof noLoop === 'function') { noLoop(); console.log('Sketch stopped (noLoop)'); }
                          else if (event.data === 'resume' && typeof loop === 'function') { loop(); console.log('Sketch resumed (loop)'); }
                      }, false);
                    </script>
                </head>
                <body>
                    <script>
                        // Basic error handling within the iframe
                        try {
                            ${code}
                        } catch (error) {
                            console.error("Error in sketch:", error);
                            parent.postMessage(
                              JSON.stringify({
                                message: error.toString()
                              })
                            );
                            document.body.innerHTML = '<pre class="console">Error: ' + error.message + '\\nCheck the browser console for details or ask Gemini to fix it.</pre>';
                        }
                    </script>
                </body>
                </html>
            `;

    this.previewFrame.setAttribute('srcdoc', htmlContent);
    this.codeNeedsReload = false;
  }

  runtimeErrorHandler(errorMessage: string) {
    this.reportedError = true;

    if (this.lastError !== errorMessage) {
      this.addMessage('system-ask', errorMessage);
    }
    this.lastError = errorMessage;
  }

  setInputField(message: string) {
    this.inputMessage = message.trim();
  }

  addMessage(role: string, message: string) {
    const div = document.createElement('div');
    div.classList.add('turn');
    div.classList.add(`role-${role.trim()}`);

    const thinkingDetails = document.createElement('details');
    thinkingDetails.classList.add('hidden');
    const summary = document.createElement('summary');
    summary.textContent = 'Thinking...';
    thinkingDetails.classList.add('thinking');
    thinkingDetails.setAttribute('open', 'true');
    const thinking = document.createElement('div');
    thinkingDetails.append(thinking);
    div.append(thinkingDetails);
    const text = document.createElement('div');
    text.className = 'text';
    text.textContent = message;
    div.append(text);

    if (role === 'system-ask') {
      const btn = document.createElement('button');
      btn.textContent = 'Improve';
      div.appendChild(btn);
      btn.addEventListener('click', () => {
        // remove button
        div.removeChild(btn);

        // call model
        this.sendMessageAction(message, 'SYSTEM');
      });
    }

    this.messages.push(div);
    this.requestUpdate();

    this.scrollToTheEnd();

    return {thinking, text};
  }

  scrollToTheEnd() {
    if (!this.anchor) return;
    this.anchor.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }

  async sendMessageAction(message?: string, role?: string) {
    if (this.chatState !== ChatState.IDLE) return;

    this.chatState = ChatState.GENERATING;

    let msg = '';
    if (message) {
      msg = message.trim();
    } else {
      // get message and empty the field
      msg = this.inputMessage.trim();
      this.inputMessage = '';
    }

    if (msg.length === 0) {
      this.chatState = ChatState.IDLE;
      return;
    }

    const msgRole = role ? role.toLowerCase() : 'user';

    if (msgRole === 'user' && msg) {
      this.addMessage(msgRole, msg);
    }

    if (this.sendMessageHandler) {
      await this.sendMessageHandler(
        msg,
        msgRole,
        this.code,
        this.codeHasChanged,
      );
      this.codeHasChanged = false;
    }

    this.chatState = ChatState.IDLE;
  }

  private async playAction() {
    if (this.isRunning) return;
    if (this.codeHasChanged) {
      this.runCode(this.code);
    }
    this.isRunning = true;
    this.previewFrame.contentWindow.postMessage('resume', '*');
  }

  private async stopAction() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.previewFrame.contentWindow.postMessage('stop', '*');
  }

  private async clearAction() {
    this.setCode(this.defaultCode);
    this.messages = [];
    this.codeHasChanged = true;
    if (this.resetHandler) {
      this.resetHandler();
    }
  }

  private async codeEditedAction(code: string) {
    if (this.chatState !== ChatState.IDLE) return;

    this.code = code;
    this.codeHasChanged = true;
    this.codeNeedsReload = true;

    this.codeSyntax.innerHTML = await marked.parse(
      '```javascript\n' + code + '\n```',
    );
  }

  private async inputKeyDownAction(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      this.sendMessageAction();
    }
  }

  private async reloadCodeAction() {
    this.runCode(this.code);
    this.isRunning = true;
  }

  render() {
    return html`<div class="playground">
      <div class="sidebar">
        <div class="selector">
          <button
            id="geminiTab"
            class=${classMap({
              'selected-tab': this.selectedChatTab === ChatTab.GEMINI,
            })}
            @click=${() => {
              this.selectedChatTab = ChatTab.GEMINI;
            }}>
            Gemini
          </button>
          <button
            id="codeTab"
            class=${classMap({
              'selected-tab': this.selectedChatTab === ChatTab.CODE,
            })}
            @click=${() => {
              this.selectedChatTab = ChatTab.CODE;
            }}>
            Code ${this.codeHasChanged ? ICON_EDIT : html``}
          </button>
        </div>
        <div
          id="chat"
          class=${classMap({
            'tabcontent': true,
            'showtab': this.selectedChatTab === ChatTab.GEMINI,
          })}>
          <div class="chat-messages">
            ${this.messages}
            <div id="anchor"></div>
          </div>

          <div class="footer">
            <div
              id="chatStatus"
              class=${classMap({'hidden': this.chatState === ChatState.IDLE})}>
              ${this.chatState === ChatState.GENERATING
                ? html`${ICON_BUSY} Generating...`
                : html``}
              ${this.chatState === ChatState.THINKING
                ? html`${ICON_BUSY} Thinking...`
                : html``}
              ${this.chatState === ChatState.CODING
                ? html`${ICON_BUSY} Coding...`
                : html``}
            </div>
            <div id="inputArea">
              <input
                type="text"
                id="messageInput"
                .value=${this.inputMessage}
                @input=${(e: InputEvent) => {
                  this.inputMessage = (e.target as HTMLInputElement).value;
                }}
                @keydown=${(e: KeyboardEvent) => {
                  this.inputKeyDownAction(e);
                }}
                placeholder="Type your message..."
                autocomplete="off" />
              <button
                id="sendButton"
                class=${classMap({
                  'disabled': this.chatState !== ChatState.IDLE,
                })}
                @click=${() => {
                  this.sendMessageAction();
                }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="30px"
                  viewBox="0 -960 960 960"
                  width="30px"
                  fill="currentColor">
                  <path d="M120-160v-240l320-80-320-80v-240l760 320-760 320Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div
          id="editor"
          class=${classMap({
            'tabcontent': true,
            'showtab': this.selectedChatTab === ChatTab.CODE,
          })}>
          <div class="code-container">
            ${this.codeSyntax}
            <textarea
              class="code-editor"
              contenteditable=""
              .value=${this.code}
              .readonly=${this.chatState !== ChatState.IDLE}
              @keyup=${(e: KeyboardEvent) => {
                const val = (e.target as HTMLTextAreaElement).value;
                if (this.code !== val) {
                  this.codeEditedAction(val);
                  this.requestUpdate();
                }
              }}
              @change=${(e: InputEvent) => {
                this.codeEditedAction((e.target as HTMLTextAreaElement).value);
              }}></textarea>
          </div>
        </div>
      </div>

      <div class="main-container">
        ${this.previewFrame}
        <div class="toolbar">
          <button
            id="reloadCode"
            @click=${() => {
              this.reloadCodeAction();
            }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="30px"
              viewBox="0 -960 960 960"
              width="30px"
              fill="currentColor">
              <path
                d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
            </svg>
            <div class="button-label">
              <p>Reload</p>
              <div
                id="reloadTooltip"
                class="button-tooltip ${classMap({
                  'show-tooltip': this.codeNeedsReload,
                })}">
                <p>Reload code changes</p>
              </div>
            </div>
          </button>
          <button
            id="runCode"
            class=${classMap({'disabled': this.isRunning})}
            @click=${() => {
              this.playAction();
            }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="55px"
              viewBox="0 -960 960 960"
              width="55px"
              fill="currentColor">
              <path
                d="m380-300 280-180-280-180v360ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />
            </svg>
          </button>
          <button
            id="stop"
            class=${classMap({'disabled': !this.isRunning})}
            @click=${() => {
              this.stopAction();
            }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="55px"
              viewBox="0 -960 960 960"
              width="55px"
              fill="currentColor">
              <path
                d="M320-320h320v-320H320v320ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />
            </svg>
          </button>
          <button
            id="clear"
            @click=${() => {
              this.clearAction();
            }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="30px"
              viewBox="0 -960 960 960"
              width="30px"
              fill="currentColor">
              <path
                d="m376-300 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56Zm-96 180q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Z" />
            </svg>
            <div class="button-label">
              <p>Reset</p>
            </div>
          </button>
        </div>
      </div>
    </div>`;
  }
}
