import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import './AiChatPage.css';

import ReactMarkdown from 'react-markdown';

const AiChatPage = () => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingHistory, setFetchingHistory] = useState(true);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        loadHistory();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadHistory = async () => {
        try {
            const [historyData, userData] = await Promise.all([
                apiClient.getAiHistory(),
                apiClient.getPremiumStatus()
            ]);
            setMessages(historyData.history || []);
            setUser(userData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setFetchingHistory(false);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', message: input, createdAt: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const data = await apiClient.sendAiMessage(input);
            const aiMsg = { role: 'model', message: data.response, createdAt: new Date() };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg = { role: 'model', message: 'Sorry, I am having trouble connecting. Please try again later.', isError: true };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    if (fetchingHistory) {
        return <div className="page-loading">{t('app.loading')}...</div>;
    }

    // Basic feature gating: check if user is premium
    // For now, let's assume we want to show a preview but limit messages,
    // OR just show a lock screen if not premium.
    // Let's go with the lock screen for clarity.

    // We need to know if user is premium. We'll fetch it from the API or state.
    // For simplicity, let's add a state for it or assume it's in the history response.
    const isPremium = user?.isPremium;

    return (
        <div className="ai-chat-page">
            <header className="ai-chat-header">
                <div className="ai-avatar">🧠</div>
                <div className="ai-info">
                    <h1>{t('aiPsychologist')}</h1>
                    <p>{t('aiOnline')}</p>
                </div>
            </header>

            {!isPremium && messages.length >= 5 ? (
                <div className="premium-gate-container">
                    <div className="premium-gate-content">
                        <div className="lock-icon">🔒</div>
                        <h2>Pulse Plus</h2>
                        <p>{t('premium.features.ai')}</p>
                        <Link to="/premium" className="btn btn-primary">
                            {t('premium.get_plus')}
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    <div className="messages-container">
                        {messages.length === 0 && (
                            <div className="empty-chat">
                                <div className="ai-welcome-icon">💬</div>
                                <h3>{t('aiWelcomeTitle')}</h3>
                                <p>{t('aiWelcomeText')}</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`message-wrapper ${msg.role}`}>
                                <div className="message-bubble">
                                    {msg.role === 'model' ? (
                                        <ReactMarkdown className="markdown-content">
                                            {msg.message}
                                        </ReactMarkdown>
                                    ) : (
                                        msg.message
                                    )}
                                    <span className="message-time">
                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="message-wrapper model">
                                <div className="message-bubble typing">
                                    <span className="dot"></span>
                                    <span className="dot"></span>
                                    <span className="dot"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input-area" onSubmit={sendMessage}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={t('typeMessage')}
                            disabled={loading}
                        />
                        <button type="submit" disabled={!input.trim() || loading}>
                            {loading ? '...' : '→'}
                        </button>
                    </form>
                </>
            )}
        </div>
    );
};

export default AiChatPage;
