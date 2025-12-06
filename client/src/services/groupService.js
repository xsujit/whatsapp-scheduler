// client/src/services/groupService.js

export const getAllGroups = async () => {
    try {
        const response = await fetch('/api/groups', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error('Failed to fetch groups');
        
        const data = await response.json();
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Group Fetch Error:', error);
        return { success: false, data: [] };
    }
};