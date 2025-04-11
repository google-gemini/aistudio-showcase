/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* tslint:disable */
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

import {GoogleGenAI} from '@google/genai';
import {
  ArrowRight,
  ChevronDown,
  History,
  Image,
  Layers,
  Pen,
  Send,
  Settings,
  Upload,
} from 'lucide-react';
import React, {useCallback, useEffect, useState} from 'react';
import {useDropzone} from 'react-dropzone';
import CodePreview from './components/CodePreview';
import ErrorModal from './components/ErrorModal';
import Header from './components/Header';

const SAMPLE_IMAGES = [
  'beeripple.jpeg',
  'bubbles.jpeg',
  'clock.png',
  'flower.jpeg',
  'garage.jpeg',
  'sconce.jpeg',
  'steam.jpeg',
  'tree.png',
  'birds.jpeg',
  'bubblemachine.png',
];

const MODEL_NAME = 'gemini-2.0-flash-exp';
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

// Helper function to generate code from image
async function generateCodeFromImage(imageBase64, prompt, userInput) {
  const image = {
    inlineData: {
      data: imageBase64.split(',')[1],
      mimeType: 'image/jpeg',
    },
  };

  const finalPrompt = userInput.trim()
    ? `${prompt}\n\nUser input: ${userInput}`
    : prompt;

  const result = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [finalPrompt, image],
  });
  const response = result.text;

  const regex = /```(?:javascript|js)?\s*([\s\S]*?)```/g;
  const match = regex.exec(response);
  const extractedCode = match ? match[1].trim() : response;

  return {
    fullResponse: response,
    code: extractedCode,
  };
}

