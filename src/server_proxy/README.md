# AI Studio Applet Proxy Server

This nodejs proxy server lets you run your AI Studio Gemini application unmodified, without exposing your API key in the frontned code.  


## Instructions

**Prerequisites**:  
- Google Cloud SDK (gcloud) 
- Artifact registry repository and image tag for the container ${PROXY_IMAGE}
- Cloud Storage bucket with the compiled frontend code to be mounted from Cloud Run ${BUCKET_NAME}
- Gemini API Key ${API_KEY}

1. Build the container image:  `gcloud builds submit -t ${PROXY_IMAGE}`
2. Deploy the proxy server:   
```
gcloud run deploy appletproxy --image=${PROXY_IMAGE} --base-image=nodejs22 --update-env-vars=API_KEY=${API_KEY} \
--add-volume name=applet,type=cloud-storage,bucket=${BUCKET_NAME} \
--add-volume-mount volume=applet,mount-path=/app/dist
```



