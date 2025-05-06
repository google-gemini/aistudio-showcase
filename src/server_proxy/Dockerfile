
# Stage 1: install the server dependencies
FROM node:22 AS builder

WORKDIR /app/server

# Copy all files from the current directory
COPY . ./

# Install server dependencies
RUN npm install


# Stage 2: Build the final server image.  Built on scratch to leverage automatic base image updates for Cloud Run
FROM scratch

WORKDIR /app

#Copy server files
COPY --from=builder /app/server .

EXPOSE 3000

CMD ["node", "server.js"]



