// Generic API Client - Enterprise-grade HTTP client with retry logic and error handling
// Implements the ApiClient interface for all external API integrations

import {
  ApiClient,
  ApiRequest,
  ApiResponse
} from '../types/api-contracts';

// ============================================================================
// Configuration Types
// ============================================================================

export interface ApiClientConfig {
  readonly baseUrl?: string;
  readonly defaultHeaders?: Record<string, string>;
  readonly timeout?: number;
  readonly retryAttempts?: number;
  readonly retryDelay?: number;
  readonly enableLogging?: boolean;
}

export interface RequestOptions {
  readonly timeout?: number;
  readonly retryAttempts?: number;
  readonly retryDelay?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class TimeoutError extends ApiClientError {
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

export class RetryError extends ApiClientError {
  constructor(
    attempts: number,
    public readonly lastError: Error
  ) {
    super(`Request failed after ${attempts} attempts: ${lastError.message}`);
    this.name = 'RetryError';
  }
}

// ============================================================================
// Generic API Client Implementation
// ============================================================================

export class GenericApiClient implements ApiClient {
  private readonly config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '',
      defaultHeaders: config.defaultHeaders || {},
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      enableLogging: config.enableLogging ?? true
    };
  }

  // ============================================================================
  // Main Request Method
  // ============================================================================

