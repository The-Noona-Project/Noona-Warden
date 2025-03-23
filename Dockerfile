# Dockerfile
FROM node:20-slim

# Set environment variables
ENV NODE_ENV=production
ENV PROJECT_NAME="The Noona Project"

# Create working directory
WORKDIR /noona/warden

# Copy package definition files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the project
COPY . .

# Use root, no user permissions needed
# Mount Docker socket from host
VOLUME ["/var/run/docker.sock"]

# Boot the application
CMD ["node", "initmain.mjs"]
