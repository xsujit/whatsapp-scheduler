// server/src/utils/asyncHandler.js

/**
 * This High-Order Function (HOF) removes the need for try/catch blocks in every single controller method. 
 * It automatically catches rejected Promises and passes them to the global error middleware.
 * 
 * Wraps an async controller function to catch errors automatically.
 * @param {Function} fn - The async controller function
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};