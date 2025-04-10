/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import '@tailwindcss/browser';

//Gemini 95 was fully vibe-coded by @ammaar and @olacombe, while we don't endorse code quality, we thought it was a fun demonstration of what's possible with the model when a Designer and PM jam.

// Type declarations for external libraries
// declare var html2canvas: any; // Removed as it's no longer used

// Add ambient module declaration for @google/genai
// Note: TypeScript will still show errors about "@google/genai" not being found
// This is expected and can be ignored since the module is available at runtime
// through the importmap defined in index.html
declare module '@google/genai' {
    export class GoogleGenerativeAI {
        constructor(apiKey: string);
        // Methods
        getGenerativeModel(options: { model: string }): any;
        // Models property
        models: {
            generateContent(options: any): Promise<any>;
            generateContentStream(options: any): AsyncIterable<any>;
        };
        // Chats property
        chats: {
            create(options: any): {
                sendMessageStream(options: any): AsyncIterable<any>;
            };
        };
    }
}

// Define the dosInstances object to fix type errors
const dosInstances: Record<string, { initialized: boolean }> = {};

// --- DOM Element References ---
const desktop = document.getElementById('desktop') as HTMLDivElement;
const windows = document.querySelectorAll('.window') as NodeListOf<HTMLDivElement>;
const icons = document.querySelectorAll('.icon') as NodeListOf<HTMLDivElement>; // This is a NodeList
const startMenu = document.getElementById('start-menu') as HTMLDivElement;
const startButton = document.getElementById('start-button') as HTMLButtonElement;
const taskbarAppsContainer = document.getElementById('taskbar-apps') as HTMLDivElement;
const paintAssistant = document.getElementById('paint-assistant') as HTMLDivElement;
const assistantBubble = paintAssistant?.querySelector('.assistant-bubble') as HTMLDivElement;

// --- State Variables ---
let activeWindow: HTMLDivElement | null = null;
let highestZIndex: number = 20; // Start z-index for active windows
const openApps = new Map<string, { windowEl: HTMLDivElement; taskbarButton: HTMLDivElement }>(); // Store open apps and their elements
let geminiInstance: any | null = null; // Store the initialized Gemini AI instance
let paintCritiqueIntervalId: number | null = null; // Timer for paint critiques

// Store ResizeObservers to disconnect them later
const paintResizeObserverMap = new Map<Element, ResizeObserver>();

// --- Minesweeper Game State Variables ---
let minesweeperTimerInterval: number | null = null;
let minesweeperTimeElapsed: number = 0;
let minesweeperFlagsPlaced: number = 0;
let minesweeperGameOver: boolean = false;
let minesweeperMineCount: number = 10; // Default for 9x9
let minesweeperGridSize: { rows: number, cols: number } = { rows: 9, cols: 9 }; // Default 9x9
let minesweeperFirstClick: boolean = true; // To ensure first click is never a mine

// --- Core Functions ---

/** Brings a window to the front and sets it as active */
function bringToFront(windowElement: HTMLDivElement): void {
    if (activeWindow === windowElement) return; // Already active

    // Deactivate previously active window/taskbar button
    if (activeWindow) {
        activeWindow.classList.remove('active');
        const appName = activeWindow.id;
        if (openApps.has(appName)) {
            openApps.get(appName)?.taskbarButton.classList.remove('active');
        }
    }

    // Activate the new window
    highestZIndex++;
    windowElement.style.zIndex = highestZIndex.toString();
    windowElement.classList.add('active'); // Ensure 'active' class is set for visibility if minimized
    activeWindow = windowElement;

    // Activate corresponding taskbar button
    const appNameRef = windowElement.id; // Use correct variable for app name
    if (openApps.has(appNameRef)) {
        openApps.get(appNameRef)?.taskbarButton.classList.add('active');
    }
     // Re-focus the DOSBox instance if it's a DOS app
     if ((appNameRef === 'doom' || appNameRef === 'wolf3d') && dosInstances[appNameRef]) {
        // JsDos might have a method to focus, or we might need to focus the container/canvas
        const container = document.getElementById(`${appNameRef}-container`);
        const canvas = container?.querySelector('canvas');
        canvas?.focus();
     }
}

/** Opens an application window */
async function openApp(appName: string): Promise<void> {
    const windowElement = document.getElementById(appName) as HTMLDivElement | null;
    if (!windowElement) {
        console.error(`Window element not found for app: ${appName}`);
        return;
    }

    // If app is already open, just bring it to front
    if (openApps.has(appName)) {
        bringToFront(windowElement);
        // Ensure window is visible (if it was minimized)
        windowElement.style.display = 'flex';
        windowElement.classList.add('active'); // Ensure active state is visually correct
        return;
    }

    // Make window visible and bring it to front
    windowElement.style.display = 'flex';
    windowElement.classList.add('active');
    bringToFront(windowElement); // Handles z-index and active state

    // Create and add taskbar button
    const taskbarButton = document.createElement('div');
    taskbarButton.classList.add('taskbar-app');
    taskbarButton.dataset.appName = appName;

    // Add icon based on appName
    let iconSrc = '';
    let title = appName; // Default title
    const iconElement = findIconElement(appName); // Use the helper function
    if (iconElement) {
        const img = iconElement.querySelector('img');
        const span = iconElement.querySelector('span');
        if(img) iconSrc = img.src;
        if(span) title = span.textContent || appName;
    } else { // Fallback for apps opened via start menu but maybe no desktop icon
         switch(appName) {
            // (Fallback logic remains the same)
            case 'myComputer': iconSrc = 'https://64.media.tumblr.com/fda654985437a7b2664e5833e086c69b/0b9b5160404412fb-f5/s540x810/43cf0d594a16ef9fb0449eb89883009e9276f8dd.png'; title = 'My Computer'; break;
            case 'internetExplorer': iconSrc = 'https://64.media.tumblr.com/78e5e1fb87d13924b0a4b410d131b930/c6cb2fd44af16922-23/s540x810/1afa8a3117c9b8643b207a66449e9a9f8317dd5e.png'; title = 'Internet Explorer'; break;
            case 'notepad': iconSrc = 'https://64.media.tumblr.com/6d0d5e90f5feb07a6ac5c7a1c6b4b6e1/a9242c5cebec16c3-73/s540x810/6c0ba179b6aa593891394d432cd4817784d5fdbe.png'; title = 'Notepad'; break;
            case 'paint': iconSrc = 'https://64.media.tumblr.com/4619a2969641630efd3be90122231635/6328ec072338dae7-17/s540x810/b4497bf01aed05b475419022e60708c01dab6f22.png'; title = 'Paint'; break;
            case 'doom': iconSrc = 'https://cdn.dos.zone/v2/icons/doom.png'; title = 'Doom II'; break;
            case 'gemini': iconSrc = 'https://static.vecteezy.com/system/resources/previews/024/118/176/original/google-gemini-icon-logo-symbol-free-png.png'; title = 'Gemini Chat'; break; // Add Gemini fallback
            case 'minesweeper': iconSrc = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Minesweeper_Icon.svg/768px-Minesweeper_Icon.svg.png'; title = 'Minesweeper'; break;
            case 'imageViewer': iconSrc = 'https://win98icons.alexmeub.com/icons/png/display_properties-4.png'; title = 'Image Viewer'; break;
         }
    }

    if (iconSrc) {
        const img = document.createElement('img');
        img.src = iconSrc;
        img.alt = title;
        taskbarButton.appendChild(img);
    }
    taskbarButton.appendChild(document.createTextNode(title));

    taskbarButton.addEventListener('click', () => {
        if (windowElement === activeWindow && windowElement.style.display !== 'none') {
             minimizeApp(appName);
        } else {
            windowElement.style.display = 'flex';
            bringToFront(windowElement);
        }
    });

    taskbarAppsContainer.appendChild(taskbarButton);
    openApps.set(appName, { windowEl: windowElement, taskbarButton: taskbarButton });
    taskbarButton.classList.add('active'); // Mark as active since it's newly opened

    // Initialize specific applications
    if (appName === 'chrome') {
        // Initialize AI browser
        initAiBrowser(windowElement);
    }
    else if (appName === 'notepad') {
        // Initialize notepad story generation
        initNotepadStory(windowElement);
    }
    else if (appName === 'paint') {
        // Initialize the new simple paint app
        initSimplePaintApp(windowElement);

        // Show Paint assistant and start critiques
        if (paintAssistant) paintAssistant.classList.add('visible');
        if (assistantBubble) assistantBubble.textContent = 'Warming up my judging circuits...'; // Initial message
        if (paintCritiqueIntervalId) clearInterval(paintCritiqueIntervalId);
        paintCritiqueIntervalId = window.setInterval(critiquePaintDrawing, 15000); // Check every 10 seconds
    }

    // Initialize DOSBox if needed
    if (appName === 'doom' && !dosInstances['doom']) {
        const doomContainer = document.getElementById('doom-content') as HTMLDivElement;
        if (doomContainer) {
            // Create and set iframe for Doom
            doomContainer.innerHTML = '<iframe src="https://js-dos.com/games/doom.exe.html" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>';
            console.log("Doom initialized via iframe");

            // Store a reference to know it's initialized
            dosInstances['doom'] = { initialized: true };
        }
    } else if (appName === 'gemini') {
        // Initialize Gemini Chat (async)
        await initGeminiChat(windowElement);
    }
    // >>> Call initMinesweeperGame <<< //
    else if (appName === 'minesweeper') {
        initMinesweeperGame(windowElement);
    }
    // >>> Call initMyComputer <<< //
    else if (appName === 'myComputer') {
        initMyComputer(windowElement);
    }
}

