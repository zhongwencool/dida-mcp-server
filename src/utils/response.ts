// Utility functions for standardizing tool responses

/**
 * Creates a standardized JSON response for tool results
 * @param data The data to include in the response
 * @param success Whether the operation was successful
 * @param message Optional message to include in the response
 * @returns A formatted response object
 */
export function createJsonResponse<T>(data: T, success: boolean = true, message?: string) {
    const response = {
        success,
        data,
        ...(message && { message })
    };

    // Convert to JSON string to ensure compatibility with MCP SDK
    const jsonString = JSON.stringify(response);

    return {
        content: [
            {
                type: "text" as const,
                text: jsonString
            }
        ]
    };
}

/**
 * Creates a standardized JSON error response
 * @param error The error message or object
 * @param data Optional data to include with the error
 * @returns A formatted error response object
 */
export function createJsonErrorResponse(error: Error | string, data: any = null) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    const response = {
        success: false,
        error: errorMessage,
        ...(data && { data })
    };

    // Convert to JSON string to ensure compatibility with MCP SDK
    const jsonString = JSON.stringify(response);

    return {
        content: [
            {
                type: "text" as const,
                text: jsonString
            }
        ]
    };
}
