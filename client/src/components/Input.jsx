// client/src/components/Input.jsx

import React from "react";

export const Input = ({ label, id, className = "", ...props }) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="space-y-1.5">
            <label htmlFor={inputId} className="block text-sm font-medium leading-6 text-slate-900">
                {label}
            </label>
            <input
                id={inputId}
                className={`block w-full rounded-md border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${className}`}
                {...props}
            />
        </div>
    );
};