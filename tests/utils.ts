// Test utilities

/**
 * Parse a JSON response from a tool
 * @param text The text content from the tool response
 * @returns The parsed JSON object
 */
export function parseJsonResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${text}`);
  }
}
