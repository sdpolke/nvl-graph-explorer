# Backend Proxy - Requirements Document

## Introduction

This feature adds a minimal backend proxy server to secure database and API credentials. Currently, the application exposes Neo4j and OpenAI credentials directly in the browser, which poses a security risk. The proxy will act as a secure intermediary that holds credentials server-side while maintaining the simplicity of the current architecture.

## Glossary

- **Proxy Server**: A lightweight backend service that forwards requests between the frontend and external services (Neo4j, OpenAI)
- **Frontend Client**: The React/Vite application running in the browser
- **Neo4j Database**: The graph database containing biomedical knowledge
- **OpenAI API**: The external API service for natural language to Cypher conversion
- **Credential**: Sensitive authentication information (passwords, API keys, connection strings)

## Requirements

### Requirement 1: Secure Credential Management

**User Story:** As a developer, I want database and API credentials stored securely on the server, so that they are never exposed to the browser or client-side code.

#### Acceptance Criteria

1. WHEN the Proxy Server starts, THE Proxy Server SHALL load Neo4j credentials from server-side environment variables
2. WHEN the Proxy Server starts, THE Proxy Server SHALL load OpenAI API key from server-side environment variables
3. THE Frontend Client SHALL NOT have access to raw database credentials or API keys
4. THE Proxy Server SHALL validate that all required credentials are present before accepting requests
5. WHEN credentials are missing, THE Proxy Server SHALL return a clear error message indicating which credentials are not configured

### Requirement 2: Neo4j Query Proxying

**User Story:** As a frontend developer, I want to execute Neo4j queries through the proxy, so that the application maintains its current functionality without exposing credentials.

#### Acceptance Criteria

1. WHEN the Frontend Client sends a Cypher query request, THE Proxy Server SHALL forward the query to Neo4j Database
2. WHEN Neo4j Database returns results, THE Proxy Server SHALL forward the results to the Frontend Client
3. THE Proxy Server SHALL preserve all query parameters and options from the original request
4. WHEN a Neo4j query fails, THE Proxy Server SHALL return the error details to the Frontend Client
5. THE Proxy Server SHALL support connection pooling to Neo4j Database with configurable pool size
6. WHEN a query exceeds the timeout threshold, THE Proxy Server SHALL terminate the query and return a timeout error

### Requirement 3: OpenAI API Proxying

**User Story:** As a user, I want to use natural language search through the proxy, so that my OpenAI API key remains secure on the server.

#### Acceptance Criteria

1. WHEN the Frontend Client sends a natural language query request, THE Proxy Server SHALL forward the request to OpenAI API
2. WHEN OpenAI API returns a Cypher query, THE Proxy Server SHALL forward the response to the Frontend Client
3. THE Proxy Server SHALL include the server-side OpenAI API key in requests to OpenAI API
4. WHEN an OpenAI request fails, THE Proxy Server SHALL return appropriate error messages to the Frontend Client
5. THE Proxy Server SHALL support configurable OpenAI model and parameters

### Requirement 4: Request Validation and Security

**User Story:** As a system administrator, I want the proxy to validate and sanitize requests, so that malicious queries cannot harm the database or consume excessive resources.

#### Acceptance Criteria

1. THE Proxy Server SHALL validate that incoming requests contain required fields before processing
2. THE Proxy Server SHALL reject requests with payloads exceeding 1MB in size
3. WHEN a request contains invalid JSON, THE Proxy Server SHALL return a 400 Bad Request error
4. THE Proxy Server SHALL implement rate limiting of 100 requests per minute per client IP address
5. WHEN rate limit is exceeded, THE Proxy Server SHALL return a 429 Too Many Requests error with retry-after header

### Requirement 5: Error Handling and Logging

**User Story:** As a developer, I want clear error messages and logging, so that I can debug issues quickly when they occur.

#### Acceptance Criteria

1. WHEN an error occurs, THE Proxy Server SHALL return a structured error response with error type and message
2. THE Proxy Server SHALL log all incoming requests with timestamp, endpoint, and client IP
3. THE Proxy Server SHALL log all errors with stack traces to the console
4. WHEN Neo4j connection fails, THE Proxy Server SHALL log connection details excluding credentials
5. THE Proxy Server SHALL include request correlation IDs in logs for tracing

### Requirement 6: Development and Production Configuration

**User Story:** As a developer, I want different configurations for development and production, so that I can develop locally while deploying securely.

#### Acceptance Criteria

1. THE Proxy Server SHALL support CORS configuration with allowed origins from environment variables
2. WHEN running in development mode, THE Proxy Server SHALL allow CORS from localhost origins
3. WHEN running in production mode, THE Proxy Server SHALL restrict CORS to configured production origins only
4. THE Proxy Server SHALL support configurable port number via environment variable
5. THE Proxy Server SHALL log its configuration on startup excluding sensitive credentials

### Requirement 7: Health Check and Monitoring

**User Story:** As a system administrator, I want to monitor the proxy server health, so that I can ensure the service is running correctly.

#### Acceptance Criteria

1. THE Proxy Server SHALL expose a health check endpoint at /health
2. WHEN the health endpoint is called, THE Proxy Server SHALL return HTTP 200 if all services are operational
3. THE Proxy Server SHALL verify Neo4j connectivity as part of health check
4. WHEN Neo4j is unreachable, THE health endpoint SHALL return HTTP 503 with service status details
5. THE health endpoint SHALL return response time metrics for Neo4j and OpenAI services

### Requirement 8: Minimal Frontend Changes

**User Story:** As a frontend developer, I want minimal changes to existing code, so that the proxy integration is seamless and doesn't require major refactoring.

#### Acceptance Criteria

1. THE Frontend Client SHALL modify only the service layer files to use proxy endpoints
2. THE Frontend Client SHALL maintain the same method signatures in Neo4jService and OpenAIService
3. THE Frontend Client SHALL replace direct Neo4j driver calls with HTTP requests to proxy endpoints
4. THE Frontend Client SHALL replace direct OpenAI fetch calls with HTTP requests to proxy endpoints
5. THE Frontend Client SHALL handle proxy connection errors gracefully with user-friendly messages
