/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X } from 'lucide-react';
import { Github } from 'lucide-react';

const ErrorModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Semi-opaque blur background */}
      <div
        className="absolute inset-0 bg-gray-800/30 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl p-8 shadow-lg border border-gray-200 max-w-lg mx-4 z-10">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Something went wrong
        </h2>

        <p className="text-gray-600 mb-4">
          Want to run it yourself? Get the code and run it locally!
        </p>

        <p className="text-gray-600 mb-8">
          You can get your own API key from{' '}
          <a
            href="https://ai.google.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ai.google.dev
          </a>
          {' '}to start using this right away.
        </p>

        <div className="flex gap-4 justify-center">
          <a
            href="https://github.com/googlecreativelab/gemini-demos/tree/main/image-to-code"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Github size={20} />
            <span>Get the code on GitHub</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
