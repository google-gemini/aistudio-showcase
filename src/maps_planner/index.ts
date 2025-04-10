import {FunctionDeclaration, GoogleGenAI, Type} from '@google/genai';

const {Map} = await google.maps.importLibrary('maps');
const {LatLngBounds} = await google.maps.importLibrary('core');
const {AdvancedMarkerElement} = await google.maps.importLibrary('marker');

// Application state variables
let map; // Holds the Google Map instance
let points = []; // Array to store geographical points from responses
let markers = []; // Array to store map markers
let lines = []; // Array to store polylines representing routes/connections
let popUps = []; // Array to store custom popups for locations
let bounds; // Google Maps LatLngBounds object to fit map around points
let activeCardIndex = 0; // Index of the currently selected location card
let isPlannerMode = false; // Flag to indicate if Day Planner mode is active
let dayPlanItinerary = []; // Array to hold structured items for the day plan timeline

// DOM Element references
const generateButton = document.querySelector('#generate');
const resetButton = document.querySelector('#reset');
const cardContainer = document.querySelector(
  '#card-container',
) as HTMLDivElement;
const carouselIndicators = document.querySelector(
  '#carousel-indicators',
) as HTMLDivElement;
const prevCardButton = document.querySelector(
  '#prev-card',
) as HTMLButtonElement;
const nextCardButton = document.querySelector(
  '#next-card',
) as HTMLButtonElement;
const cardCarousel = document.querySelector('.card-carousel') as HTMLDivElement;
const plannerModeToggle = document.querySelector(
  '#planner-mode-toggle',
) as HTMLInputElement;
const timelineContainer = document.querySelector(
  '#timeline-container',
) as HTMLDivElement;
const timeline = document.querySelector('#timeline') as HTMLDivElement;
const closeTimelineButton = document.querySelector(
  '#close-timeline',
) as HTMLButtonElement;
const exportPlanButton = document.querySelector(
  '#export-plan',
) as HTMLButtonElement;
const mapContainer = document.querySelector('#map-container');
const timelineToggle = document.querySelector('#timeline-toggle');
const mapOverlay = document.querySelector('#map-overlay');
const spinner = document.querySelector('#spinner');
const errorMessage = document.querySelector('#error-message');

// Initializes the Google Map instance and necessary libraries.
async function initMap() {
  bounds = new LatLngBounds();

  map = new Map(document.getElementById('map'), {
    center: {lat: -34.397, lng: 150.644}, // Default center
    zoom: 8, // Default zoom
    mapId: '4504f8b37365c3d0', // Custom map ID for styling
    gestureHandling: 'greedy', // Allows easy map interaction on all devices
    zoomControl: false,
    cameraControl: false,
    mapTypeControl: false,
    scaleControl: false,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: false,
  });

  // Define a custom Popup class extending Google Maps OverlayView.
  // This allows for custom HTML content near map markers.
  window.Popup = class Popup extends google.maps.OverlayView {
    position;
    containerDiv;
    constructor(position, content) {
      super();
      this.position = position;
      content.classList.add('popup-bubble');

      this.containerDiv = document.createElement('div');
      this.containerDiv.classList.add('popup-container');
      this.containerDiv.appendChild(content); // Append the actual content here
      // Prevent clicks inside the popup from propagating to the map.
      Popup.preventMapHitsAndGesturesFrom(this.containerDiv);
    }

    /** Called when the popup is added to the map via setMap(). */
    onAdd() {
      this.getPanes().floatPane.appendChild(this.containerDiv);
    }

    /** Called when the popup is removed from the map via setMap(null). */
    onRemove() {
      if (this.containerDiv.parentElement) {
        this.containerDiv.parentElement.removeChild(this.containerDiv);
      }
    }

    /** Called each frame when the popup needs to draw itself. */
    draw() {
      const divPosition = this.getProjection().fromLatLngToDivPixel(
        this.position,
      );
      // Hide the popup when it is far out of view for performance.
      const display =
        Math.abs(divPosition.x) < 4000 && Math.abs(divPosition.y) < 4000
          ? 'block'
          : 'none';

      if (display === 'block') {
        this.containerDiv.style.left = divPosition.x + 'px';
        this.containerDiv.style.top = divPosition.y + 'px';
      }

      if (this.containerDiv.style.display !== display) {
        this.containerDiv.style.display = display;
      }
    }
  };
}

