// client/src/services/scheduleService.js

const API_URL = "http://localhost:3001/api/schedule";
const JOBS_URL = "http://localhost:3001/api/jobs";

export const scheduleMessage = async (message) => {
    if (!message || message.trim() === "") {
        return { success: false, message: "", error: "Please write a message first." };
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
            credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, message: "", error: data.error || "Server Error" };
        }

        return {
            success: data.success,
            message: data.message,
            scheduledFor: data.scheduledFor,
        };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return { success: false, message: "", error: `❌ Connection failed: ${errorMessage}` };
    }
};

export const getScheduledJobs = async () => {
    try {
        const response = await fetch(JOBS_URL, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, jobs: [], error: data.error || "Failed to fetch jobs" };
        }

        return { success: true, jobs: data.jobs };
    } catch (err) {
        return { success: false, jobs: [], error: "Connection failed" };
    }
};