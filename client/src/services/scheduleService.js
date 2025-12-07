// client/src/services/scheduleService.js

const API_URL = '/api/schedules';

// ------------------------------------------------------------------
// --- NEW SCHEDULER LOGIC (Used by ScheduleContext/Form) ---
// ------------------------------------------------------------------

/**
 * Creates a schedule (One-Time or Daily)
 * @param {Object} payload - { type: 'ONCE'|'DAILY', collectionId, content, hour, minute }
 */
export const createSchedule = async (payload) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error || 'Server Error' };
        }

        return {
            success: true,
            message: 'Schedule created successfully!',
            data
        };
    } catch (err) {
        return { success: false, error: `Connection failed: ${err.message}` };
    }
};

/**
 * Fetches Active Recurring Rules (Definitions)
 */
export const getRecurringRules = async () => {
    try {
        const response = await fetch('/api/schedules/definitions', {
            method: 'GET'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch rules');
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Deletes a Recurring Rule
 */
export const deleteRecurringRule = async (id) => {
    try {
        const response = await fetch(`/api/schedules/definitions/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete rule');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ------------------------------------------------------------------
// --- HISTORY LOGIC (Used by JobsHistory.jsx) ---
// ------------------------------------------------------------------

/**
 * Fetches Schedule Execution History (One Time and Recurring Instances)
 */
export const getSchedules = async () => {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        if (!response.ok) {
            return { success: false, data: [], error: data.error };
        }

        return { success: true, data: data };
    } catch (err) {
        return { success: false, data: [], error: 'Connection failed' };
    }
};

/**
 * Deletes a specific Scheduled Message (One-Time or Recurring Instance)
 */
export const deactivateSchedule = async (id) => {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            return { success: false, error: 'Failed to delete schedule' };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};