// Initialize the map as soon as the script loads.
initMap();

// Function declaration for extracting location data using Google AI.
const locationFunctionDeclaration: FunctionDeclaration = {
  name: 'location',
  parameters: {
    type: Type.OBJECT,
    description: 'Geographic coordinates of a location.',
    properties: {
      name: {
        type: Type.STRING,
        description: 'Name of the location.',
      },
      description: {
        type: Type.STRING,
        description:
          'Description of the location: why is it relevant, details to know.',
      },
      lat: {
        type: Type.STRING,
        description: 'Latitude of the location.',
      },
      lng: {
        type: Type.STRING,
        description: 'Longitude of the location.',
      },
      // Properties specific to Day Planner mode
      time: {
        type: Type.STRING,
        description:
          'Time of day to visit this location (e.g., "09:00", "14:30").',
      },
      duration: {
        type: Type.STRING,
        description:
          'Suggested duration of stay at this location (e.g., "1 hour", "45 minutes").',
      },
      sequence: {
        type: Type.NUMBER,
        description: 'Order in the day itinerary (1 = first stop of the day).',
      },
    },
    required: ['name', 'description', 'lat', 'lng'],
  },
};

// Function declaration for extracting route/line data using Google AI.
const lineFunctionDeclaration: FunctionDeclaration = {
  name: 'line',
  parameters: {
    type: Type.OBJECT,
    description: 'Connection between a start location and an end location.',
    properties: {
      name: {
        type: Type.STRING,
        description: 'Name of the route or connection',
      },
      start: {
        type: Type.OBJECT,
        description: 'Start location of the route',
        properties: {
          lat: {
            type: Type.STRING,
            description: 'Latitude of the start location.',
          },
          lng: {
            type: Type.STRING,
            description: 'Longitude of the start location.',
          },
        },
      },
      end: {
        type: Type.OBJECT,
        description: 'End location of the route',
        properties: {
          lat: {
            type: Type.STRING,
            description: 'Latitude of the end location.',
          },
          lng: {
            type: Type.STRING,
            description: 'Longitude of the end location.',
          },
        },
      },
      // Properties specific to Day Planner mode
      transport: {
        type: Type.STRING,
        description:
          'Mode of transportation between locations (e.g., "walking", "driving", "public transit").',
      },
      travelTime: {
        type: Type.STRING,
        description:
          'Estimated travel time between locations (e.g., "15 minutes", "1 hour").',
      },
    },
    required: ['name', 'start', 'end'],
  },
};

