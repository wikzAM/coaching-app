export function isRateLimitError(error: unknown): boolean {
    if (!error) return false;
    
    if (typeof error === 'string') {
        return error.includes('429') ||
               error.includes('503') ||
               error.includes('RESOURCE_EXHAUSTED') ||
               error.includes('UNAVAILABLE') ||
               error.includes('quota') ||
               error.includes('rate limit');
    }
    
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
        
        const status = err.error?.status || err.error?.code || err.status;
        const message = err.error?.message || err.message;
        
        return (
            status === 429 ||
            status === 503 ||
            status === "RESOURCE_EXHAUSTED" ||
            status === "UNAVAILABLE" ||
            (message?.includes('quota') ?? false) ||
            (message?.includes('rate limit') ?? false) ||
            (message?.includes('RESOURCE_EXHAUSTED') ?? false) ||
            (message?.includes('UNAVAILABLE') ?? false) ||
            (message?.includes('high demand') ?? false)
        );
    }
    
    return false;
}