export default function Home() {
  const [imageBase64, setImageBase64] = useState('');
  const [outputs, setOutputs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasStartedGenerating, setHasStartedGenerating] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState(null);
  const [concurrentRequests, setConcurrentRequests] = useState(5);
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Load prompt from localStorage on initial render
  useEffect(() => {
    const savedPrompt = localStorage.getItem('savedPrompt');
    if (savedPrompt) {
      setPrompt(savedPrompt);
    } else {
      const defaultPrompt =
        `You are a creative coding expert who turns images into
      clever code sketches using p5js. A user will upload an image and you will
      generate a interactive p5js sketch that represents the image.
      The code sketch always has some sort of interactive element that
      connects to the nature of the object in the real world.
      ## EXAMPLES
      Here are some examples of what I mean by how the type of image could
      be turned into a clever creative coding sketch to capture the essence of the image.
      - A photo of birds --> a boids flocking algorithm sketch where the boids follow your mouse
      - A photo of a tree --> a recursive fractal tree that grows as you move your mouse up and down
      - A photo of a pond --> a sketch that has a ripple animation on mouse click
      - A photo of a wristwatch --> beautiful functioning clock that
      accesses system time and displays it like the wristwatch
      - A photo of a lamp --> a sketch of the lamp, but when you click
      the screen the lamp turns on and off
      - A photo of a zipper --> a sketch representing the shapes of the zipper,
      and when you move your mouse up and down the zipper opens and closes like a real zipper
      ## PROCESS
      To achieve creating this sketch, you reflect and
      meditate on the nature of the object BEFORE picking an algorithmic
      approach to represent the image. You are an agent that is thoughtful,
      clever, delightful, and playful.
      Before you start, think about the image and the best way to represent it in p5js.
      1. Describe the behavioral properties of the image. List some ways it
       behaves in the real world or some patterns it exhibits. Describe the
       colors and vibe of the image as well.
      2. Given the behavorial properties of the image, identify a common creative
      coding algorithm that can be paired up to this image to make a delightful p5js sketch.
      3. State the bounding boxes of the important parts of the composition
      of the photo. We will need to use these bounding boxes to make sure our
      composition of our sketch resembles the composition of the photo uploaded.
      Our sketch's composition needs to resemble the composition of the uploaded photo.
      4. Implement a algorithm in p5js, using the properties of the image described
      earlier. Use either mouseMoved() or mouseClicked() to make it interactive.
      Generate a SINGLE, COMPLETE code snippet. We parse out the response you generate,
      so we should have only ONE code snippet that incorporates all of the information
      from steps 1 (behavioral description), 2 (creative coding algorithm to bring this to life),
      3 (bounding boxes to preserve compositional integrity).
      ## EXECUTION
      Complete all of these steps. When you write your code, be sure to leave clear
      comments to describe the different parts of the code and what you are doing.
      Do not EVER try to load in external images or any other libraries.
      Everything must be self contained in the one file and code snippet.
      And don't be too verbose.`.trim();
      setPrompt(defaultPrompt);
      localStorage.setItem('savedPrompt', defaultPrompt);
    }
  }, []);

  // Save prompt to localStorage whenever it changes
  useEffect(() => {
    if (prompt) {
      localStorage.setItem('savedPrompt', prompt);
    }
  }, [prompt]);

  const [showSamples, setShowSamples] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [imageDetails, setImageDetails] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target.result;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleFactor = 512 / img.width;
        canvas.width = 512;
        canvas.height = img.height * scaleFactor;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImageBase64(canvas.toDataURL());
        setImageDetails({
          name: file.name,
          size: `${(file.size / 1024).toFixed(2)}kB`,
          type: file.type,
        });
      };
    };

    reader.readAsDataURL(file);
  }, []);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    accept: 'image/*',
  });

  const generateCode = async () => {
    if (!imageBase64) return;

    setLoading(true);
    setHasStartedGenerating(true);
    setOutputs([]);

    try {
      const requests = Array(concurrentRequests)
        .fill()
        .map(() => generateCodeFromImage(imageBase64, prompt, userInput));

      const results = await Promise.all(requests);

      // Check if any requests resulted in an error
      if (results.some((result) => result.error)) {
        setShowErrorModal(true);
        return;
      }

      setOutputs(
        results.map((result, index) => ({
          id: index + 1,
          code: result.code,
          fullResponse: result.fullResponse,
        })),
      );
    } catch (error) {
      console.error('Error generating code:', error);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const renderSketch = (code) => {
    const formattedCodeResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=512, initial-scale=1.0">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.js"></script>
        <title>p5.js Sketch</title>
        <style> body {padding: 0; margin: 0;} </style>
      </head>
      <body>
      <script>
        window.onerror = function(message, source, lineno, colno, error) {
          document.body.innerHTML += '<h3>🔴Error:</h3><pre>' + message + '</pre>';
        };
        ${code}
      </script>
      </body>
      </html>
    `;

    return (
      <iframe
        srcDoc={formattedCodeResponse}
        title="p5.js Sketch"
        width="100%"
        height="300"
        style={{border: 'none'}}
      />
    );
  };

  const handleCodeChange = (id, newCode) => {
    setOutputs((prevOutputs) =>
      prevOutputs.map((output) =>
        output.id === id ? {...output, code: newCode} : output,
      ),
    );
  };

  const handleSampleSelect = async (imageName) => {
    setSelectedSample(imageName);
    try {
      const response = await fetch(
        `https://www.gstatic.com/aistudio/starter-apps/code/samples/${imageName}`,
      );
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target.result;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scaleFactor = 512 / img.width;
          canvas.width = 512;
          canvas.height = img.height * scaleFactor;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setImageBase64(canvas.toDataURL());
        };
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error loading sample image:', error);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-white mt-[0px] sm:mt-0">
        <Header />
        <ErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
        />
        <div className="absolute inset-0 top-[57px] sm:top-[73px] overflow-y-auto overscroll-y-contain -webkit-overflow-scrolling-touch">
          <div
            className={`flex flex-col md:flex-row gap-4 max-w-7xl mx-auto ${!hasStartedGenerating ? 'justify-center' : ''} md:h-[calc(100vh-73px)]`}>
            <div
              className={`w-full md:w-6/12 py-4 md:py-12 px-3 ${!hasStartedGenerating ? 'md:max-w-2xl mx-auto' : ''} md:overflow-y-auto`}>
              <section className="flex flex-col bg-gray-100 rounded-2xl p-4">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed bg-gray-100 rounded-2xl m-4 min-h-96 h-fit flex
                flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors ${imageBase64 ? 'border-none' : 'border-gray-300'}`}>
                  <input {...getInputProps()} />
                  {imageBase64 ? (
                    <img
                      src={imageBase64}
                      alt="Uploaded"
                      className="max-h-full max-w-full object-contain rounded-2xl"
                    />
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mb-4" />
                      <p className="text-gray-400 text-center px-4">
                        {isDragActive
                          ? 'Drop the image here'
                          : 'Drag & drop an image here, or click to select one'}
                      </p>
                    </>
                  )}
                </div>
                <div className="max-w-full mb-4">
                  <div className="flex overflow-x-auto gap-2 py-1 mx-4">
                    {SAMPLE_IMAGES.map((image) => (
                      <button
                        key={image}
                        type="button"
                        onClick={() => handleSampleSelect(image)}
                        className={`flex-shrink-0 w-14 h-14 bg-white rounded-lg hover:scale-110 transition-all ${
                          selectedSample === image
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-300'
                        }`}>
                        <img
                          src={`https://www.gstatic.com/aistudio/starter-apps/code/samples/${image}`}
                          alt={image}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </section>
              <section className="mt-4 space-y-4 bg-gray-100 rounded-2xl p-4">
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSamples(!showSamples)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                    {/* <Settings size={16} /> */}
                    <span className="font-bold">Advanced</span>
                    <ChevronDown
                      size={16}
                      className={`transform transition-transform ${
                        showSamples ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {showSamples && (
                    <div className="my-2 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers size={14} className="text-gray-600" />
                            <label
                              htmlFor="concurrent-requests"
                              className="text-sm font-medium text-gray-700">
                              Concurrent Requests: {concurrentRequests}
                            </label>
                          </div>
                          <input
                            id="concurrent-requests"
                            type="range"
                            min="1"
                            max="10"
                            value={concurrentRequests}
                            onChange={(e) =>
                              setConcurrentRequests(Number(e.target.value))
                            }
                            className="w-1/2"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPrompt(!showPrompt)}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                          <Pen size={14} />
                          <span>Edit System Prompt</span>
                          <ChevronDown
                            size={16}
                            className={`transform transition-transform ${showPrompt ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {showPrompt && (
                          <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full h-64 p-2 border rounded-lg font-mono text-sm mt-2 bg-white text-gray-900"
                            placeholder="Enter your prompt here..."
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
              <section className="mt-4">
                <button
                  type="button"
                  onClick={generateCode}
                  className="px-4 py-4 bg-gray-800 text-white rounded-2xl mb-8
                  hover:bg-gray-900  transition-colors w-full disabled:bg-gray-300 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 font-bold"
                  disabled={!imageBase64 || loading}>
                  {/* <Send size={16} className={loading ? 'opacity-50' : ''} /> */}
                  <span>
                    {loading
                      ? 'Generating...'
                      : `Generate ${concurrentRequests} Code Snippet${concurrentRequests > 1 ? 's' : ''}`}
                  </span>
                </button>
              </section>
            </div>
            {hasStartedGenerating && (
              <div className="w-full md:w-6/12 py-4 md:py-12 px-3 animate-slide-in md:overflow-y-auto md:h-full">
                {loading
                  ? // Loading skeletons for code previews
                    Array(concurrentRequests)
                      .fill()
                      .map((_, index) => (
                        <div
                          key={`skeleton-preview-${Date.now()}-${index}`}
                          className="mb-4 p-6 rounded-3xl bg-gray-100 animate-pulse">
                          <div className="w-full h-[500px] bg-gray-200 rounded-lg mb-4" />
                          <div className="flex justify-between items-center">
                            <div className="h-10 w-32 bg-gray-200 rounded-full" />
                            <div className="h-10 w-24 bg-gray-200 rounded-full" />
                          </div>
                        </div>
                      ))
                  : outputs.map((output) => (
                      <CodePreview
                        key={output.id}
                        output={output}
                        onCodeChange={handleCodeChange}
                        fullResponse={output.fullResponse}
                      />
                    ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
