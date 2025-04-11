/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {css} from 'lit';

/** Styles for the PDF summary component. */
export const styles = css`
  :host {
    display: block;
    font-family: -apple-system, Roboto, BlinkMacSystemFont, 'Segoe UI', Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
    background-color: light-dark(#f9fafb, #111827);
    border-radius: 12px;
    box-shadow: light-dark(
      0 4px 12px rgba(0, 0, 0, 0.05),
      0 4px 12px rgba(0, 0, 0, 0.2)
    );
    color: light-dark(#111827, #f9fafb);
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  h1 {
    font-size: 1.75rem; /* Slightly smaller */
    font-weight: 600;
    color: light-dark(#1f2937, #e5e7eb);
    margin-bottom: 0.75rem;
  }

  header {
    margin-bottom: 2.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid light-dark(#e5e7eb, #374151);
  }

  header p {
    color: light-dark(#4b5563, #9ca3af);
    line-height: 1.6;
  }

  a {
    color: #2563eb; /* Nice blue */
    text-decoration: none;
    transition: color 0.2s ease;
  }
  a:hover {
    color: #1d4ed8; /* Darker blue on hover */
    text-decoration: underline;
  }

  /* Examples Section */
  .examples-section > p {
    /* Target "Examples:" text */
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: light-dark(#374151, #d1d5db);
  }
  ul {
    list-style: none;
    padding-left: 0;
    margin-top: 0.5rem;
  }
  li {
    margin-bottom: 0.5rem;
  }
  /* Style the clickable example paragraphs */
  li button {
    background-color: light-dark(#ffffff, #374151);
    cursor: pointer;
    padding: 0.6rem 0.8rem;
    border-radius: 6px;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;
    display: inline-block; /* Prevent stretching full width */
    font-size: 0.9rem;
    margin: 0; /* Reset default paragraph margin */
  }

  /* Form Inputs & Controls */
  input[type='text'],
  select,
  button {
    padding: 0.65rem 0.9rem;
    border-radius: 8px;
    border: 1px solid light-dark(#d1d5db, #4b5563);
    font-size: 0.95rem;
    background-color: light-dark(#ffffff, #374151);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
    color: light-dark(#111827, #f9fafb);
  }

  select:hover,
  li button:hover {
    border-color: #2563eb;
    color: light-dark(#1d4ed8, #eff6ff);
    font-weight: normal; /* Override default bold hover if any */
  }

  button:active {
    outline: 1px solid;
  }

  input[type='text']:focus,
  select:focus {
    outline: none;
    border-color: #2563eb; /* Blue focus border */
    box-shadow: 0 0 0 3px
      light-dark(rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.4));
  }

  .status button {
    cursor: pointer;
    background-color: #2563eb; /* Blue button */
    color: white;
    border: none;
    font-weight: 500;
    transition:
      background-color 0.2s ease,
      opacity 0.2s ease;
  }
  .status button:hover {
    background-color: #1d4ed8; /* Darker blue */
  }
  button:disabled {
    background-color: #93c5fd; /* Lighter blue when disabled */
    cursor: not-allowed;
    opacity: 0.8;
  }

  input[type='text'] {
    width: 100%; /* Take available width */
    flex-grow: 1; /* Allow shrinking/growing in flex context */
  }
  input[type='range'] {
    cursor: pointer;
    vertical-align: middle; /* Align better with text */
    accent-color: #2563eb; /* Style the slider thumb/track */
    margin: 0 0.5rem; /* Add some space around the slider */
    flex-grow: 1; /* Allow it to take space */
    max-width: 200px; /* Prevent it getting too wide */
  }
  select {
    cursor: pointer;
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1.5em 1.5em;
    padding-right: 2.5rem; /* Make space for arrow */
    -webkit-appearance: none; /* Remove default Mac/iOS styles */
    -moz-appearance: none; /* Remove default Firefox styles */
    appearance: none; /* Remove default system styles */
  }

  /* Instructions Layout */
  .instructions {
    display: flex;
    flex-direction: column;
    gap: 1.5rem; /* Increased gap between instruction rows */
    margin: 2.5rem 0;
    background-color: light-dark(#ffffff, #1f2937);
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid light-dark(#e5e7eb, #374151);
  }
  .instructions p {
    display: flex;
    flex-direction: row; /* Keep elements in a row */
    flex-wrap: wrap; /* Allow wrapping on small screens */
    align-items: center;
    gap: 0.75rem; /* Space between items in a row */
    line-height: 1.6;
    color: light-dark(#4b5563, #9ca3af);
  }
  /* Style the label text parts */
  .instructions p > span {
    display: contents; /* Let parent flexbox handle layout */
  }

  /* Status Area */
  .status {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  .status p {
    color: light-dark(#4b5563, #9ca3af);
    font-style: italic;

    &.error {
      color: red;
    }
  }

  /* Summarization Output */
  .summarization {
    margin-top: 2.5rem;
    padding: 1.5rem;
    background-color: light-dark(#ffffff, #1f2937);
    border-radius: 8px;
    border: 1px solid light-dark(#e5e7eb, #374151);
    line-height: 1.7; /* Better readability for longer text */
    color: light-dark(#374151, #d1d5db);
    min-height: 5em; /* Give it some initial height */
  }

  /* Basic Markdown Styles (if needed) */
  .summarization h1,
  .summarization h2,
  .summarization h3 {
    margin-top: 1.5em;
    margin-bottom: 0.75em;
    color: light-dark(#1f2937, #e5e7eb);
    line-height: 1.3;
    font-weight: 600;
  }
  .summarization p {
    margin-bottom: 1em;
  }
  .summarization ul,
  .summarization ol {
    margin-left: 1.5em;
    margin-bottom: 1em;
    padding-left: 1em; /* Add padding for list markers */
  }
  .summarization ul {
    list-style: disc;
  }
  .summarization ol {
    list-style: decimal;
  }
  .summarization li {
    margin-bottom: 0.5em;
  }
  .summarization code {
    background-color: light-dark(#f3f4f6, #374151);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      'Liberation Mono', 'Courier New', monospace;
    color: light-dark(#111827, #e5e7eb);
  }
  .summarization pre {
    background-color: light-dark(#f3f4f6, #374151);
    padding: 1em;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 0.9em;
    color: light-dark(#111827, #e5e7eb);
  }
  .summarization strong,
  .summarization b {
    font-weight: 600;
  }
  .summarization em,
  .summarization i {
    font-style: italic;
  }
`;