/** Closes an application window */
function closeApp(appName: string): void {
    const appData = openApps.get(appName);
    if (!appData) return;

    const { windowEl, taskbarButton } = appData;

    windowEl.style.display = 'none'; // Hide the window
    windowEl.classList.remove('active');
    taskbarButton.remove(); // Remove taskbar button
    openApps.delete(appName); // Remove from open apps map

    // Clean up DOS instance if applicable
    if (dosInstances[appName]) {
        console.log(`Cleaning up ${appName} instance (iframe approach)`);
        const container = document.getElementById(`${appName}-content`);
        if (container) container.innerHTML = ''; // Clear iframe
        delete dosInstances[appName];
    }

    // Stop Paint Critique if Paint is closed
    if (appName === 'paint') {
        if (paintCritiqueIntervalId) {
            clearInterval(paintCritiqueIntervalId);
            paintCritiqueIntervalId = null;
            if (paintAssistant) paintAssistant.classList.remove('visible');
            console.log("Stopped paint critique interval.");
        }
         // Disconnect ResizeObserver for Paint
         const paintContent = appData.windowEl.querySelector('.window-content') as HTMLDivElement | null;
         if (paintContent && paintResizeObserverMap.has(paintContent)) {
             paintResizeObserverMap.get(paintContent)?.disconnect();
             paintResizeObserverMap.delete(paintContent);
             console.log("Disconnected paint ResizeObserver.");
         }
    }

    // Stop Minesweeper Timer if Minesweeper is closed
    if (appName === 'minesweeper') {
        if (minesweeperTimerInterval) {
            clearInterval(minesweeperTimerInterval);
            minesweeperTimerInterval = null;
            console.log("Stopped Minesweeper timer.");
        }
    }

    // Activate the next highest window if the closed one was active
    if (activeWindow === windowEl) {
        activeWindow = null; // Clear current active window
        let nextAppToActivate: HTMLDivElement | null = null;
        let maxZ = -1; // Use -1 to ensure any window is higher
        openApps.forEach((data) => {
             // No need to check display style, bringToFront will handle visibility
             const z = parseInt(data.windowEl.style.zIndex || '0', 10);
             if (z > maxZ) {
                 maxZ = z;
                 nextAppToActivate = data.windowEl;
             }
        });
        if (nextAppToActivate) {
            bringToFront(nextAppToActivate);
        }
    }
}

/** Minimizes an application window */
function minimizeApp(appName: string): void {
    const appData = openApps.get(appName);
    if (!appData) return;

    const { windowEl, taskbarButton } = appData;

    windowEl.style.display = 'none'; // Hide the window
    windowEl.classList.remove('active');
    taskbarButton.classList.remove('active'); // Deactivate taskbar button

    if (activeWindow === windowEl) {
        activeWindow = null;
         // Activate the next highest window if minimizing the active one
         let nextAppToActivate: string | null = null;
         let maxZ = 0;
         openApps.forEach((data, name) => {
             // Only consider windows that are currently visible
             if (data.windowEl.style.display !== 'none') {
                 const z = parseInt(data.windowEl.style.zIndex || '0', 10);
                 if (z > maxZ) {
                     maxZ = z;
                     nextAppToActivate = name;
                 }
             }
         });
         if (nextAppToActivate) {
             bringToFront(openApps.get(nextAppToActivate)!.windowEl);
         }
    }
}

// --- Gemini Chat Specific Functions ---

