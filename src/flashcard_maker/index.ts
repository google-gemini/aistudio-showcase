import {GoogleGenAI} from '@google/genai';

interface Flashcard {
  term: string;
  definition: string;
}

const topicInput = document.getElementById('topicInput') as HTMLTextAreaElement;
const generateButton = document.getElementById(
  'generateButton',
) as HTMLButtonElement;
const flashcardsContainer = document.getElementById(
  'flashcardsContainer',
) as HTMLDivElement;
const errorMessage = document.getElementById('errorMessage') as HTMLDivElement;

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

generateButton.addEventListener('click', async () => {
  const topic = topicInput.value.trim();
  if (!topic) {
    errorMessage.textContent =
      'Please enter a topic or some terms and definitions.';
    flashcardsContainer.textContent = '';
    return;
  }

  errorMessage.textContent = 'Generating flashcards...';
  flashcardsContainer.textContent = '';
  generateButton.disabled = true; // Disable button during generation

  try {
    const prompt = `Generate a list of flashcards for the topic of "${topic}". Each flashcard should have a term and a concise definition. Format the output as a list of "Term: Definition" pairs, with each pair on a new line. Ensure terms and definitions are distinct and clearly separated by a single colon. Here's an example output:
    Hello: Hola
    Goodbye: Adiós`;
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
    });
    // Use optional chaining and nullish coalescing for safer access
    const responseText = result?.text ?? '';

    if (responseText) {
      const flashcards: Flashcard[] = responseText
        .split('\n')
        // Improved splitting and filtering
        .map((line) => {
          const parts = line.split(':');
          // Ensure there's a term and at least one part for definition
          if (parts.length >= 2 && parts[0].trim()) {
            const term = parts[0].trim();
            const definition = parts.slice(1).join(':').trim(); // Join remaining parts for definition
            if (definition) {
              return {term, definition};
            }
          }
          return null; // Return null for invalid lines
        })
        .filter((card): card is Flashcard => card !== null); // Filter out nulls and type guard

      if (flashcards.length > 0) {
        errorMessage.textContent = '';
        flashcards.forEach((flashcard, index) => {
          // Create card structure for flipping
          const cardDiv = document.createElement('div');
          cardDiv.classList.add('flashcard');
          cardDiv.dataset['index'] = index.toString();

          const cardInner = document.createElement('div');
          cardInner.classList.add('flashcard-inner');

          const cardFront = document.createElement('div');
          cardFront.classList.add('flashcard-front');

          const termDiv = document.createElement('div');
          termDiv.classList.add('term');
          termDiv.textContent = flashcard.term;

          const cardBack = document.createElement('div');
          cardBack.classList.add('flashcard-back');

          const definitionDiv = document.createElement('div');
          definitionDiv.classList.add('definition');
          definitionDiv.textContent = flashcard.definition;

          cardFront.appendChild(termDiv);
          cardBack.appendChild(definitionDiv);
          cardInner.appendChild(cardFront);
          cardInner.appendChild(cardBack);
          cardDiv.appendChild(cardInner);

          flashcardsContainer.appendChild(cardDiv);

          // Add click listener to toggle the 'flipped' class
          cardDiv.addEventListener('click', () => {
            cardDiv.classList.toggle('flipped');
          });
        });
      } else {
        errorMessage.textContent =
          'No valid flashcards could be generated from the response. Please check the format.';
      }
    } else {
      errorMessage.textContent =
        'Failed to generate flashcards or received an empty response. Please try again.';
    }
  } catch (error: unknown) {
    console.error('Error generating content:', error);
    const detailedError =
      (error as Error)?.message || 'An unknown error occurred';
    errorMessage.textContent = `An error occurred: ${detailedError}`;
    flashcardsContainer.textContent = ''; // Clear cards on error
  } finally {
    generateButton.disabled = false; // Re-enable button
  }
});
