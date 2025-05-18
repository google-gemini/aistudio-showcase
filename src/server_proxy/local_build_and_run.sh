#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <host_directory_to_mount>"
  exit 1
fi

HOST_DIR=$1

docker build -t gcr.io/jmahood-demo/appletserver:latest .
docker run -it -p 3000:3000 -v "$HOST_DIR":/app/dist -v "$(pwd)/server":/app -e GEMINI_API_KEY=$GEMINI_API_KEY gcr.io/jmahood-demo/appletserver:latest npm run dev
