// client/src/lib/api.js

/**
 * robust fetch wrapper that handles:
 * 1. JSON parsing
 * 2. HTTP Error checking (throws standard errors)
 * 3. 204 No Content handling
 */
export const api = {
    request: async (endpoint, options = {}) => {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        const config = { ...options, headers };

        try {
            const res = await fetch(endpoint, config);

            // 1. Handle 204 No Content (Success, but no JSON to parse)
            if (res.status === 204) {
                return null;
            }

            // 2. Parse JSON
            const data = await res.json();

            // 3. Handle HTTP Errors (4xx, 5xx)
            if (!res.ok) {
                // Throw the specific message sent by backend's AppError
                throw new Error(data.error || `Request failed with status ${res.status}`);
            }

            return data;
        } catch (error) {
            // Network errors (fetch failed entirely) or parsed backend errors
            throw error;
        }
    },

    get: (url) => api.request(url, { method: 'GET' }),
    
    post: (url, body) => api.request(url, { method: 'POST', body: JSON.stringify(body) }),
    
    put: (url, body) => api.request(url, { method: 'PUT', body: JSON.stringify(body) }),
    
    delete: (url) => api.request(url, { method: 'DELETE' })
};