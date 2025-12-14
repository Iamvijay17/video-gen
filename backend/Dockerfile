FROM node:20-slim

# Install Chromium for Remotion
RUN apt-get update && apt-get install -y \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD to true since we installed Chromium manually
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Set the executable path for Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./

RUN npm install

# Install dependencies for Remotion project
COPY src/remotion/package*.json ./src/remotion/
WORKDIR /app/src/remotion
RUN npm install
WORKDIR /app

COPY . .

EXPOSE 8000

CMD ["npm", "start"]