// System instructions provided to the Google AI model guiding its responses.
const systemInstructions = `## System Instructions for an Interactive Map Explorer

**Model Persona:** You are a knowledgeable, geographically-aware assistant that provides visual information through maps.
Your primary goal is to answer any location-related query comprehensively, using map-based visualizations.
You can process information about virtually any place, real or fictional, past, present, or future.

**Core Capabilities:**

1. **Geographic Knowledge:** You possess extensive knowledge of:
   * Global locations, landmarks, and attractions
   * Historical sites and their significance
   * Natural wonders and geography
   * Cultural points of interest
   * Travel routes and transportation options

2. **Two Operation Modes:**

   **A. General Explorer Mode** (Default when DAY_PLANNER_MODE is false):
   * Respond to any query by identifying relevant geographic locations
   * Show multiple points of interest related to the query
   * Provide rich descriptions for each location
   * Connect related locations with appropriate paths
   * Focus on information delivery rather than scheduling

   **B. Day Planner Mode** (When DAY_PLANNER_MODE is true):
   * Create detailed day itineraries with:
     * A logical sequence of locations to visit throughout a day (typically 4-6 major stops)
     * Specific times and realistic durations for each location visit
     * Travel routes between locations with appropriate transportation methods
     * A balanced schedule considering travel time, meal breaks, and visit durations
     * Each location must include a 'time' (e.g., "09:00") and 'duration' property
     * Each location must include a 'sequence' number (1, 2, 3, etc.) to indicate order
     * Each line connecting locations should include 'transport' and 'travelTime' properties

**Output Format:**

1. **General Explorer Mode:**
   * Use the "location" function for each relevant point of interest with name, description, lat, lng
   * Use the "line" function to connect related locations if appropriate
   * Provide as many interesting locations as possible (4-8 is ideal)
   * Ensure each location has a meaningful description

2. **Day Planner Mode:**
   * Use the "location" function for each stop with required time, duration, and sequence properties
   * Use the "line" function to connect stops with transport and travelTime properties
   * Structure the day in a logical sequence with realistic timing
   * Include specific details about what to do at each location

**Important Guidelines:**
* For ANY query, always provide geographic data through the location function
* If unsure about a specific location, use your best judgment to provide coordinates
* Never reply with just questions or requests for clarification
* Always attempt to map the information visually, even for complex or abstract queries
* For day plans, create realistic schedules that start no earlier than 8:00am and end by 9:00pm

Remember: In default mode, respond to ANY query by finding relevant locations to display on the map, even if not explicitly about travel or geography. In day planner mode, create structured day itineraries.`;

// Initialize the Google AI client.
const ai = new GoogleGenAI({vertexai: false, apiKey: process.env.API_KEY});

// Functions to control the visibility of the timeline panel.
function showTimeline() {
  if (timelineContainer) {
    timelineContainer.style.display = 'block';

    // Delay adding 'visible' class for CSS transition effect.
    setTimeout(() => {
      timelineContainer.classList.add('visible');

      if (window.innerWidth > 768) {
        // Desktop view
        mapContainer.classList.add('map-container-shifted');
        adjustInterfaceForTimeline(true);
        window.dispatchEvent(new Event('resize')); // Force map redraw
      } else {
        // Mobile view
        mapOverlay.classList.add('visible');
      }
    }, 10);
  }
}

function hideTimeline() {
  if (timelineContainer) {
    timelineContainer.classList.remove('visible');
    mapContainer.classList.remove('map-container-shifted');
    mapOverlay.classList.remove('visible');
    adjustInterfaceForTimeline(false);

    // Wait for transition before setting display to none.
    setTimeout(() => {
      timelineContainer.style.display = 'none';
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }
}

// Adjusts map bounds when the timeline visibility changes.
function adjustInterfaceForTimeline(isTimelineVisible) {
  if (bounds && map) {
    setTimeout(() => {
      map.fitBounds(bounds);
    }, 350); // Delay to allow layout adjustments
  }
}

// Event Listeners for UI elements.
const promptInput = document.querySelector(
  '#prompt-input',
) as HTMLTextAreaElement;
promptInput.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code === 'Enter' && !e.shiftKey) {
    // Allow shift+enter for new lines
    const buttonEl = document.getElementById('generate') as HTMLButtonElement;
    buttonEl.classList.add('loading');
    e.preventDefault();
    e.stopPropagation();

    setTimeout(() => {
      sendText(promptInput.value);
      promptInput.value = '';
    }, 10); // Delay to show loading state
  }
});

generateButton.addEventListener('click', (e) => {
  const buttonEl = e.currentTarget as HTMLButtonElement;
  buttonEl.classList.add('loading');

  setTimeout(() => {
    sendText(promptInput.value);
  }, 10);
});

resetButton.addEventListener('click', (e) => {
  restart();
});

if (prevCardButton) {
  prevCardButton.addEventListener('click', () => {
    navigateCards(-1);
  });
}

