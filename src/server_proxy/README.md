# AI Studio Gemini App Proxy Server

This nodejs proxy server lets you run your AI Studio Gemini application unmodified, without exposing your API key in the frontend code.  


## Instructions

**Prerequisites**:  
- Google Cloud SDK (gcloud)
- (Optional) Gemini API Key 

1. Copy all the files of your AI Studio app into this directory at the root level.
2. If your app calls the Gemini API, create a Secret for your API key:
     ```
     echo -n "${GEMINI_API_KEY}" | gcloud secrets create gemini_api_key
     --data-file=-
     ``` 

3.  Deploy to Cloud Run (optionally including API key):
    ```
    gcloud run deploy my-app --source=. --base-image=nodejs22 --update-secrets=GEMINI_API_KEY=gemini_api_key:latest
    ```