/** Initializes the Gemini Chat application elements and API */
async function initGeminiChat(windowElement: HTMLDivElement): Promise<void> {
    const historyDiv = windowElement.querySelector('.gemini-chat-history') as HTMLDivElement;
    const inputEl = windowElement.querySelector('.gemini-chat-input') as HTMLInputElement;
    const sendButton = windowElement.querySelector('.gemini-chat-send') as HTMLButtonElement;

    if (!historyDiv || !inputEl || !sendButton) {
        console.error("Gemini chat elements not found in window:", windowElement.id);
        return;
    }

    function addChatMessage(container: HTMLDivElement, text: string, className: string = '') {
        const p = document.createElement('p');
        if (className) p.classList.add(className);
        p.textContent = text;
        container.appendChild(p);
        container.scrollTop = container.scrollHeight; // Scroll to bottom
    }

    addChatMessage(historyDiv, "Initializing AI...", "system-message");

    // --- Send Message Logic ---
    const sendMessage = async () => {
        // --- Initialize Gemini right before the first potential use (matching gifmaker) ---
        if (!geminiInstance) {
            const initSuccess = await initializeGeminiIfNeeded('initGeminiChat');
            if (!initSuccess) {
                console.error("Failed to initialize Gemini in initGeminiChat");
                addChatMessage(historyDiv, "Error: Failed to initialize AI. Check console for details.", "error-message");
                inputEl.disabled = false;
                sendButton.disabled = false;
                return;
            }
            
            const initMsg = Array.from(historyDiv.children).find(el => el.textContent?.includes("Initializing AI..."));
            if (initMsg) initMsg.remove();
            addChatMessage(historyDiv, "AI Ready.", "system-message");
        }

        const message = inputEl.value.trim();
        if (!message) return;

        addChatMessage(historyDiv, `You: ${message}`, "user-message");
        inputEl.value = '';
        inputEl.disabled = true;
        sendButton.disabled = true;

        try {
            const chat = geminiInstance.chats.create({
                model: 'gemini-1.5-flash',
                history: [],
            });
            const result = await chat.sendMessageStream({message: message});

            let fullResponse = "";
            addChatMessage(historyDiv, "Gemini: ", "gemini-message");
            const lastMessageElement = historyDiv.lastElementChild as HTMLParagraphElement | null;
            for await (const chunk of result) {
                 const chunkText = chunk.text || "";
                 fullResponse += chunkText;
                 if (lastMessageElement) {
                    lastMessageElement.textContent += chunkText;
                    historyDiv.scrollTop = historyDiv.scrollHeight;
                 }
            }
            console.log("Gemini full response:", fullResponse);
        } catch (error: any) {
             console.error("Error calling Gemini API:", error);
            addChatMessage(historyDiv, `Error: ${error.message || 'Failed to get response from Gemini.'}`, "error-message");
        } finally {
             inputEl.disabled = false;
            sendButton.disabled = false;
            inputEl.focus();
        }
    };

    // Event Listeners for sending message
    sendButton.onclick = sendMessage;
    inputEl.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Initial state - enable input/button after setup
    inputEl.disabled = false;
    sendButton.disabled = false;
    inputEl.focus();
}

/** Handles Notepad story generation */
async function initNotepadStory(windowElement: HTMLDivElement): Promise<void> {
    const textarea = windowElement.querySelector('.notepad-textarea') as HTMLTextAreaElement;
    const storyButton = windowElement.querySelector('.notepad-story-button') as HTMLButtonElement;

    if (!textarea || !storyButton) {
        console.error("Notepad elements not found in window:", windowElement.id);
        return;
    }

    storyButton.addEventListener('click', async () => {
        // Show "Generating story..." message
        const currentText = textarea.value;
        textarea.value = currentText + "\n\nGenerating story... Please wait...\n\n";
        textarea.scrollTop = textarea.scrollHeight;

        // Disable button while generating
        storyButton.disabled = true;
        storyButton.textContent = "Working...";

        try {
            // --- Initialize Gemini right before use if needed (matching gifmaker) ---
            if (!geminiInstance) {
                if (!await initializeGeminiIfNeeded('initNotepadStory')) {
                    throw new Error("Failed to initialize Gemini API for story generation");
                }
            }

            // Call the Gemini API to generate a story
            const prompt = "Write me a short creative story (250-300 words) with an unexpected twist ending. Make it engaging and suitable for all ages.";

            const result = await geminiInstance.models.generateContentStream({
                 model: 'gemini-1.5-flash',
                 contents: prompt,
             });

            // Replace the "Generating..." message with an empty string
            const textWithoutGenerating = currentText + "\n\n"; // Simpler replacement
            textarea.value = textWithoutGenerating;

            // Stream in the response
            for await (const chunk of result) {
                 const chunkText = chunk.text || "";
                 textarea.value += chunkText;
                 textarea.scrollTop = textarea.scrollHeight;
            }

            // Add a newline after the story
            textarea.value += "\n\n";

        } catch (error: any) {
                console.error("Error generating story:", error);
                textarea.value = currentText + "\n\nError: " + (error.message || "Failed to generate story.") + "\n\n";
        } finally {
            // Re-enable the button
            storyButton.disabled = false;
            storyButton.textContent = "Generate Story";
            textarea.scrollTop = textarea.scrollHeight;
        }
    });
}