if (nextCardButton) {
  nextCardButton.addEventListener('click', () => {
    navigateCards(1);
  });
}

if (plannerModeToggle) {
  plannerModeToggle.addEventListener('change', () => {
    isPlannerMode = plannerModeToggle.checked;
    promptInput.placeholder = isPlannerMode
      ? "Create a day plan in... (e.g. 'Plan a day exploring Central Park' or 'One day in Paris')"
      : 'Explore places, history, events, or ask about any location...';

    if (!isPlannerMode && timelineContainer) {
      hideTimeline();
    }
  });
}

if (closeTimelineButton) {
  closeTimelineButton.addEventListener('click', () => {
    hideTimeline();
  });
}

if (timelineToggle) {
  timelineToggle.addEventListener('click', () => {
    showTimeline();
  });
}

if (mapOverlay) {
  mapOverlay.addEventListener('click', () => {
    hideTimeline();
  });
}

if (exportPlanButton) {
  exportPlanButton.addEventListener('click', () => {
    exportDayPlan();
  });
}

// Resets the map and application state to initial conditions.
function restart() {
  points = [];
  bounds = new google.maps.LatLngBounds();
  dayPlanItinerary = [];

  markers.forEach((marker) => marker.setMap(null));
  markers = [];

  lines.forEach((line) => {
    line.poly.setMap(null);
    line.geodesicPoly.setMap(null);
  });
  lines = [];

  popUps.forEach((popup) => {
    popup.popup.setMap(null);
    if (popup.content && popup.content.remove) popup.content.remove();
  });
  popUps = [];

  if (cardContainer) cardContainer.innerHTML = '';
  if (carouselIndicators) carouselIndicators.innerHTML = '';
  if (cardCarousel) cardCarousel.style.display = 'none';
  if (timeline) timeline.innerHTML = '';
  if (timelineContainer) hideTimeline();
}

// Sends the user's prompt to the Google AI and processes the response.
async function sendText(prompt: string) {
  spinner.classList.remove('hidden');
  errorMessage.innerHTML = '';
  restart();
  const buttonEl = document.getElementById('generate') as HTMLButtonElement;

  try {
    let finalPrompt = prompt;
    if (isPlannerMode) {
      finalPrompt = prompt + ' day trip';
    }

    const updatedInstructions = isPlannerMode
      ? systemInstructions.replace('DAY_PLANNER_MODE', 'true')
      : systemInstructions.replace('DAY_PLANNER_MODE', 'false');

    const response = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash-exp',
      contents: finalPrompt,
      config: {
        systemInstruction: updatedInstructions,
        temperature: 1,
        tools: [
          {
            functionDeclarations: [
              locationFunctionDeclaration,
              lineFunctionDeclaration,
            ],
          },
        ],
      },
    });

    let text = '';
    let results = false;
    for await (const chunk of response) {
      const fns = chunk.functionCalls ?? [];
      for (const fn of fns) {
        if (fn.name === 'location') {
          setPin(fn.args);
          results = true;
        }
        if (fn.name === 'line') {
          setLeg(fn.args);
          results = true;
        }
      }

      if (
        chunk.candidates &&
        chunk.candidates.length > 0 &&
        chunk.candidates[0].content &&
        chunk.candidates[0].content.parts
      ) {
        chunk.candidates[0].content.parts.forEach((part) => {
          if (part.text) text += part.text;
        });
      } else if (chunk.text) {
        text += chunk.text;
      }
    }

    if (!results) {
      throw new Error(
        'Could not generate any results. Try again, or try a different prompt.',
      );
    }

    if (isPlannerMode && dayPlanItinerary.length > 0) {
      dayPlanItinerary.sort(
        (a, b) =>
          (a.sequence || Infinity) - (b.sequence || Infinity) ||
          (a.time || '').localeCompare(b.time || ''),
      );
      createTimeline();
      showTimeline();
    }

    createLocationCards();
  } catch (e) {
    errorMessage.innerHTML = e.message;
    console.error('Error generating content:', e);
  } finally {
    buttonEl.classList.remove('loading');
  }
  spinner.classList.add('hidden');
}

