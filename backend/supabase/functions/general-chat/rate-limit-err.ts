export function isRateLimitError(error: unknown): boolean {
    if (!error) return false;
    
    // Handle string errors (stringified JSON)
    if (typeof error === 'string') {
        return error.includes('429') ||
               error.includes('RESOURCE_EXHAUSTED') ||
               error.includes('quota') ||
               error.includes('rate limit');
    }
    
    // Handle object errors
    if (typeof error === 'object') {
        const err = error as { 
            status?: number | string; 
            message?: string;
            error?: {
                status?: number | string;
                code?: number;
                message?: string;
            }
        };
        
        // Check nested error first (Gemini's format)
        const status = err.error?.status || err.error?.code || err.status;
        const message = err.error?.message || err.message;
        
        return (
            status === 429 ||
            status === "RESOURCE_EXHAUSTED" ||
            (message?.includes('quota') ?? false) ||
            (message?.includes('rate limit') ?? false) ||
            (message?.includes('RESOURCE_EXHAUSTED') ?? false)
        );
    }
    
    return false;
}