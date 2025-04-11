/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* tslint:disable */

// Function to extract YouTube video ID
export const getYouTubeVideoId = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    // Handle standard watch URLs (youtube.com/watch?v=...)
    if (
      parsedUrl.hostname === 'www.youtube.com' ||
      parsedUrl.hostname === 'youtube.com'
    ) {
      const videoId = parsedUrl.searchParams.get('v');
      if (videoId && videoId.length === 11) {
        return videoId;
      }
    }
    // Handle short URLs (youtu.be/...)
    if (parsedUrl.hostname === 'youtu.be') {
      const videoId = parsedUrl.pathname.substring(1); // Remove leading '/'
      if (videoId && videoId.length === 11) {
        return videoId;
      }
    }
    // Handle embed URLs (youtube.com/embed/...)
    if (parsedUrl.pathname.startsWith('/embed/')) {
      const videoId = parsedUrl.pathname.substring(7); // Length of '/embed/'
      if (videoId && videoId.length === 11) {
        return videoId;
      }
    }
  } catch (e) {
    // Ignore URL parsing errors, means it's likely not a valid URL format
    console.warn('URL parsing failed:', e);
  }
  // Fallback using simplified Regex for other potential edge cases not caught by URL parsing
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }

  return null;
};

// Helper function to validate a YouTube video URL
export async function validateYoutubeUrl(
  url: string,
): Promise<{isValid: boolean; error?: string}> {
  if (getYouTubeVideoId(url)) {
    return {isValid: true};
  }
  return {isValid: false, error: 'Invalid YouTube URL'};
}

// Helper function to extract YouTube video ID and create embed URL
export function getYoutubeEmbedUrl(url: string): string {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = match && match[2].length === 11 ? match[2] : null;

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // This fallback is unlikely to be hit if validation is working
  console.warn(
    'Could not extract video ID for embedding, using original URL:',
    url,
  );
  return url;
}

export async function getYouTubeVideoTitle(url: string) {
  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

  const response = await fetch(oEmbedUrl);

  if (!response.ok) {
    throw new Error('Not valid Url');
  }

  // Parse the JSON response
  const data = await response.json();

  // Display the title
  if (data && data.title) {
    return data.title;
  } else {
    throw new Error('Error: No title found in the response.');
  }
}
