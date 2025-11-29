import React from "react";

export const Button = ({
    children,
    variant = "primary",
    isLoading,
    className = "",
    disabled,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-600 shadow-sm",
        secondary: "bg-white text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:ring-indigo-600 shadow-sm",
        outline: "border border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-600",
        ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                </>
            ) : children}
        </button>
    );
};
