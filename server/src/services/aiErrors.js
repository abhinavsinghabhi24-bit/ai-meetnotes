/**
 * Custom error hierarchy for AI meeting analysis.
 * All errors carry HTTP status codes and machine-readable error codes.
 */

export class AiError extends Error {
  constructor(message, status = 500, code = 'AI_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
  }
}

/** Missing or invalid API key / provider configuration */
export class AiConfigError extends AiError {
  constructor(message = 'AI analysis service is not configured. Please add GEMINI_API_KEY or OPENAI_API_KEY to server/.env.') {
    super(message, 503, 'AI_CONFIG_ERROR');
  }
}

/** Rate limits from provider (HTTP 429) */
export class AiRateLimitError extends AiError {
  constructor(message = 'AI service rate limit exceeded. Please wait a moment and try again.') {
    super(message, 429, 'AI_RATE_LIMIT');
  }
}

/** Upstream provider failure (HTTP 5xx, network drop) */
export class AiProviderError extends AiError {
  constructor(message = 'AI provider service is currently unavailable. Please try again.') {
    super(message, 502, 'AI_PROVIDER_ERROR');
  }
}

/** Model returned malformed or unparseable output */
export class AiParseError extends AiError {
  constructor(message = 'AI model returned an unexpected response format. Please retry.') {
    super(message, 502, 'AI_PARSE_ERROR');
  }
}

/** Request timed out */
export class AiTimeoutError extends AiError {
  constructor(message = 'AI analysis request timed out. Please try with a shorter transcript or try again.') {
    super(message, 504, 'AI_TIMEOUT');
  }
}