// Adds a pin (marker and popup) to the map for a given location.
async function setPin(args) {
  const point = {lat: Number(args.lat), lng: Number(args.lng)};
  points.push(point);
  bounds.extend(point);

  const marker = new AdvancedMarkerElement({
    map,
    position: point,
    title: args.name,
  });
  markers.push(marker);
  map.panTo(point);
  map.fitBounds(bounds);

  const content = document.createElement('div');
  let timeInfo = '';
  if (args.time) {
    timeInfo = `<div style="margin-top: 4px; font-size: 12px; color: #2196F3;">
                  <i class="fas fa-clock"></i> ${args.time}
                  ${args.duration ? ` • ${args.duration}` : ''}
                </div>`;
  }
  content.innerHTML = `<b>${args.name}</b><br/>${args.description}${timeInfo}`;

  const popup = new window.Popup(new google.maps.LatLng(point), content);

  if (!isPlannerMode) {
    popup.setMap(map);
  }

  const locationInfo = {
    name: args.name,
    description: args.description,
    position: new google.maps.LatLng(point),
    popup,
    content,
    time: args.time,
    duration: args.duration,
    sequence: args.sequence,
  };

  popUps.push(locationInfo);

  if (isPlannerMode && args.time) {
    dayPlanItinerary.push(locationInfo);
  }
}

// Adds a line (route) between two locations on the map.
async function setLeg(args) {
  const start = {
    lat: Number(args.start.lat),
    lng: Number(args.start.lng),
  };
  const end = {lat: Number(args.end.lat), lng: Number(args.end.lng)};
  points.push(start);
  points.push(end);
  bounds.extend(start);
  bounds.extend(end);
  map.fitBounds(bounds);

  const polyOptions = {
    strokeOpacity: 0.0, // Invisible base line
    strokeWeight: 3,
    map,
  };

  const geodesicPolyOptions = {
    strokeColor: isPlannerMode ? '#2196F3' : '#CC0099',
    strokeOpacity: 1.0,
    strokeWeight: isPlannerMode ? 4 : 3,
    map,
  };

  if (isPlannerMode) {
    geodesicPolyOptions['icons'] = [
      {
        icon: {path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3},
        offset: '0',
        repeat: '15px',
      },
    ];
  }

  const poly = new google.maps.Polyline(polyOptions);
  const geodesicPoly = new google.maps.Polyline(geodesicPolyOptions);

  const path = [start, end];
  poly.setPath(path);
  geodesicPoly.setPath(path);

  lines.push({
    poly,
    geodesicPoly,
    name: args.name,
    transport: args.transport,
    travelTime: args.travelTime,
  });
}

