"use client";

import React from 'react';

export default function LoadingSpinner({ size = 'md', color = 'blue' }) {
    const sizes = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16'
    };

    const colors = {
        blue: 'border-blue-500',
        green: 'border-green-500',
        red: 'border-red-500',
        gray: 'border-gray-500',
        white: 'border-white'
    };

    return (
        <div className="flex items-center justify-center">
            <div className={`animate-spin rounded-full border-2 border-t-transparent ${sizes[size]} ${colors[color]}`}></div>
        </div>
    );
}

export function LoadingOverlay({ message = "Loading..." }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4">
                <LoadingSpinner size="lg" />
                <p className="text-gray-700 font-medium">{message}</p>
            </div>
        </div>
    );
}

export function InlineLoader({ message = "Processing..." }) {
    return (
        <div className="flex items-center justify-center space-x-3 py-4">
            <LoadingSpinner size="sm" />
            <span className="text-gray-600">{message}</span>
        </div>
    );
}