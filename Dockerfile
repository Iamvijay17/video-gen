# Build stage
FROM node:20-alpine as build

# Install git (needed for some npm packages)
RUN apk add --no-cache git

WORKDIR /app

# Set environment variables for build
ENV CI=false
ENV NODE_ENV=production

# Copy all frontend files
COPY frontend/ ./

# Install dependencies (including devDependencies)
RUN npm ci --include=dev

# Build the app
RUN npx vite build

# Production stage
FROM nginx:alpine

# Copy built app from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
