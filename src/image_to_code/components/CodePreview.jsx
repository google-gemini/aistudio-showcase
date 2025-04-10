/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState } from 'react';
import { Code2, Play, Copy, Check, MessageCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ToggleButton from './ToggleButton';

const CodePreview = ({ output, onCodeChange, fullResponse }) => {
  const [showCode, setShowCode] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output.code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const renderSketch = (code) => {
    // Make sure we're working with a string
    const codeString = typeof code === 'string' ? code : code.toString();

    const wrappedCode = codeString.includes('function setup()') ? codeString : `
      function setup() {
        createCanvas(500, 500);
        ${codeString}
      }

      function draw() {
        // Add default draw function if not present
        if (typeof window.draw !== 'function') {
          window.draw = function() {};
        }
      }
    `;

    const formattedCodeResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.js"></script>
        <title>p5.js Sketch</title>
        <style>
          body {
            padding: 0;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            overflow: hidden;
          }
          canvas {
            max-width: 100% !important;
            height: auto !important;
          }
        </style>
      </head>
      <body>
        <script>
          try {
            ${wrappedCode}
            // Immediately call setup if it hasn't been called
            if (typeof window.setup === 'function') {
              new p5();
            }
          } catch (error) {
            console.error('Sketch error:', error);
            document.body.innerHTML = '<div style="color: red; padding: 20px;"><h3>🔴 Error:</h3><pre>' + error.message + '</pre></div>';
          }
        </script>
      </body>
      </html>
    `;

    return (
      <div className="relative w-full h-[500px] bg-gray-50 rounded-lg overflow-hidden">
        <iframe
          srcDoc={formattedCodeResponse}
          title="p5.js Sketch"
          width="100%"
          height="100%"
          style={{ border: "none" }}
          className="absolute inset-0"
        />
      </div>
    );
  };

  // Make sure we're passing the actual code string to renderSketch
  const sketchCode = output?.code || '';

  return (
    <div className="mb-4 p-6 rounded-3xl bg-gray-100">
      <div className="mb-4">
        {showCode ? (
          <div className="w-full h-[500px] rounded-lg overflow-hidden border">
            <Editor
              height="500px"
              defaultLanguage="javascript"
              value={sketchCode}
              onChange={(value) => onCodeChange(output.id, value)}
              theme="light"
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'off',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                padding: { top: 8, bottom: 8 }
              }}
            />
          </div>
        ) : showReasoning ? (
          <div className="w-full h-[500px] rounded-lg overflow-y-auto border p-4 prose prose-xs max-w-none bg-white">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              className="text-xs text-gray-700"
              components={{
                code: ({node, inline, className, children, ...props}) => (
                  <code className={`${className} ${inline ? 'text-[0.7rem] bg-slate-50 text-slate-900 px-1.5 py-0.5 rounded border border-slate-200' : ''}`} {...props}>
                    {children}
                  </code>
                ),
                pre: ({node, children, ...props}) => (
                  <pre className="text-[0.7rem] bg-slate-50 text-slate-900 p-3 rounded-md overflow-x-auto border border-slate-200" {...props}>
                    {children}
                  </pre>
                ),
                p: ({node, children}) => (
                  <p className="text-xs mb-2 text-gray-700">{children}</p>
                ),
                h1: ({node, children}) => (
                  <h1 className="text-sm font-bold mb-2 text-gray-900">{children}</h1>
                ),
                h2: ({node, children}) => (
                  <h2 className="text-xs font-bold mb-2 text-gray-900">{children}</h2>
                ),
                h3: ({node, children}) => (
                  <h3 className="text-xs font-semibold mb-1 text-gray-900">{children}</h3>
                ),
                ul: ({node, children}) => (
                  <ul className="text-xs list-disc pl-4 mb-2 text-gray-700">{children}</ul>
                ),
                ol: ({node, children}) => (
                  <ol className="text-xs list-decimal pl-4 mb-2 text-gray-700">{children}</ol>
                ),
                li: ({node, children}) => (
                  <li className="text-xs mb-1 text-gray-700">{children}</li>
                )
              }}
            >
              {fullResponse}
            </ReactMarkdown>
          </div>
        ) : (
          renderSketch(sketchCode)
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-2">
        <div className="inline-flex rounded-full bg-gray-200 gap-1 w-full sm:w-auto justify-center">
          <ToggleButton
            icon={Play}
            label="Preview"
            isSelected={!showCode && !showReasoning}
            onClick={() => {
              setShowCode(false);
              setShowReasoning(false);
            }}
          />
          <ToggleButton
            icon={MessageCircle}
            label="Reasoning"
            isSelected={showReasoning}
            onClick={() => {
              setShowCode(false);
              setShowReasoning(true);
            }}
          />
          <ToggleButton
            icon={Code2}
            label="Code"
            isSelected={showCode}
            onClick={() => {
              setShowCode(true);
              setShowReasoning(false);
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`px-3.5 py-2.5 rounded-full transition-colors inline-flex text-sm border border-gray-300
            items-center gap-1 w-full sm:w-auto justify-center ${
            isCopied
              ? "bg-gray-500 text-white"
              : "bg-transparent text-gray-700 hover:bg-gray-100"
          }`}
        >
          {isCopied ? (
            <>
              <Check size={14} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy Code
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CodePreview;
