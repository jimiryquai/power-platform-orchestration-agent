FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    git \
    bash

# Install PowerShell and PAC CLI
RUN curl -L https://github.com/PowerShell/PowerShell/releases/download/v7.3.0/powershell-7.3.0-linux-musl-x64.tar.gz -o /tmp/powershell.tar.gz \
    && mkdir -p /opt/microsoft/powershell/7 \
    && tar zxf /tmp/powershell.tar.gz -C /opt/microsoft/powershell/7 \
    && chmod +x /opt/microsoft/powershell/7/pwsh \
    && ln -s /opt/microsoft/powershell/7/pwsh /usr/bin/pwsh \
    && rm /tmp/powershell.tar.gz

# Install PAC CLI via PowerShell
RUN pwsh -c "Install-Module -Name Microsoft.PowerApps.Administration.PowerShell -Force -Scope AllUsers" \
    && pwsh -c "Install-Module -Name Microsoft.PowerApps.PowerShell -Force -Scope AllUsers"

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/
COPY docker/ ./docker/

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S orchestrator -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R orchestrator:nodejs /app

# Switch to non-root user
USER orchestrator

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "src/index.js"]