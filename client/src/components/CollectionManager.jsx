// client/src/components/CollectionManager.jsx

import React from 'react';
import { CollectionList } from './collections/CollectionList';
import { CollectionForm } from './collections/CollectionForm';
import { CollectionProvider, useCollection } from '../context/CollectionContext';

// CollectionManager Component (Wrapper for Context Provider)
export const CollectionManager = () => {
    return (
        <CollectionProvider>
            <CollectionManagerContent />
        </CollectionProvider>
    );
};

// Internal component to use the context and render the UI
const CollectionManagerContent = () => {
    const { handleCreate } = useCollection();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900">Your Lists</h2>
                    <button onClick={handleCreate} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ New List</button>
                </div>
                <CollectionList /> 
            </div>

            <div className="lg:col-span-2">
                <CollectionForm /> 
            </div>
        </div>
    );
};