// client/src/services/scheduleService.js

const API_URL = '/api/schedules';

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

export const deleteSchedule = async (id) => {
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