// client/src/services/groupService.js

import { api } from '../lib/api';

export const getAllGroups = () => api.get('/api/groups');