// Creates and populates the timeline view for the day plan.
function createTimeline() {
  if (!timeline || dayPlanItinerary.length === 0) return;
  timeline.innerHTML = '';

  dayPlanItinerary.forEach((item, index) => {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item';
    const timeDisplay = item.time || 'Flexible';

    timelineItem.innerHTML = `
      <div class="timeline-time">${timeDisplay}</div>
      <div class="timeline-connector">
        <div class="timeline-dot"></div>
        <div class="timeline-line"></div>
      </div>
      <div class="timeline-content" data-index="${index}">
        <div class="timeline-title">${item.name}</div>
        <div class="timeline-description">${item.description}</div>
        ${item.duration ? `<div class="timeline-duration">${item.duration}</div>` : ''}
      </div>
    `;

    const timelineContent = timelineItem.querySelector('.timeline-content');
    if (timelineContent) {
      timelineContent.addEventListener('click', () => {
        const popupIndex = popUps.findIndex((p) => p.name === item.name);
        if (popupIndex !== -1) {
          highlightCard(popupIndex);
          map.panTo(popUps[popupIndex].position);
        }
      });
    }
    timeline.appendChild(timelineItem);
  });

  if (lines.length > 0 && isPlannerMode) {
    const timelineItems = timeline.querySelectorAll('.timeline-item');
    for (let i = 0; i < timelineItems.length - 1; i++) {
      const currentItem = dayPlanItinerary[i];
      const nextItem = dayPlanItinerary[i + 1];
      const connectingLine = lines.find(
        (line) =>
          line.name.includes(currentItem.name) ||
          line.name.includes(nextItem.name),
      );

      if (
        connectingLine &&
        (connectingLine.transport || connectingLine.travelTime)
      ) {
        const transportItem = document.createElement('div');
        transportItem.className = 'timeline-item transport-item';
        transportItem.innerHTML = `
          <div class="timeline-time"></div>
          <div class="timeline-connector">
            <div class="timeline-dot" style="background-color: #999;"></div>
            <div class="timeline-line"></div>
          </div>
          <div class="timeline-content transport">
            <div class="timeline-title">
              <i class="fas fa-${getTransportIcon(connectingLine.transport || 'travel')}"></i>
              ${connectingLine.transport || 'Travel'}
            </div>
            <div class="timeline-description">${connectingLine.name}</div>
            ${connectingLine.travelTime ? `<div class="timeline-duration">${connectingLine.travelTime}</div>` : ''}
          </div>
        `;
        timelineItems[i].after(transportItem);
      }
    }
  }
}

// Returns an appropriate Font Awesome icon class based on transport type.
function getTransportIcon(transportType: string): string {
  const type = (transportType || '').toLowerCase();
  if (type.includes('walk')) {
    return 'walking';
  }
  if (type.includes('car') || type.includes('driv')) {
    return 'car-side';
  }
  if (
    type.includes('bus') ||
    type.includes('transit') ||
    type.includes('public')
  ) {
    return 'bus-alt';
  }
  if (
    type.includes('train') ||
    type.includes('subway') ||
    type.includes('metro')
  ) {
    return 'train';
  }
  if (type.includes('bike') || type.includes('cycl')) {
    return 'bicycle';
  }
  if (type.includes('taxi') || type.includes('cab')) {
    return 'taxi';
  }
  if (type.includes('boat') || type.includes('ferry')) {
    return 'ship';
  }
  if (type.includes('plane') || type.includes('fly')) {
    return 'plane-departure';
  }
  {
    return 'route';
  } // Default icon
}

