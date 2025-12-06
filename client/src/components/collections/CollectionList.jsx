// client/src/components/collections/CollectionList.jsx

import React from 'react';
import { useCollection } from '../../context/CollectionContext';

export const CollectionList = () => {
    const { collections, loadingData, handleEdit, handleDelete } = useCollection();

    if (loadingData) return <p className="p-4 text-sm text-slate-500 text-center">Loading...</p>;
    if (collections.length === 0) return <p className="p-4 text-sm text-slate-500 text-center">No collections yet.</p>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {collections.map((col) => (
                <div key={col.id} className="p-4 hover:bg-slate-50 flex justify-between items-center group">
                    <div>
                        <h3 className="font-medium text-slate-900">{col.name}</h3>
                        <p className="text-xs text-slate-500">{col.item_count} groups</p>
                    </div>
                    <div className="flex space-x-2">
                        {/* Use handlers from context */}
                        <button onClick={() => handleEdit(col)} className="text-indigo-500 text-xs hover:text-indigo-700">Edit</button>
                        <button onClick={() => handleDelete(col.id)} className="text-red-500 text-xs hover:text-red-700">Delete</button>
                    </div>
                </div>
            ))}
        </div>
    );
};