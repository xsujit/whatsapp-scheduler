// server/src/types/enums.js

// WhatsApp Message Statuses
export const MESSAGE_STATUS = {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
    DELETED: 'DELETED',
    SENT: 'SENT',
};

export const MESSAGE_STATUS_VALUES = Object.values(MESSAGE_STATUS);

// Enum for Recurrence
export const RECURRENCE_TYPE = {
    ONCE: 'ONCE',
    DAILY: 'DAILY',
};

export const RECURRENCE_TYPE_VALUES = Object.values(RECURRENCE_TYPE);