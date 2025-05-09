/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const axios = require('axios');
const https = require('https');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const externalApiBaseUrl = 'https://generativelanguage.googleapis.com'; // Gemini API Endpoint
const apiKey = process.env.API_KEY;

const staticPath = path.join(__dirname,'dist')
const publicPath = path.join(__dirname,'public')

if (!apiKey) {
    // Only log an error, don't exit. The server will serve a placeholder page with a warning.
    console.error("Warning: API_KEY environment variable is not set! Proxy functionality will be disabled.");
}

// Middleware to parse JSON request bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({extended: true, limit: '50mb'}));


// Proxy route for Gemini API calls
app.use('/api-proxy', async (req, res) => {
    if (req.body) { // Only log body if it exists
        console.log("  Request Body (from frontend):", req.body);
    }
    try {
        const apiUrl = `${externalApiBaseUrl}${req.url}`; // Inject API key as query parameter

        const apiResponse = await axios({
            method: req.method,
            url: apiUrl,
            headers: {
               'X-Goog-Api-Key': apiKey,
               'Content-Type': 'application/json',
               "accept": "*/*",
               "accept-language": "en-US,en;q=0.9",
               "priority": "u=1, i",
               "sec-fetch-dest": "empty",
               "sec-fetch-mode": "cors",
               "sec-fetch-site": "cross-site",
               },
            data: req.body,
            responseType: 'stream',
        });


        apiResponse.data.on('data', (chunk) => {
            res.write(chunk); // Stream the data to the response
        });

        apiResponse.data.on('end', () => {
            res.end(); // Signal the end of the stream
        });


        // Handle errors during the stream
        apiResponse.data.on('error', (err) => {
            console.error('Error during streaming:', err);
            res.status(500).json({ error: 'Proxy error during streaming' });
         });
    } catch (error) {
        console.error('Proxy error:', error);

        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Proxy error' });
        }
    }
});
const serviceWorkerRegistrationScript = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js') // Ensure this path is correct and accessible from the client
      .then(registration => {
        console.log('Service Worker registered successfully with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
} else {
  console.log('Service workers are not supported in this browser.');
}
`;

// Serve index.html or placeholder based on API key and file availability
app.get('/', (req, res) => {
    const placeholderPath = path.join(publicPath, 'placeholder.html');

    // If API key is missing, always serve placeholder with a warning
    if (!apiKey) {
        console.log("LOG: Route '/' accessed. API_KEY missing. Serving placeholder with warning.");
        fs.readFile(placeholderPath, 'utf8', (err, placeholderHtml) => {
            if (err) {
                console.error(`ERROR: Could not read placeholder file at ${placeholderPath}:`, err);
                return res.status(500).send('Server error: Could not load placeholder page.');
            }
            const warningMessage = '<p style="color: red; font-weight: bold; text-align: center;">Warning: Gemini API_KEY is not configured as an environment variable. Your Gemini app is unavailable until you\'ve deployed your API key to the server.</p>';
            // Inject warning message before the closing </head> tag or append if not found
             let modifiedHtml;
             const messageDivEnd = '</h2>';
             if (placeholderHtml.includes(messageDivEnd)) {
                 modifiedHtml = placeholderHtml.replace(messageDivEnd, messageDivEnd + warningMessage);
             } else {
                 // Fallback: append if the target div isn't found
                 modifiedHtml = placeholderHtml + warningMessage;
             }
            res.send(modifiedHtml);
        });
        return; // Stop further processing
    }

    // API key is present, try to serve index.html
    console.log("LOG: Route '/' accessed. API_KEY found. Attempting to serve index.html.");
    const indexPath = path.join(staticPath, 'index.html');
    console.log(`LOG: Reading index.html from: ${indexPath}`);

    fs.readFile(indexPath, 'utf8', (err, indexHtmlData) => {
        if (err) {
            // index.html not found or unreadable, serve the original placeholder
            console.log('LOG: index.html not found or unreadable. Falling back to original placeholder.');
            return res.sendFile(placeholderPath);
        }

        // index.html found, inject service worker script
        console.log("LOG: index.html read successfully. Injecting service worker script.");
        let injectedHtml;
        if (indexHtmlData.includes('<head>')) {
            injectedHtml = indexHtmlData.replace(
                '<head>',
                `<head><script>${serviceWorkerRegistrationScript}</script>`
            );
            console.log("LOG: Service worker registration script injected after <head>.");
        } else {
            console.warn("WARNING: <head> tag not found in index.html. Prepending script to the beginning of the file as a fallback.");
            injectedHtml = `<script>${serviceWorkerRegistrationScript}</script>${indexHtmlData}`;
        }
        res.send(injectedHtml);
    });
});

app.get('/service-worker.js', (req, res) => {
   return res.sendFile(path.join(publicPath, 'service-worker.js'));
});

app.use('/public', express.static(publicPath));
app.use(express.static(staticPath));

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

