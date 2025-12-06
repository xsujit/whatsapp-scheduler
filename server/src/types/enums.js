// src/types/enums.js

/**
 * @file Contains all central constant values used across the application.
 */

// 1. WhatsApp Message Statuses
export const MESSAGE_STATUS = {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
    DELETED: 'DELETED',
    SENT: 'SENT',
};

// 2. A simple array useful for the database CHECK constraint definition
export const MESSAGE_STATUS_VALUES = Object.values(MESSAGE_STATUS);