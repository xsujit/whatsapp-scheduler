// client/src/components/collections/CollectionForm.jsx

import React from 'react';
import { Button } from '../Button';
import { Input } from '../Input';
import { useCollection } from '../../context/CollectionContext';

export const CollectionForm = () => {
    // Get all required values from context
    const { 
        viewMode, 
        loadingDetails, 
        submitting, 
        name, 
        setName, 
        groups, 
        selectedJids, 
        handleToggleGroup, 
        handleSave, 
        handleCancel, 
        groupLoadError 
    } = useCollection();

    if (loadingDetails) {
        return (
            <div className="h-96 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-12">
                <p>Loading details...</p>
            </div>
        );
    }

    if (viewMode === 'idle') {
        return (
            <div className="h-96 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-12">
                <p>Select <strong>New List</strong> or click <strong>Edit</strong> on an existing collection.</p>
            </div>
        );
    }

    return (
        // Use handler from context
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-lg border border-indigo-100 p-6">
            <h3 className="text-lg font-bold mb-4">{viewMode === 'edit' ? 'Edit Collection' : 'Create New Collection'}</h3>
            
            <div className="mb-6">
                <Input
                    label="Collection Name"
                    value={name}
                    // Use setter from context
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Morning Shift"
                />
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Groups ({selectedJids.size})</label>
                <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {groups.length === 0 ? (
                        <p className="p-4 text-sm text-center text-slate-500">
                            {groupLoadError ? 'Error loading groups.' : 'No available groups found to list.'}
                        </p>
                    ) : (
                        groups.map(group => (
                            <label key={group.jid} className="flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    checked={selectedJids.has(group.jid)}
                                    // Use handler from context
                                    onChange={() => handleToggleGroup(group.jid)}
                                />
                                <span className="ml-3 text-sm text-slate-700">{group.name || group.jid.split('@')[0]}</span>
                            </label>
                        ))
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3">
                {/* Use handler from context */}
                <Button type="button" variant="secondary" onClick={handleCancel}>Cancel</Button>
                <Button type="submit" isLoading={submitting}>Save Collection</Button>
            </div>
        </form>
    );
};