/** Initializes the AI Browser functionality with image generation */
function initAiBrowser(windowElement: HTMLDivElement): void {
    const addressBar = windowElement.querySelector('.browser-address-bar') as HTMLInputElement;
    const goButton = windowElement.querySelector('.browser-go-button') as HTMLButtonElement;
    const iframe = windowElement.querySelector('#browser-frame') as HTMLIFrameElement;
    const loadingEl = windowElement.querySelector('.browser-loading') as HTMLDivElement;

    // Dial up sound
    const DIAL_UP_SOUND_URL = 'https://www.soundjay.com/communication/dial-up-modem-01.mp3'; // Replace with your actual audio file path/URL
    let dialUpAudio: HTMLAudioElement | null = null; // Declare audio element variable

    if (!addressBar || !goButton || !iframe || !loadingEl) {
        console.error("Browser elements not found");
        return;
    }

    // Function to handle URL navigation/generation
    async function navigateToUrl(url: string): Promise<void> {
        // Normalize URL format
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        try {
            // Parse the domain to use in the prompt
            const urlObj = new URL(url);
            const domain = urlObj.hostname;

            // Show loading screen
            loadingEl.innerHTML = `
                <style>
                    .dialup-animation .dot {
                        animation: dialup-blink 1.4s infinite both;
                    }
                    .dialup-animation .dot:nth-child(2) {
                        animation-delay: 0.2s;
                    }
                    .dialup-animation .dot:nth-child(3) {
                        animation-delay: 0.4s;
                    }
                    @keyframes dialup-blink {
                        0%, 80%, 100% { opacity: 0; }
                        40% { opacity: 1; }
                    }
                    .browser-loading p { margin: 5px 0; }
                    .browser-loading .small-text { font-size: 0.8em; color: #aaa; }
                </style>
                <img src="https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/000/948/341/datas/original.gif"/>
                <p>Connecting to ${domain}<span class="dialup-animation"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span></p>
                <!-- Sound will play via JS -->
            `;
            loadingEl.style.display = 'flex'; // Make it visible *after* setting content

            // Play dial-up sound
            try {
                if (!dialUpAudio) { // Create audio element if it doesn't exist
                    dialUpAudio = new Audio(DIAL_UP_SOUND_URL);
                    dialUpAudio.loop = true; // Loop the sound while connecting
                }
                await dialUpAudio.play(); // Play returns a promise, await it
                console.log("Playing dial-up sound");
            } catch (audioError) {
                console.error("Error playing dial-up sound:", audioError);
            }

            try {
                // Try to load or initialize Gemini
                if (!geminiInstance) {
                    if (!await initializeGeminiIfNeeded('initAiBrowser')) {
                        const errorMsg = "CRITICAL ERROR: Failed to initialize AI. Cannot generate website.";
                        alert(errorMsg);
                        iframe.src = 'data:text/plain;charset=utf-8,' + encodeURIComponent(errorMsg);
                        loadingEl.style.display = 'none';
                        return;
                    }
                }

                console.log("Generating 90s website for domain:", domain);

                // Create a comprehensive prompt for a 90s-style website with images
                const websitePrompt = `
                Create a complete 90s-style website for the domain "${domain}".

                You MUST include:
                1. One image MUST be in your response - it should be a relevant graphic for "A small graphic logo for a website like ${domain}"
                2. Generate HTML with garish 90s styling (neon colors, comic sans, tables for layout)
                3. Make the content related specifically to what "${domain}" would be about
                4. Include classic 90s web elements:
                   - Scrolling marquee text
                   - Retro emoji or ascii art
                   - Blinking elements
                   - "Best viewed in Chrome" badge
                   - Visitor counter (use 9000+)
                   - "Under Construction" signs

                Create a fun, humorous website that feels like it was made in 1996.
                The image MUST match the theme of the website.

                DO NOT use modern web design principles - embrace the chaos of 90s web!
                `;

                // Generate website with text and images using the specifically mentioned model
                const result = await geminiInstance.models.generateContent({
                    model: "gemini-2.0-flash-mmgen-rev17",
                    contents: [{ role: "user", parts: [{ text: websitePrompt }] }],
                    config: {
                        temperature: 0.9,
                        responseModalities: ["TEXT", "IMAGE"]
                    }
                });

                console.log("Response received from Gemini API");
                console.log("Full Gemini Response:", JSON.stringify(result, null, 2)); // Log the full response object

                // Process the response to extract text (HTML) and images
                let htmlContent = "";
                const images: string[] = [];

                // Extract HTML and images from the response
                if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
                    for (const part of result.candidates[0].content.parts) {
                        if (part.text) {
                            // Extract HTML content (remove any markdown format if present)
                            const textContent = part.text.replace(/```html|```/g, '').trim();
                            htmlContent += textContent;
                        }
                        else if (part.inlineData && part.inlineData.data) {
                            // Store image data as data URLs
                            images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
                            console.log("Image extracted successfully");
                        }
                    }
                }

                console.log(`Extracted HTML content and ${images.length} images`);

                // If we don't have HTML content, generate a basic framework
                if (!htmlContent.includes("<html")) {
                    // Generate base HTML structure if needed
                    const baseHTML = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${domain} - 90s Website</title>
                        <style>
                            body {
                                background-color: #FF00FF;
                                color: black;
                                font-family: "Comic Sans MS", "Times New Roman", serif;
                                margin: 10px;
                                padding: 0;
                            }
                            .container {
                                background-color: #00FFFF;
                                border: 5px ridge #FFFFFF;
                                padding: 10px;
                                margin: 10px auto;
                                max-width: 800px;
                            }
                            h1, h2 {
                                text-align: center;
                                color: blue;
                                text-shadow: 2px 2px yellow;
                            }
                            .blink {
                                animation: blinker 1s linear infinite;
                            }
                            @keyframes blinker {
                                50% { opacity: 0; }
                            }
                            img {
                                border: 3px ridge gray;
                                display: block;
                                margin: 10px auto;
                                max-width: 90%;
                            }
                            marquee {
                                background-color: yellow;
                                color: red;
                                font-weight: bold;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <marquee scrollamount="6" behavior="alternate">Welcome to ${domain}!</marquee>
                            <h1 class="blink">Welcome to ${domain}</h1>
                            <div id="content">${htmlContent}</div>
                        </div>
                    </body>
                    </html>
                    `;
                    htmlContent = baseHTML;
                }

                // Insert images into HTML - both methods
                if (images.length > 0) {
                    // Method 1: Replace placeholder image references in the HTML
                    if (images[0]) {
                        // Replace references to logo or first image
                        htmlContent = htmlContent.replace(/src=["']logo\.png["']/i, `src="${images[0]}"`);
                        htmlContent = htmlContent.replace(/src=["'][^"']*logo[^"']*\.(?:png|gif|jpe?g)["']/i, `src="${images[0]}"`);
                    }

                    if (images[1]) {
                        // Replace references to under construction image
                        htmlContent = htmlContent.replace(/src=["']under_construction\.gif["']/i, `src="${images[1]}"`);
                        htmlContent = htmlContent.replace(/src=["'][^"']*under[^"']*construction[^"']*\.(?:png|gif|jpe?g)["']/i, `src="${images[1]}"`);
                        // Replace any other misc image that might be the second image
                        htmlContent = htmlContent.replace(/src=["'](?!data:)[^"']*\.(?:png|gif|jpe?g)["']/i, `src="${images[1]}"`);
                    }

                    // Method 2: If no image tags were found or replaced, insert the images directly
                    if (!htmlContent.includes(images[0]) && !htmlContent.includes(images[1])) {
                        // Find appropriate places to insert the images
                        let updatedHTML = htmlContent;

                        // If we have at least one image, insert it after the first heading as a logo
                        if (images[0]) {
                            updatedHTML = updatedHTML.replace(
                                /(<h1[^>]*>.*?<\/h1>)/i,
                                `$1\n<div style="text-align:center;"><img src="${images[0]}" alt="Logo" style="max-width:80%;"></div>`
                            );
                        }

                        // If we have a second image, find a suitable place for the "Under Construction" graphic
                        if (images[1]) {
                            // Try to insert before the closing body tag or closing container div
                            if (updatedHTML.includes('</body>')) {
                                updatedHTML = updatedHTML.replace(
                                    '</body>',
                                    `<div style="text-align:center;"><img src="${images[1]}" alt="Under Construction" style="max-width:60%;"></div>\n</body>`
                                );
                            } else {
                                // Fallback insertion point
                                updatedHTML = updatedHTML.replace(
                                    '</div>',
                                    `<div style="text-align:center;"><img src="${images[1]}" alt="Under Construction" style="max-width:60%;"></div>\n</div>`
                                );
                            }
                        }

                        htmlContent = updatedHTML;
                    }
                }

                // Create a data URL from the HTML content
                const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);

                // Set the iframe source to our generated content
                iframe.src = dataUrl;

                // Update address bar to show the URL that was entered
                addressBar.value = url;

                console.log("Website generated and displayed successfully");

            } catch (error: any) {
                console.error("Error generating website:", error);
                alert(`Error: ${error.message || "Failed to generate website"}`);
            } finally {
                // Hide loading screen
                loadingEl.style.display = 'none';

                // Stop dial-up sound
                if (dialUpAudio) {
                    dialUpAudio.pause();
                    dialUpAudio.currentTime = 0; // Reset playback position
                    console.log("Stopped dial-up sound");
                }
            }

        } catch (e) {
            console.error("Invalid URL:", e);
            alert("Please enter a valid URL");
            loadingEl.style.display = 'none';
        }
    }
    // Event listeners for navigation
    goButton.addEventListener('click', () => {
        navigateToUrl(addressBar.value);
    });

    addressBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            navigateToUrl(addressBar.value);
        }
    });

    // Select all text when clicking the address bar
    addressBar.addEventListener('click', () => {
        addressBar.select();
    });
}
// --- Event Listeners Setup ---

// Desktop Icon Clicks -> Open App
icons.forEach(icon => {
    icon.addEventListener('click', () => { // Use single-click for icons
        const appName = icon.getAttribute('data-app');
        if (appName) {
            openApp(appName);
            startMenu.classList.remove('active'); // Close start menu if open
        }
    });
});

// Start Menu Item Clicks -> Open App
document.querySelectorAll('.start-menu-item').forEach(item => {
    item.addEventListener('click', () => {
        const appName = (item as HTMLElement).getAttribute('data-app');
        if (appName) {
            openApp(appName);
        }
        startMenu.classList.remove('active'); // Close start menu
    });
});

// Start Button Click -> Toggle Start Menu
startButton.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenu.classList.toggle('active');
    if (startMenu.classList.contains('active')) {
        highestZIndex++;
        startMenu.style.zIndex = highestZIndex.toString();
    }
});

// Window Interactions (Dragging, Closing, Minimizing, Activating)
windows.forEach(windowElement => {
    const titleBar = windowElement.querySelector('.window-titlebar') as HTMLDivElement | null;
    const closeButton = windowElement.querySelector('.window-close') as HTMLDivElement | null;
    const minimizeButton = windowElement.querySelector('.window-minimize') as HTMLDivElement | null;

    // --- Make Window Active on Click ---
    windowElement.addEventListener('mousedown', (e) => {
        bringToFront(windowElement);
    }, true); // Use capture phase

    // --- Window Controls ---
    if (closeButton) {
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent mousedown on window -> titlebar drag start
            closeApp(windowElement.id);
        });
    }
    if (minimizeButton) {
        minimizeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            minimizeApp(windowElement.id);
        });
    }

    // --- Window Dragging Logic ---
    if (titleBar) { // Only add drag listeners if titleBar exists
        let isDragging = false;
        let dragOffsetX: number, dragOffsetY: number;

        const startDragging = (e: MouseEvent) => {
            // Only drag if the mousedown was directly on the title bar (or its text span)
            // And NOT on a control button within the title bar
             if (!(e.target === titleBar || titleBar.contains(e.target as Node)) || (e.target as Element).closest('.window-control-button')) {
                 isDragging = false; // Ensure dragging doesn't start if clicking button
                 return;
            }

            isDragging = true;
            bringToFront(windowElement); // Ensure dragging window is on top
            const rect = windowElement.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            titleBar.style.cursor = 'grabbing';
            document.addEventListener('mousemove', dragWindow);
            document.addEventListener('mouseup', stopDragging, { once: true }); // Use once option for mouseup
        };

        const dragWindow = (e: MouseEvent) => {
            if (!isDragging) return;

            let x = e.clientX - dragOffsetX;
            let y = e.clientY - dragOffsetY;

            // Constrain window position to viewport
            const taskbarHeight = taskbarAppsContainer.parentElement?.offsetHeight ?? 36; // Get actual taskbar height
            const maxX = window.innerWidth - windowElement.offsetWidth;
            const maxY = window.innerHeight - windowElement.offsetHeight - taskbarHeight;

            const minY = 0;
            // Allow slight offscreen dragging to make title bar reachable
            const minX = -(windowElement.offsetWidth - 40);
            const maxXAdjusted = window.innerWidth - 40;

            x = Math.max(minX, Math.min(x, maxXAdjusted));
            y = Math.max(minY, Math.min(y, maxY));

            windowElement.style.left = `${x}px`;
            windowElement.style.top = `${y}px`;
        };

        const stopDragging = () => {
            if (!isDragging) return;
            isDragging = false;
            titleBar.style.cursor = 'grab';
            document.removeEventListener('mousemove', dragWindow);
            // No need to remove mouseup listener due to { once: true }
        };

        titleBar.addEventListener('mousedown', startDragging);
    } // end if(titleBar)

    // --- Initial Window Positioning ---
    const randomTop = Math.random() * (window.innerHeight / 4) + 20;
    const randomLeft = Math.random() * (window.innerWidth / 3) + 20;
    windowElement.style.top = `${randomTop}px`;
    windowElement.style.left = `${randomLeft}px`;
});

// Global Click Listener (e.g., to close Start Menu)
document.addEventListener('click', (e) => {
    if (startMenu.classList.contains('active') && !startMenu.contains(e.target as Node) && !startButton.contains(e.target as Node)) {
        startMenu.classList.remove('active');
    }
});

// --- Helper: Find Icon by App Name ---
function findIconElement(appName: string): HTMLDivElement | undefined {
    return Array.from(icons).find(icon => icon.dataset.app === appName);
}

// --- Initial Setup ---
console.log("Gemini 95 Simulator Initialized (TS)");

// Optional: Pre-open a window on load?
// openApp('myComputer');

// --- Paint Assistant Function ---

async function critiquePaintDrawing(): Promise<void> {
    const paintWindow = document.getElementById('paint') as HTMLDivElement | null;
    if (!paintWindow || paintWindow.style.display === 'none') {
        return; // Paint window not open or visible
    }

    // Get our own canvas element
    const canvas = paintWindow.querySelector('#paint-canvas') as HTMLCanvasElement | null;
    if (!canvas) {
        console.error("Paint canvas element not found.");
        if (assistantBubble) assistantBubble.textContent = 'Error: Cannot find the canvas!';
        return;
    }

    if (!geminiInstance) {
        // Attempt to initialize Gemini if not already done (same logic as before)
        if (!await initializeGeminiIfNeeded('critiquePaintDrawing')) {
            if (assistantBubble) assistantBubble.textContent = 'Error: AI initialization failed!';
            return; // Stop if AI cannot be initialized
        }
    }

    try {
        if (assistantBubble) assistantBubble.textContent = 'Analyzing masterpiece...';

        // Get image data directly from canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn("Could not get canvas context for critique.");
            if (assistantBubble) assistantBubble.textContent = 'Error: Cannot read canvas!';
            return;
        }

        // Convert canvas to base64 JPEG
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64Data = imageDataUrl.split(',')[1];

        if (!base64Data) {
            throw new Error("Failed to get base64 data from canvas.");
        }

        // Prepare the prompt and image data for Gemini
        const prompt = "Comment on the drawing you see and give your critique. Be a witty and slightly sarcastic artist. Keep your response to 1-2 sentences.";
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: "image/jpeg",
            },
        };

        // API Call
        const result = await geminiInstance.models.generateContent({
             model: "gemini-1.5-pro-latest",
             contents: [{ role: "user", parts: [ { text: prompt }, imagePart] }]
        });

        const critique = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Looks like... modern art? Or maybe my circuits are crossed.";
        if (assistantBubble) assistantBubble.textContent = critique;
        console.log("Paint Critique:", critique);

    } catch (error) {
        console.error("Error during paint critique:", error);
        if (assistantBubble) {
             let errorMessage = 'Unknown error';
             if (error instanceof Error) {
                 errorMessage = error.message;
             } else if (typeof error === 'string') {
                 errorMessage = error;
             } else {
                 try {
                     errorMessage = JSON.stringify(error);
                 } catch { /* ignore stringify errors */ }
             }
            assistantBubble.textContent = `Critique Error: ${errorMessage}`;
        }
    }
}

// --- Simple Paint App Logic --- //
function initSimplePaintApp(windowElement: HTMLDivElement): void {
    const canvas = windowElement.querySelector('#paint-canvas') as HTMLCanvasElement;
    const toolbar = windowElement.querySelector('.paint-toolbar') as HTMLDivElement;
    const contentArea = windowElement.querySelector('.window-content') as HTMLDivElement;
    const colorSwatches = windowElement.querySelectorAll('.paint-color-swatch') as NodeListOf<HTMLButtonElement>;
    const sizeButtons = windowElement.querySelectorAll('.paint-size-button') as NodeListOf<HTMLButtonElement>;
    const clearButton = windowElement.querySelector('.paint-clear-button') as HTMLButtonElement;

    if (!canvas || !toolbar || !contentArea || !clearButton) {
        console.error("Paint elements not found!");
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Could not get 2D context for paint canvas");
        return;
    }

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // Set initial context properties
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    let currentStrokeStyle = ctx.strokeStyle;
    let currentLineWidth = ctx.lineWidth;

    // Function to resize canvas and redraw background
    function resizeCanvas() {
        const rect = contentArea.getBoundingClientRect();
        const toolbarHeight = toolbar.offsetHeight;
        const newWidth = Math.floor(rect.width);
        const newHeight = Math.floor(rect.height - toolbarHeight - 2); // Adjust for borders/padding

        if (canvas.width === newWidth && canvas.height === newHeight) {
            return;
        }

        canvas.width = newWidth;
        canvas.height = newHeight;

        // Redraw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Re-apply context settings
        ctx.strokeStyle = currentStrokeStyle;
        ctx.lineWidth = currentLineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        console.log(`Canvas resized to ${canvas.width}x${canvas.height}`);
    }

    // Use ResizeObserver for robust resizing
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(contentArea);
    paintResizeObserverMap.set(contentArea, resizeObserver);

    resizeCanvas(); // Initial size setup

    // --- Drawing Event Listeners ---
    function startDrawing(e: MouseEvent | TouchEvent) {
        isDrawing = true;
        const pos = getMousePos(canvas, e);
        [lastX, lastY] = [pos.x, pos.y];
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
    }

    function draw(e: MouseEvent | TouchEvent) {
        if (!isDrawing) return;
        e.preventDefault(); // Prevent page scrolling on touch devices
        const pos = getMousePos(canvas, e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        [lastX, lastY] = [pos.x, pos.y];
    }

    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
    }

    // Helper to get mouse/touch position relative to canvas
    function getMousePos(canvasDom: HTMLCanvasElement, event: MouseEvent | TouchEvent): { x: number, y: number } {
        const rect = canvasDom.getBoundingClientRect();
        let clientX, clientY;
        if (event instanceof MouseEvent) {
            clientX = event.clientX;
            clientY = event.clientY;
        } else {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    // Attach drawing listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false }); // Need passive: false for preventDefault
    canvas.addEventListener('touchmove', draw, { passive: false }); // Need passive: false for preventDefault
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    // --- Toolbar Event Listeners ---
    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            ctx.strokeStyle = swatch.dataset.color || 'black';
            currentStrokeStyle = ctx.strokeStyle;
            colorSwatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');

            // If eraser (white) is selected, use wider line
            if (swatch.dataset.color === 'white') {
                const largeSizeButton = Array.from(sizeButtons).find(b => b.dataset.size === '10');
                if (largeSizeButton) {
                    ctx.lineWidth = parseInt(largeSizeButton.dataset.size || '10', 10);
                    currentLineWidth = ctx.lineWidth;
                    sizeButtons.forEach(s => s.classList.remove('active'));
                    largeSizeButton.classList.add('active');
                }
            } else {
                const activeSizeButton = Array.from(sizeButtons).find(b => b.classList.contains('active'));
                if (activeSizeButton) {
                    ctx.lineWidth = parseInt(activeSizeButton.dataset.size || '2', 10);
                    currentLineWidth = ctx.lineWidth;
                }
            }
        });
    });

    sizeButtons.forEach(button => {
        button.addEventListener('click', () => {
            ctx.lineWidth = parseInt(button.dataset.size || '2', 10);
            currentLineWidth = ctx.lineWidth;
            sizeButtons.forEach(s => s.classList.remove('active'));
            button.classList.add('active');

            // Ensure a color is active if switching size while not erasing
            const eraser = Array.from(colorSwatches).find(s => s.dataset.color === 'white');
            if (!eraser?.classList.contains('active')) {
                 if (!Array.from(colorSwatches).some(s => s.classList.contains('active'))) {
                    const blackSwatch = Array.from(colorSwatches).find(s => s.dataset.color === 'black');
                    blackSwatch?.classList.add('active');
                    ctx.strokeStyle = 'black';
                    currentStrokeStyle = ctx.strokeStyle;
                 }
            }
        });
    });

    clearButton.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    // Set initial active buttons
    (windowElement.querySelector('.paint-color-swatch[data-color="black"]') as HTMLButtonElement)?.classList.add('active');
    (windowElement.querySelector('.paint-size-button[data-size="2"]') as HTMLButtonElement)?.classList.add('active');

    console.log("Simple Paint App Initialized");
}

// >>> MINESWEEPER GAME LOGIC <<< //

// Type definition for a cell's state
type MinesweeperCell = {
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    adjacentMines: number;
    element: HTMLDivElement;
    row: number;
    col: number;
};

function initMinesweeperGame(windowElement: HTMLDivElement): void {
    console.log("Initializing Minesweeper...");
    const boardElement = windowElement.querySelector('#minesweeper-board') as HTMLDivElement;
    const flagCountElement = windowElement.querySelector('.minesweeper-flag-count') as HTMLDivElement;
    const timerElement = windowElement.querySelector('.minesweeper-timer') as HTMLDivElement;
    const resetButton = windowElement.querySelector('.minesweeper-reset-button') as HTMLButtonElement;
    // >>> Get Hint elements <<< //
    const hintButton = windowElement.querySelector('.minesweeper-hint-button') as HTMLButtonElement;
    const commentaryElement = windowElement.querySelector('.minesweeper-commentary') as HTMLDivElement;

    if (!boardElement || !flagCountElement || !timerElement || !resetButton || !hintButton || !commentaryElement) { // Add hint elements to check
        console.error("Minesweeper UI elements not found!");
        return;
    }

    let grid: MinesweeperCell[][] = [];

    function resetGame() {
        console.log("Resetting Minesweeper game.");
        // Reset state variables
        if (minesweeperTimerInterval) {
            clearInterval(minesweeperTimerInterval);
            minesweeperTimerInterval = null;
        }
        minesweeperTimeElapsed = 0;
        minesweeperFlagsPlaced = 0;
        minesweeperGameOver = false;
        minesweeperFirstClick = true;
        minesweeperMineCount = 10;
        minesweeperGridSize = { rows: 9, cols: 9 };

        // Update UI
        timerElement.textContent = `⏱️ 0`;
        flagCountElement.textContent = `🚩 ${minesweeperMineCount}`; // Show total mines initially
        resetButton.textContent = '🙂';

        // Create the grid
        createGrid();
    }

    function createGrid() {
        boardElement.innerHTML = ''; // Clear previous grid
        grid = []; // Reset internal grid state
        boardElement.style.gridTemplateColumns = `repeat(${minesweeperGridSize.cols}, 20px)`;
        boardElement.style.gridTemplateRows = `repeat(${minesweeperGridSize.rows}, 20px)`;

        for (let r = 0; r < minesweeperGridSize.rows; r++) {
            const row: MinesweeperCell[] = [];
            for (let c = 0; c < minesweeperGridSize.cols; c++) {
                const cellElement = document.createElement('div');
                cellElement.classList.add('minesweeper-cell');

                const cellData: MinesweeperCell = {
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    adjacentMines: 0,
                    element: cellElement,
                    row: r,
                    col: c,
                };

                cellElement.addEventListener('click', () => handleCellClick(cellData));
                cellElement.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    handleCellRightClick(cellData);
                });

                row.push(cellData);
                boardElement.appendChild(cellElement);
            }
            grid.push(row);
        }
        console.log(`Grid created (${minesweeperGridSize.rows}x${minesweeperGridSize.cols})`);

        // Mines will be placed on the first click
    }

    function placeMines(firstClickRow: number, firstClickCol: number) {
        console.log(`Placing ${minesweeperMineCount} mines, avoiding ${firstClickRow},${firstClickCol}`);
        let minesPlaced = 0;
        while (minesPlaced < minesweeperMineCount) {
            const r = Math.floor(Math.random() * minesweeperGridSize.rows);
            const c = Math.floor(Math.random() * minesweeperGridSize.cols);

            // Don't place a mine on the first clicked cell or if it already has a mine
            if ((r === firstClickRow && c === firstClickCol) || grid[r][c].isMine) {
                continue;
            }

            grid[r][c].isMine = true;
            minesPlaced++;
        }

        // Calculate adjacent mines for all cells
        for (let r = 0; r < minesweeperGridSize.rows; r++) {
            for (let c = 0; c < minesweeperGridSize.cols; c++) {
                if (!grid[r][c].isMine) {
                    grid[r][c].adjacentMines = countAdjacentMines(r, c);
                }
            }
        }
        console.log("Mines placed and adjacent counts calculated.");
    }

    function countAdjacentMines(row: number, col: number): number {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue; // Skip self
                const nr = row + dr;
                const nc = col + dc;

                if (
                    nr >= 0 && nr < minesweeperGridSize.rows &&
                    nc >= 0 && nc < minesweeperGridSize.cols &&
                    grid[nr][nc].isMine
                ) {
                    count++;
                }
            }
        }
        return count;
    }

    function handleCellClick(cell: MinesweeperCell) {
        if (minesweeperGameOver || cell.isRevealed || cell.isFlagged) {
            return;
        }

        // Start timer on first click
        if (minesweeperFirstClick && !minesweeperTimerInterval) {
             // Place mines *after* knowing the first click location
             placeMines(cell.row, cell.col);
             minesweeperFirstClick = false;
             startTimer();
        }

        if (cell.isMine) {
            gameOver(cell); // Pass the clicked mine
        } else {
            revealCell(cell);
            checkWinCondition(); // Check win after revealing
        }
    }

    function handleCellRightClick(cell: MinesweeperCell) {
        if (minesweeperGameOver || cell.isRevealed) {
            return;
        }

        if (!minesweeperFirstClick && !minesweeperTimerInterval) {
            // Prevent flagging before the game starts (timer starts)
            return;
        }

        cell.isFlagged = !cell.isFlagged;
        cell.element.textContent = cell.isFlagged ? '🚩' : '';

        // Update flag count display
        if (cell.isFlagged) {
            minesweeperFlagsPlaced++;
        } else {
            minesweeperFlagsPlaced--;
        }
        updateFlagCount();

        checkWinCondition(); // Check if flagging the last mine wins
    }

    function revealCell(cell: MinesweeperCell) {
        if (cell.isRevealed || cell.isFlagged || cell.isMine) {
            return; // Should not happen if called correctly, but safe check
        }

        cell.isRevealed = true;
        cell.element.classList.add('revealed');
        cell.element.textContent = ''; // Clear flag if it was mistakenly revealed

        if (cell.adjacentMines > 0) {
            cell.element.textContent = cell.adjacentMines.toString();
            cell.element.dataset.number = cell.adjacentMines.toString(); // For CSS coloring
        } else {
            // Flood fill for empty cells
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = cell.row + dr;
                    const nc = cell.col + dc;

                    if (
                        nr >= 0 && nr < minesweeperGridSize.rows &&
                        nc >= 0 && nc < minesweeperGridSize.cols
                    ) {
                        const neighbor = grid[nr][nc];
                        if (!neighbor.isRevealed && !neighbor.isFlagged) {
                            // Delay slightly to show cascade effect (optional)
                            // setTimeout(() => revealCell(neighbor), 10);
                            revealCell(neighbor); // Recursive call
                        }
                    }
                }
            }
        }
    }

    function startTimer() {
        if (minesweeperTimerInterval) return; // Already running
        minesweeperTimeElapsed = 0;
        timerElement.textContent = `⏱️ ${minesweeperTimeElapsed}`;
        minesweeperTimerInterval = window.setInterval(() => {
            minesweeperTimeElapsed++;
            timerElement.textContent = `⏱️ ${minesweeperTimeElapsed}`;
        }, 1000);
        console.log("Minesweeper timer started.");
    }

    function updateFlagCount() {
        const remainingFlags = minesweeperMineCount - minesweeperFlagsPlaced;
        flagCountElement.textContent = `🚩 ${remainingFlags}`;
    }

    function gameOver(clickedMine: MinesweeperCell) {
        console.log("Game Over!");
        minesweeperGameOver = true;
        if (minesweeperTimerInterval) {
            clearInterval(minesweeperTimerInterval);
            minesweeperTimerInterval = null;
        }
        resetButton.textContent = '😵';

        // Reveal all mines
        grid.forEach(row => {
            row.forEach(cell => {
                if (cell.isMine) {
                    cell.element.classList.add('mine');
                    cell.element.textContent = '💣';
                    if (cell !== clickedMine) { // Don't override the exploded one
                       cell.element.classList.add('revealed'); // Show the bomb
                    }
                }
                // Optionally show incorrectly placed flags
                if (!cell.isMine && cell.isFlagged) {
                    cell.element.textContent = '❌';
                }
            });
        });

        // Highlight the mine that was clicked
        clickedMine.element.classList.add('exploded');
        clickedMine.element.textContent = '💥';
    }

    function checkWinCondition() {
        if (minesweeperGameOver) return;

        let revealedCount = 0;
        let correctlyFlaggedMines = 0;

        for (let r = 0; r < minesweeperGridSize.rows; r++) {
            for (let c = 0; c < minesweeperGridSize.cols; c++) {
                const cell = grid[r][c];
                if (cell.isRevealed && !cell.isMine) {
                    revealedCount++;
                }
                if (cell.isFlagged && cell.isMine) {
                    correctlyFlaggedMines++;
                }
            }
        }

        const totalNonMineCells = (minesweeperGridSize.rows * minesweeperGridSize.cols) - minesweeperMineCount;
        const allNonMinesRevealed = revealedCount === totalNonMineCells;
        const allMinesFlagged = correctlyFlaggedMines === minesweeperMineCount && minesweeperFlagsPlaced === minesweeperMineCount;

        if (allNonMinesRevealed || allMinesFlagged) {
            console.log("Game Won!");
            minesweeperGameOver = true;
            if (minesweeperTimerInterval) {
                clearInterval(minesweeperTimerInterval);
                minesweeperTimerInterval = null;
            }
            resetButton.textContent = '😎';
            // Optionally auto-flag remaining mines if won by revealing
            if (allNonMinesRevealed) {
                 grid.forEach(row => row.forEach(cell => {
                     if (cell.isMine && !cell.isFlagged) {
                         cell.isFlagged = true;
                         cell.element.textContent = '🚩';
                         minesweeperFlagsPlaced++;
                     }
                 }));
                 updateFlagCount();
            }
        }
    }

    // >>> Function to get board state as text <<< //
    function getBoardStateAsText(): string {
        let boardString = "Current Minesweeper Board:\n";
        boardString += `Flags Remaining: ${minesweeperMineCount - minesweeperFlagsPlaced}\n`;
        boardString += `Time Elapsed: ${minesweeperTimeElapsed}s\n`;
        boardString += "Grid (H=Hidden, F=Flagged, B=Bomb, Number=Adjacent Mines):\n";
        for (let r = 0; r < minesweeperGridSize.rows; r++) {
            let rowStr = "";
            for (let c = 0; c < minesweeperGridSize.cols; c++) {
                const cell = grid[r][c];
                if (cell.isFlagged) {
                    rowStr += " F ";
                } else if (!cell.isRevealed) {
                    rowStr += " H ";
                } else if (cell.isMine) { // Should only show if game over, but include for context
                    rowStr += " B ";
                } else if (cell.adjacentMines > 0) {
                    rowStr += ` ${cell.adjacentMines} `;
                } else { // Revealed empty cell
                    rowStr += " _ ";
                }
            }
            boardString += rowStr + "\n";
        }
        return boardString;
    }

    // >>> Function to get AI Hint <<< //
    async function getAiHint() {
        if (minesweeperGameOver || minesweeperFirstClick) {
            commentaryElement.textContent = "Click a square first!";
            return;
        }

        hintButton.disabled = true;
        hintButton.textContent = '🤔';
        commentaryElement.textContent = 'Thinking...';

        // --- Initialize Gemini using the required pattern --- //
        if (!geminiInstance) {
            if (!await initializeGeminiIfNeeded('getAiHint')) {
                commentaryElement.textContent = 'AI Init Error: Could not connect to Gemini';
                hintButton.disabled = false;
                hintButton.textContent = '💡 Hint';
                return;
            }
        }
        // --- End Gemini Initialization ---

        try {
            const boardState = getBoardStateAsText();
            const prompt = `
You are a witty, slightly sarcastic Minesweeper expert playing along.
Based on the following Minesweeper board state, provide a short (1-2 sentence) hint or observation about a potentially safe move or a dangerous area. Don't give away exact mine locations unless it's logically certain from the revealed numbers. Format the hint as playful commentary.

${boardState}
Hint:`;

            // --- Call Gemini API using existing pattern --- //
            const result = await geminiInstance.models.generateContent({
                model: "gemini-1.5-flash", // Use a fast model
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: {
                    temperature: 0.7, // Allow for some creativity
                }
            });

            const hintText = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "My circuits are buzzing... maybe try clicking somewhere?";
            commentaryElement.textContent = hintText;
            console.log("Minesweeper Hint:", hintText);

        } catch (error) {
            console.error("Error getting Minesweeper hint:", error);
            let errorMessage = 'Unknown error';
             if (error instanceof Error) errorMessage = error.message;
             else try {errorMessage = JSON.stringify(error); } catch {} // Simple stringify
            commentaryElement.textContent = `Hint Error: ${errorMessage}`;
        } finally {
            hintButton.disabled = false;
            hintButton.textContent = '💡 Hint';
        }

    }

    // --- Event Listeners --- //
    resetButton.addEventListener('click', resetGame);
    hintButton.addEventListener('click', getAiHint); // <<< Add listener for hint button

    // Initial setup
    resetGame();
}

// >>> END MINESWEEPER GAME LOGIC <<< //

// >>> MY COMPUTER APP LOGIC <<< //
function initMyComputer(windowElement: HTMLDivElement): void {
    const cDriveIcon = windowElement.querySelector('#c-drive-icon') as HTMLDivElement;
    const cDriveContent = windowElement.querySelector('#c-drive-content') as HTMLDivElement;
    const secretImageIcon = windowElement.querySelector('#secret-image-icon') as HTMLDivElement;

    if (!cDriveIcon || !cDriveContent || !secretImageIcon) {
        console.error("My Computer elements not found!");
        return;
    }

    // --- C Drive Click Logic ---
    cDriveIcon.addEventListener('click', () => {
        cDriveIcon.style.display = 'none'; // Hide C: icon
        cDriveContent.style.display = 'block'; // Show secret file icon
        // Update window title (optional)
        // const titleSpan = windowElement.querySelector('.window-title') as HTMLSpanElement;
        // if (titleSpan) titleSpan.textContent = 'C:\\';
    });

    // --- Secret File Click Logic ---
    secretImageIcon.addEventListener('click', () => {
        const imageViewerWindow = document.getElementById('imageViewer') as HTMLDivElement | null;
        const imageViewerImg = document.getElementById('image-viewer-img') as HTMLImageElement | null;
        const imageViewerTitle = document.getElementById('image-viewer-title') as HTMLSpanElement | null;

        if (!imageViewerWindow || !imageViewerImg || !imageViewerTitle) {
            console.error("Image viewer elements not found!");
            alert("Image Viewer application files are corrupted!"); // User-friendly error
            return;
        }

        // Configure Image Viewer
        // Using a placeholder image as "http://myimage.png" is not a valid URL
        const imageUrl = 'https://storage.googleapis.com/gemini-95-icons/%40ammaar%2B%40olacombe.png'; // Placeholder: "Surprised Pikachu"
        imageViewerImg.src = imageUrl;
        imageViewerImg.alt = 'dontshowthistoanyone.jpg';
        imageViewerTitle.textContent = 'dontshowthistoanyone.jpg - Image Viewer';

        // Open the Image Viewer window using the existing openApp function
        // This handles bringing it to front, creating taskbar icon etc.
        openApp('imageViewer');
    });

    // Ensure initial state on open (show C drive, hide content)
    cDriveIcon.style.display = 'inline-flex';
    cDriveContent.style.display = 'none';
}

// >>> END MY COMPUTER APP LOGIC <<< //

// --- Shared Helper Functions ---

/**
 * Initializes the Gemini AI instance if not already done
 * @param context Name of the function/context requesting initialization (for logging)
 * @returns Promise that resolves when Gemini is initialized
 */
async function initializeGeminiIfNeeded(context: string): Promise<boolean> {
    if (geminiInstance) return true; // Already initialized
    
    try {
        console.log(`Attempting Gemini initialization within ${context}...`);
        const module = await import('@google/genai');
        // @ts-ignore - Module is available at runtime through import map
        const GoogleAIClass = module.GoogleGenAI;
        
        if (typeof GoogleAIClass !== 'function') {
            console.error("Module content:", module);
            throw new Error("GoogleGenAI constructor not found in module.");
        }
        
        // @ts-ignore - Vite replaces this during build
        const apiKey = process.env.API_KEY || "";
        if (!apiKey) {
            console.error(`API Key from process.env.API_KEY is empty/undefined in ${context}.`);
            alert("CRITICAL ERROR: Gemini API Key environment variable missing/empty.");
            throw new Error("API Key is missing from environment variables (process.env.API_KEY).");
        }
        
        geminiInstance = new GoogleAIClass({apiKey: apiKey});
        console.log(`Gemini initialized successfully within ${context}.`);
        return true;
    } catch (error) {
        console.error(`Failed Gemini initialization in ${context}:`, error);
        return false;
    }
}
