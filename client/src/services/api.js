import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Attach token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me'),
};

// Feedback
export const feedbackAPI = {
    create: (data) => api.post('/feedback', data),
    getAll: (params) => api.get('/feedback', { params }),
    getOne: (id) => api.get(`/feedback/${id}`),
    updateStatus: (id, data) => api.put(`/feedback/${id}/status`, data),
};

// Analysis
export const analysisAPI = {
    analyze: (feedbackId) => api.post(`/analysis/analyze/${feedbackId}`),
    reAnalyze: (feedbackId) => api.put(`/analysis/reanalyze/${feedbackId}`),
    getAll: (params) => api.get('/analysis', { params }),
    getDashboard: () => api.get('/analysis/dashboard'),
    getTeamAnalysis: (teamId) => api.get(`/analysis/team/${teamId}`),
};

// Admin
export const adminAPI = {
    getUsers: (params) => api.get('/admin/users', { params }),
    createUser: (data) => api.post('/admin/users', data),
    updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
    deleteUser: (id) => api.delete(`/admin/users/${id}`),
    bulkAssignUsers: (userIds, teamId) => api.put('/admin/users/bulk-assign', { userIds, teamId }),
    teleportUser: (id, teamId) => api.put(`/admin/users/${id}/teleport`, { teamId }),
    resetPassword: (id, newPassword) => api.put(`/admin/users/${id}/reset-password`, { newPassword }),
    getTeams: () => api.get('/admin/teams'),
    createTeam: (data) => api.post('/admin/teams', data),
    updateTeam: (id, data) => api.put(`/admin/teams/${id}`, data),
};

// Chat
export const chatAPI = {
    getDirectory: () => api.get('/chat/directory'),
    getHistory: (userId) => api.get(`/chat/history/${userId}`),
    sendMessage: (data) => api.post('/chat/send', data),
    getBroadcasts: () => api.get('/chat/broadcasts'),
    sendBroadcast: (data) => api.post('/chat/broadcast', data),
    markAsRead: (messageId) => api.put(`/chat/read/${messageId}`)
};

// Alerts (HR → CEO)
export const alertAPI = {
    create: (data) => api.post('/alerts', data),
    getAll: (params) => api.get('/alerts', { params }),
    getUnreadCount: () => api.get('/alerts/unread-count'),
    markRead: (id) => api.put(`/alerts/${id}/read`),
    dismiss: (id) => api.put(`/alerts/${id}/dismiss`),
};

export default api;
