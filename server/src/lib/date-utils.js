// server/src/lib/date-utils.js

import { DateTime } from 'luxon';
import { CONFIG } from '#config';

/**
 * Calculates the next occurrence of a specific Hour:Minute in the App's Timezone.
 * If the time has already passed today, it schedules for tomorrow.
 * @param {number} hour - 0-23
 * @param {number} minute - 0-59
 * @returns {DateTime} Luxon DateTime object (in App Timezone)
 */
export const getTargetTime = (hour, minute) => {
    const now = DateTime.now().setZone(CONFIG.TIMEZONE);

    let target = now.set({ hour, minute, second: 0, millisecond: 0 });

    if (target <= now) {
        target = target.plus({ days: 1 });
    }

    return target;
};

/**
 * formatting helper for response
 */
export function formatTime(luxonDate) {
    return luxonDate.toFormat('MMM dd, yyyy HH:mm');
}