// client/src/services/scheduleService.js
import { api } from '../lib/api';

const API_URL = '/api/schedules';

// ------------------------------------------------------------------
// --- SCHEDULER LOGIC ---
// ------------------------------------------------------------------

export const createSchedule = (payload) => api.post(API_URL, payload);

export const getRecurringRules = () => api.get('/api/schedules/definitions');

export const deleteRecurringRule = (id) => api.delete(`/api/schedules/definitions/${id}`);

// ------------------------------------------------------------------
// --- HISTORY LOGIC ---
// ------------------------------------------------------------------

export const getSchedules = () => api.get(API_URL);

export const deactivateSchedule = (id) => api.delete(`${API_URL}/${id}`);