// client/src/components/common/StatusBadge.jsx

import React from 'react';

/**
 * Renders a colored badge based on the message status.
 * @param {object} props
 * @param {string} props.status - The status string (e.g., 'PENDING', 'DELETED').
 */
export const StatusBadge = ({ status }) => {
    const statusKey = status ? status.toUpperCase() : 'UNKNOWN';

    const styles = {
        PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        IN_PROGRESS: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        SENT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        FAILED: 'bg-red-100 text-red-800 border-red-200',
        EXPIRED: 'bg-orange-100 text-orange-800 border-orange-200',
        DELETED: 'bg-slate-100 text-slate-500 border-slate-200',
        UNKNOWN: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${styles[statusKey] || styles.UNKNOWN}`}
        >
            {status}
        </span>
    );
};