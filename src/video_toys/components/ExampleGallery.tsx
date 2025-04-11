/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* tslint:disable */

import {DataContext} from '@/context';
import {Example} from '@/lib/types';
import {useContext, useEffect, useState} from 'react';

interface ExampleGalleryProps {
  title?: string;
  selectedExample: Example | null;
  onSelectExample: (example: Example) => void;
}

export default function ExampleGallery({
  title = 'Examples',
  selectedExample,
  onSelectExample,
}: ExampleGalleryProps) {
  const getThumbnailUrl = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
  };

  const {defaultExample, examples, isLoading} = useContext(DataContext);

  return (
    <div className="example-gallery">
      <h2 className="gallery-title">{title}</h2>
      <div className="gallery-grid">
        {examples.map((example) => (
          <div
            key={example.title}
            className={`gallery-item ${
              selectedExample?.title === example.title ? 'selected' : ''
            }`}
            onClick={() => onSelectExample(example)}>
            <div className="thumbnail-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getThumbnailUrl(example.url)}
                alt={example.title}
                className="thumbnail"
              />
            </div>
            <div className="gallery-item-title">{example.title}</div>
          </div>
        ))}
      </div>

      <style>{`
        .example-gallery {
          width: 100%;
        }

        .gallery-title {
          color: light-dark(#363636, #fff);
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .gallery-item {
          cursor: pointer;
          border: 1px solid light-dark(#ddd, #7a7a7a);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .gallery-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .gallery-item.selected {
          border: 2px solid var(--color-accent);
        }

        .gallery-item-title {
          align-items: center;
          background-color: light-dark(#f5f5f5, transparent);
          display: flex;
          flex-grow: 1;
          font-size: 0.9rem;
          justify-content: center;
          padding: 0.5rem;
          text-align: center;
        }

        .thumbnail-container {
          position: relative;
          padding-top: 56.25%; /* 16:9 aspect ratio */
        }

        .thumbnail {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </div>
  );
}
