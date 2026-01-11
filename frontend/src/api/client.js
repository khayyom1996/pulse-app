const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Get init data from Telegram
const getInitData = () => {
    try {
        return window.Telegram?.WebApp?.initData || '';
    } catch {
        return '';
    }
};

// API client with auth
const api = {
    async request(endpoint, options = {}) {
        const url = `${API_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': getInitData(),
            ...options.headers,
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Auth
    login(initData) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ initData }),
        });
    },

    createPair() {
        return this.request('/api/auth/create-pair', { method: 'POST' });
    },

    joinPair(inviteCode) {
        return this.request('/api/auth/join-pair', {
            method: 'POST',
            body: JSON.stringify({ inviteCode }),
        });
    },

    // Love
    sendLove(message = null) {
        return this.request('/api/love', {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    },

    getLoveHistory() {
        return this.request('/api/love/history');
    },

    getStreak() {
        return this.request('/api/love/streak');
    },

    // Dates
    getDates() {
        return this.request('/api/dates');
    },

    getUpcomingDates() {
        return this.request('/api/dates/upcoming');
    },

    createDate(data) {
        return this.request('/api/dates', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateDate(id, data) {
        return this.request(`/api/dates/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    deleteDate(id) {
        return this.request(`/api/dates/${id}`, { method: 'DELETE' });
    },

    // Wishes
    getWishCards(category = null) {
        const query = category ? `?category=${category}` : '';
        return this.request(`/api/wishes/cards${query}`);
    },

    swipeCard(cardId, liked) {
        return this.request('/api/wishes/swipe', {
            method: 'POST',
            body: JSON.stringify({ cardId, liked }),
        });
    },

    getMatches() {
        return this.request('/api/wishes/matches');
    },

    completeMatch(matchId) {
        return this.request(`/api/wishes/matches/${matchId}/complete`, {
            method: 'POST',
        });
    },

    getWishStats() {
        return this.request('/api/wishes/stats');
    },
};

export default api;
