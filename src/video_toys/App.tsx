/* tslint:disable */

import ContentContainer from '@/components/ContentContainer';
import ExampleGallery from '@/components/ExampleGallery';
import {DataContext} from '@/context';
import {Example} from '@/lib/types';
import {
  getYoutubeEmbedUrl,
  getYouTubeVideoTitle,
  validateYoutubeUrl,
} from '@/lib/youtube';
import {useContext, useEffect, useRef, useState} from 'react';

// Whether to validate the input URL before attempting to generate content
const VALIDATE_INPUT_URL = true;

// Whether to pre-seed with example content
const PRESEED_CONTENT = false;

// Helper function to create a share link
async function createShareLink(
  videoUrl: string,
  spec: string,
  code: string,
): Promise<Example> {
  const title = await getYouTubeVideoTitle(videoUrl);
  return {
    title,
    url: videoUrl,
    spec: spec,
    code: code,
  };
}

// Helper function to load a shared state by ID
export default function App() {
  const {defaultExample, examples, setExamples, isLoading} =
    useContext(DataContext);

  const [videoUrl, setVideoUrl] = useState(
    PRESEED_CONTENT ? defaultExample?.url : '',
  );

  const [urlValidating, setUrlValidating] = useState(false); // State to track URL validation
  const [contentLoading, setContentLoading] = useState(false); // State to track content loading

  // Reference to ContentContainer component for accessing its state
  const contentContainerRef = useRef<{
    getSpec: () => string;
    getCode: () => string;
  } | null>(null);

  // Counter to force ContentContainer re-mount even if the video URL hasn't changed
  const [reloadCounter, setReloadCounter] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedExample, setSelectedExample] = useState<Example | null>(
    PRESEED_CONTENT ? defaultExample : null,
  );

  // Handle 'Enter' key press in the input field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !urlValidating && !contentLoading) {
      handleSubmit();
    }
  };

  const handleExampleSelect = (example: Example) => {
    if (inputRef.current) {
      inputRef.current.value = example.url;
    }
    setVideoUrl(example.url);
    setSelectedExample(example);
    setReloadCounter((c) => c + 1);
  };

  const handleSubmit = async () => {
    const inputValue = inputRef.current?.value.trim() || '';

    if (!inputValue) {
      inputRef.current?.focus();
      return;
    }

    // Prevent multiple clicks while validating
    if (urlValidating) return;

    setUrlValidating(true);
    setVideoUrl(''); // Clear previous video URL immediately
    setContentLoading(false); // Reset content loading state
    setSelectedExample(null); // Clear the selected example to force new generation

    // Check if the URL matches any of our examples
    const isPreSeededExample = [defaultExample, ...examples].some(
      (example) => example.url === inputValue,
    );

    // No need to validate the URL if it's a pre-seeded example
    if (isPreSeededExample) {
      proceedWithVideo(inputValue);
      return;
    }

    if (VALIDATE_INPUT_URL) {
      // Validate video URL
      const validationResult = await validateYoutubeUrl(inputValue);

      if (validationResult.isValid) {
        proceedWithVideo(inputValue);
      } else {
        alert(validationResult.error || 'Invalid YouTube URL');
        setUrlValidating(false);
      }
    } else {
      // If URL validation is disabled, proceed directly
      proceedWithVideo(inputValue);
    }
  };

  // Helper function to handle common operations after URL validation
  const proceedWithVideo = (url: string) => {
    setVideoUrl(url);
    // Incrementing the counter changes the 'key' prop on ContentContainer,
    // forcing it to re-mount and re-generate content
    setReloadCounter((c) => c + 1);
    setUrlValidating(false);
  };

  // Callback function to handle loading state changes from ContentContainer
  const handleContentLoadingStateChange = (isLoading: boolean) => {
    setContentLoading(isLoading);
  };

  const handleShare = async () => {
    if (!videoUrl || !contentContainerRef.current) return;

    // Get current spec and code
    const currentSpec = contentContainerRef.current.getSpec();
    const currentCode = contentContainerRef.current.getCode();

    try {
      // Set a loading state for the button
      setContentLoading(true);

      // Create share link using helper function
      const result = await createShareLink(videoUrl, currentSpec, currentCode);

      setExamples([result, ...examples]);
    } catch (err) {
      console.error('Share error:', err);
      alert('Failed to create shareable URL');
    } finally {
      setContentLoading(false);
    }
  };

  const exampleGallery = (
    <ExampleGallery
      title={PRESEED_CONTENT ? 'More examples' : 'Examples'}
      onSelectExample={handleExampleSelect}
      selectedExample={selectedExample}
    />
  );

  return (
    <>
      <main className="main-container">
        <div className="left-side">
          <h1 className="headline">Video Toys</h1>
          <p className="subtitle">
            Generate interactive learning apps from YouTube content
          </p>
          <p className="attribution">
            An experiment by <strong>Aaron Wade</strong>
          </p>
          <div className="input-container">
            <label htmlFor="youtube-url" className="input-label">
              Paste a URL from YouTube:
            </label>
            <input
              ref={inputRef}
              id="youtube-url"
              className="youtube-input"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              defaultValue={PRESEED_CONTENT ? defaultExample?.url : ''}
              disabled={urlValidating || contentLoading} // Disable input while validating or loading
              onKeyDown={handleKeyDown} // Add keydown handler
              onChange={() => {
                // Clear all content upon input change
                setVideoUrl('');
                setSelectedExample(null);
              }}
            />
          </div>

          <div className="button-container">
            <button
              onClick={handleSubmit}
              className="button-primary submit-button"
              disabled={urlValidating || contentLoading} // Disable button during validation or content loading
            >
              {urlValidating
                ? 'Validating URL...'
                : contentLoading
                  ? 'Generating...'
                  : 'Generate app'}
            </button>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="button-primary share-button"
              disabled={urlValidating || contentLoading || !videoUrl} // Disable if validating, loading, or no video URL
              onClick={handleShare}>
              <span
                style={{
                  fontFamily: 'var(--font-symbols)',
                  fontSize: '1.25rem',
                }}>
                save
              </span>
            </button>
          </div>

          <div className="video-container">
            {videoUrl ? (
              <iframe
                className="video-iframe"
                src={getYoutubeEmbedUrl(videoUrl)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen></iframe>
            ) : (
              <div className="video-placeholder">Video will appear here</div>
            )}
          </div>

          <div className="gallery-container desktop-gallery-container">
            {exampleGallery}
          </div>
        </div>

        <div className="right-side">
          <div className="content-area">
            {videoUrl ? (
              <ContentContainer
                key={reloadCounter}
                contentBasis={videoUrl}
                onLoadingStateChange={handleContentLoadingStateChange}
                preSeededSpec={selectedExample?.spec}
                preSeededCode={selectedExample?.code}
                ref={contentContainerRef}
              />
            ) : (
              <div className="content-placeholder">
                <p>
                  {urlValidating
                    ? 'Validating URL...'
                    : 'Paste a YouTube URL or select an example to begin'}
                </p>
              </div>
            )}
          </div>

          <div className="gallery-container mobile-gallery-container">
            {exampleGallery}
          </div>
        </div>
      </main>

      <style>{`
        .main-container {
          --color-headline: light-dark(#000, #fff);
          --color-subtitle: light-dark(#666, #c8c8c8);
          --color-attribution: light-dark(#999, #e1e1e1);

          --color-video-container-background: light-dark(#f0f0f0, #f4f4f4);

          --color-video-placeholder-text: light-dark(#787878, #4d4d4d);

          --color-content-placeholder-border: light-dark(#ccc, #9a9b9c);
          --color-content-placeholder-text: light-dark(#787878, #f4f4f4);

          padding: 2rem;
          display: flex;
          gap: 2rem;
          height: 100vh;
          box-sizing: border-box;
          overflow: hidden;

          @media (max-width: 768px) {
            flex-direction: column;
            padding: 2.25rem 1.5rem 1.5rem;
            gap: 1rem;
            height: auto;
            overflow: visible;
          }
        }

        .left-side {
          width: 40%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          overflow-y: auto;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */

          @media (max-width: 768px) {
            width: 100%;
            height: auto;
            overflow: visible;
          }
        }

        .left-side::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }

        .right-side {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 1rem;
          height: 100%;

          @media (max-width: 768px) {
            height: auto;
          }
        }


        .headline {
          color: var(--color-headline);
          font-family: var(--font-display);
          font-size: 4rem;
          font-weight: 400;
          margin-top: 0.5rem;
          margin-bottom: 0;
          text-align: center;
          text-transform: uppercase;

          @media (max-width: 768px) {
            font-size: 2.625rem;
            margin-top: 0;
          }
        }

        .subtitle {
          color: var(--color-subtitle);
          font-size: 1.2rem;
          margin-top: -0.5rem;
          margin-bottom: 0;
          text-align: center;

          @media (max-width: 768px) {
            font-size: 0.875rem;
          }
        }

        .attribution {
          color: var(--color-attribution);
          font-family: var(--font-secondary);
          font-size: 0.9rem;
          font-style: italic;
          margin-bottom: 1rem;
          margin-top: -0.5rem;
          text-align: center;

          @media (max-width: 768px) {
            font-size: 0.8rem;
          }
        }

        .input-container {
          width: 100%;
        }

        .input-label {
          display: block;
          margin-bottom: 0.5rem;
        }

        .youtube-input {
          width: 100%;
        }

        .button-container {
          width: 100%;
          display: flex;
          gap: 0.5rem;
        }

        .submit-button {
          flex: 1;
        }

        .share-button {
          flex: 0.05;
        }

        .video-container {
          background-color: var(--color-video-container-background);
          border-radius: 8px;
          color: var(--color-video-placeholder-text);
          margin: 0.5rem 0;
          padding-top: 56.25%; /* 16:9 aspect ratio */
          position: relative;
          width: 100%;
        }

        .video-iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 8px;
        }

        .video-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-height: 100%;

          @media (max-width: 768px) {
            max-height: 550px;
            min-height: 550px;
          }
        }

        .content-placeholder {
          align-items: center;
          border: 2px dashed var(--color-content-placeholder-border);
          border-radius: 8px;
          box-sizing: border-box;
          color: var(--color-content-placeholder-text);
          display: flex;
          flex-direction: column;
          font-size: 1.2rem;
          height: 100%;
          justify-content: center;
          padding: 0 2rem;
          width: 100%;

          @media (max-width: 768px) {
            min-height: inherit;
          }
        }

        .gallery-container {
          width: 100%;
        }

        .desktop-gallery-container {
          display: block;

          @media (max-width: 768px) {
            display: none; /* Hide on mobile */
          }
        }

        .mobile-gallery-container {
          display: none; /* Hide on desktop */

          @media (max-width: 768px) {
            display: block;
          }
        }
      `}</style>
    </>
  );
}