  async request<TRequest, TResponse>(
    request: ApiRequest<TRequest>,
    options?: RequestOptions
  ): Promise<ApiResponse<TResponse>> {
    const mergedRequest = this.mergeRequestWithDefaults(request);
    const requestOptions = this.mergeOptions(options);

    return this.executeWithRetry(mergedRequest, requestOptions);
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  async get<TResponse>(
    url: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<TResponse>> {
    return this.request<void, TResponse>({
      method: 'GET',
      url,
      headers: headers || {}
    });
  }

  async post<TRequest, TResponse>(
    url: string,
    body: TRequest,
    headers?: Record<string, string>
  ): Promise<ApiResponse<TResponse>> {
    return this.request<TRequest, TResponse>({
      method: 'POST',
      url,
      headers: headers || {},
      body
    });
  }

  async patch<TRequest, TResponse>(
    url: string,
    body: TRequest,
    headers?: Record<string, string>
  ): Promise<ApiResponse<TResponse>> {
    return this.request<TRequest, TResponse>({
      method: 'PATCH',
      url,
      headers: headers || {},
      body
    });
  }

  async delete<TResponse>(
    url: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<TResponse>> {
    return this.request<void, TResponse>({
      method: 'DELETE',
      url,
      headers: headers || {}
    });
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  private mergeRequestWithDefaults<T>(request: ApiRequest<T>): ApiRequest<T> {
    const url = this.buildUrl(request.url);
    const headers = { 
      ...this.config.defaultHeaders, 
      ...request.headers 
    };

    // Set default Content-Type for requests with body
    if (request.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    return {
      ...request,
      url,
      headers,
      timeout: request.timeout || this.config.timeout
    };
  }

  private mergeOptions(options?: RequestOptions): Required<RequestOptions> {
    return {
      timeout: options?.timeout || this.config.timeout,
      retryAttempts: options?.retryAttempts || this.config.retryAttempts,
      retryDelay: options?.retryDelay || this.config.retryDelay
    };
  }

  private buildUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const baseUrl = this.config.baseUrl.endsWith('/') 
      ? this.config.baseUrl.slice(0, -1) 
      : this.config.baseUrl;
    const pathWithSlash = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${pathWithSlash}`;
  }

  private async executeWithRetry<TRequest, TResponse>(
    request: ApiRequest<TRequest>,
    options: Required<RequestOptions>
  ): Promise<ApiResponse<TResponse>> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= options.retryAttempts; attempt++) {
      try {
        this.logRequest(request, attempt);
        const response = await this.executeRequest<TRequest, TResponse>(request, options.timeout);
        this.logResponse(response);
        return response;
      } catch (error) {
        lastError = error as Error;
        this.logError(error, attempt, options.retryAttempts);

        if (attempt === options.retryAttempts) {
          throw new RetryError(options.retryAttempts, lastError);
        }

        if (!this.isRetryableError(error as Error)) {
          throw error;
        }

        // Wait before retrying
        await this.delay(options.retryDelay * attempt);
      }
    }

    throw new RetryError(options.retryAttempts, lastError);
  }

  private async executeRequest<TRequest, TResponse>(
    request: ApiRequest<TRequest>,
    timeout: number
  ): Promise<ApiResponse<TResponse>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const requestInit: RequestInit = {
        method: request.method,
        headers: request.headers,
        signal: controller.signal
      };

      if (request.body !== undefined) {
        requestInit.body = typeof request.body === 'string' 
          ? request.body 
          : JSON.stringify(request.body);
      }

      const response = await fetch(request.url, requestInit);
      clearTimeout(timeoutId);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData: TResponse;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        responseData = await response.json() as TResponse;
      } else {
        responseData = (await response.text()) as TResponse;
      }

      const apiResponse: ApiResponse<TResponse> = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        requestId: responseHeaders['x-request-id'] || this.generateRequestId()
      };

      if (!response.ok) {
        throw new ApiClientError(
          `Request failed with status ${response.status}: ${response.statusText}`,
          response.status,
          responseData,
          apiResponse.requestId
        );
      }

      return apiResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new TimeoutError(timeout);
      }

      throw error;
    }
  }

  private isRetryableError(error: Error): boolean {
    if (error instanceof TimeoutError) {
      return true;
    }

    if (error instanceof ApiClientError) {
      // Retry on server errors (5xx) and some client errors
      return error.statusCode ? error.statusCode >= 500 || error.statusCode === 429 : false;
    }

    // Retry on network errors
    return error.message.includes('fetch') || error.message.includes('network');
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // Logging Methods
  // ============================================================================

  private logRequest<T>(request: ApiRequest<T>, attempt: number): void {
    if (!this.config.enableLogging) return;

    const logData = {
      method: request.method,
      url: request.url,
      attempt,
      headers: this.sanitizeHeaders(request.headers)
    };

    console.log(`[API Client] Request: ${JSON.stringify(logData)}`);
  }

  private logResponse<T>(response: ApiResponse<T>): void {
    if (!this.config.enableLogging) return;

    const logData = {
      status: response.status,
      statusText: response.statusText,
      requestId: response.requestId,
      headers: this.sanitizeHeaders(response.headers)
    };

    console.log(`[API Client] Response: ${JSON.stringify(logData)}`);
  }

  private logError(error: unknown, attempt: number, maxAttempts: number): void {
    if (!this.config.enableLogging) return;

    const logData = {
      error: error instanceof Error ? error.message : String(error),
      attempt,
      maxAttempts,
      willRetry: attempt < maxAttempts
    };

    console.error(`[API Client] Error: ${JSON.stringify(logData)}`);
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];

    sensitiveHeaders.forEach(header => {
      const lowerHeader = Object.keys(sanitized).find(h => h.toLowerCase() === header);
      if (lowerHeader) {
        sanitized[lowerHeader] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createApiClient(config?: ApiClientConfig): ApiClient {
  return new GenericApiClient(config);
}

export function createDataverseApiClient(
  environmentUrl: string,
  accessToken: string
): ApiClient {
  return new GenericApiClient({
    baseUrl: `${environmentUrl}/api/data/v9.2`,
    defaultHeaders: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0'
    },
    timeout: 60000,
    retryAttempts: 3,
    retryDelay: 1000
  });
}

export function createAzureDevOpsApiClient(
  organization: string,
  pat: string
): ApiClient {
  const authToken = Buffer.from(`:${pat}`).toString('base64');
  
  return new GenericApiClient({
    baseUrl: `https://dev.azure.com/${organization}`,
    defaultHeaders: {
      'Authorization': `Basic ${authToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 60000,
    retryAttempts: 3,
    retryDelay: 1000
  });
}

export function createPowerPlatformAdminApiClient(
  accessToken: string
): ApiClient {
  return new GenericApiClient({
    baseUrl: 'https://api.powerplatform.com',
    defaultHeaders: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 60000,
    retryAttempts: 3,
    retryDelay: 1000
  });
}

export function createMicrosoftGraphApiClient(
  accessToken: string
): ApiClient {
  return new GenericApiClient({
    baseUrl: 'https://graph.microsoft.com/v1.0',
    defaultHeaders: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 60000,
    retryAttempts: 3,
    retryDelay: 1000
  });
}