// Generates a placeholder SVG image for location cards.
function getPlaceholderImage(locationName: string): string {
  let hash = 0;
  for (let i = 0; i < locationName.length; i++) {
    hash = locationName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  const saturation = 60 + (hash % 30);
  const lightness = 50 + (hash % 20);
  const letter = locationName.charAt(0).toUpperCase() || '?';

  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180">
      <rect width="300" height="180" fill="hsl(${hue}, ${saturation}%, ${lightness}%)" />
      <text x="150" y="95" font-family="Arial, sans-serif" font-size="72" fill="white" text-anchor="middle" dominant-baseline="middle">${letter}</text>
    </svg>
  `)}`;
}

// Creates and displays location cards in the carousel.
function createLocationCards() {
  if (!cardContainer || !carouselIndicators || popUps.length === 0) return;
  cardContainer.innerHTML = '';
  carouselIndicators.innerHTML = '';
  cardCarousel.style.display = 'block';

  popUps.forEach((location, index) => {
    const card = document.createElement('div');
    card.className = 'location-card';
    if (isPlannerMode) card.classList.add('day-planner-card');
    if (index === 0) card.classList.add('card-active');

    const imageUrl = getPlaceholderImage(location.name);
    let cardContent = `<div class="card-image" style="background-image: url('${imageUrl}')"></div>`;

    if (isPlannerMode) {
      if (location.sequence) {
        cardContent += `<div class="card-sequence-badge">${location.sequence}</div>`;
      }
      if (location.time) {
        cardContent += `<div class="card-time-badge">${location.time}</div>`;
      }
    }

    cardContent += `
      <div class="card-content">
        <h3 class="card-title">${location.name}</h3>
        <p class="card-description">${location.description}</p>
        ${isPlannerMode && location.duration ? `<div class="card-duration">${location.duration}</div>` : ''}
        <div class="card-coordinates">
          ${location.position.lat().toFixed(5)}, ${location.position.lng().toFixed(5)}
        </div>
      </div>
    `;
    card.innerHTML = cardContent;

    card.addEventListener('click', () => {
      highlightCard(index);
      map.panTo(location.position);
      if (isPlannerMode && timeline) highlightTimelineItem(index);
    });

    cardContainer.appendChild(card);

    const dot = document.createElement('div');
    dot.className = 'carousel-dot';
    if (index === 0) dot.classList.add('active');
    carouselIndicators.appendChild(dot);
  });

  if (cardCarousel && popUps.length > 0) {
    cardCarousel.style.display = 'block';
  }
}

// Highlights the selected card and corresponding elements.
function highlightCard(index: number) {
  activeCardIndex = index;
  const cards = cardContainer?.querySelectorAll('.location-card');
  if (!cards) return;

  cards.forEach((card) => card.classList.remove('card-active'));
  if (cards[index]) {
    cards[index].classList.add('card-active');
    const cardWidth = cards[index].offsetWidth;
    const containerWidth = cardContainer.offsetWidth;
    const scrollPosition =
      cards[index].offsetLeft - containerWidth / 2 + cardWidth / 2;
    cardContainer.scrollTo({left: scrollPosition, behavior: 'smooth'});
  }

  const dots = carouselIndicators?.querySelectorAll('.carousel-dot');
  if (dots) {
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
  }

  popUps.forEach((popup, i) => {
    popup.popup.setMap(isPlannerMode ? (i === index ? map : null) : map);
    if (popup.content) {
      popup.content.classList.toggle('popup-active', i === index);
    }
  });

  if (isPlannerMode) highlightTimelineItem(index);
}

// Highlights the timeline item corresponding to the selected card.
function highlightTimelineItem(cardIndex: number) {
  if (!timeline) return;
  const timelineItems = timeline.querySelectorAll(
    '.timeline-content:not(.transport)',
  );
  timelineItems.forEach((item) => item.classList.remove('active'));

  const location = popUps[cardIndex];
  for (const item of timelineItems) {
    const title = item.querySelector('.timeline-title');
    if (title && title.textContent === location.name) {
      item.classList.add('active');
      item.scrollIntoView({behavior: 'smooth', block: 'nearest'});
      break;
    }
  }
}

// Allows navigation through cards using arrow buttons.
function navigateCards(direction: number) {
  const newIndex = activeCardIndex + direction;
  if (newIndex >= 0 && newIndex < popUps.length) {
    highlightCard(newIndex);
    map.panTo(popUps[newIndex].position);
  }
}

// Exports the current day plan as a simple text file.
function exportDayPlan() {
  if (!dayPlanItinerary.length) return;
  let content = '# Your Day Plan\n\n';

  dayPlanItinerary.forEach((item, index) => {
    content += `## ${index + 1}. ${item.name}\n`;
    content += `Time: ${item.time || 'Flexible'}\n`;
    if (item.duration) content += `Duration: ${item.duration}\n`;
    content += `\n${item.description}\n\n`;

    if (index < dayPlanItinerary.length - 1) {
      const nextItem = dayPlanItinerary[index + 1];
      const connectingLine = lines.find(
        (line) =>
          line.name.includes(item.name) || line.name.includes(nextItem.name),
      );
      if (connectingLine) {
        content += `### Travel to ${nextItem.name}\n`;
        content += `Method: ${connectingLine.transport || 'Not specified'}\n`;
        if (connectingLine.travelTime) {
          content += `Time: ${connectingLine.travelTime}\n`;
        }
        content += `\n`;
      }
    }
  });

  const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'day-plan.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
