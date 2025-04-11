/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Github, Info } from 'lucide-react';

const Header = () => {
  return (
    <div className="sticky top-0 w-full bg-white p-4 z-50 ">
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div className="flex items-center gap-2 text-base">
          <span className="text-black font-bold text-lg">Image to Code</span>
          <span className="text-gray-500">
            Built with{' '}
            <a
              href="https://ai.google.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-800 transition-colors"
            >
              Gemini 2.0
            </a>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/googlecreativelab/gemini-demos/tree/main/image-to-code"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <Github size={18} className="text-gray-600" />
            <span>GitHub Repository</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Header;
