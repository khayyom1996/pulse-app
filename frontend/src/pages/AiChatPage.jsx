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
    const [user, setUser] = useState(null);
    const [remaining, setRemaining] = useState(null);
    const [dailyLimit, setDailyLimit] = useState(3);
    const containerRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (messages.length === 0) return;

        const lastMsg = messages[messages.length - 1];

        // If last message is from model, scroll to its start
        if (lastMsg.role === 'model') {
            setTimeout(() => {
                const nodes = containerRef.current?.querySelectorAll('.message-wrapper');
                const lastNode = nodes?.[nodes.length - 1];
                if (lastNode) {
                    lastNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        } else {
            // User message or others, scroll to bottom
            setTimeout(scrollToBottom, 100);
        }
    }, [messages]);

    const loadHistory = async () => {
        try {
            const [historyData, userData] = await Promise.all([
                apiClient.getAiHistory(),
                apiClient.getPremiumStatus()
            ]);
            setMessages(historyData.history || []);
            setRemaining(historyData.remaining);
            setDailyLimit(historyData.dailyLimit || 3);
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
            if (data.remaining !== undefined) setRemaining(data.remaining);
        } catch (error) {
            console.error('Chat error:', error);
            let errorText = 'Sorry, I am having trouble connecting. Please try again later.';
            if (error?.message?.includes('403') || error?.status === 403) {
                errorText = t('ai.premium_required', 'Для доступа к AI нужна подписка Premium');
            } else if (error?.message?.includes('429') || error?.status === 429) {
                errorText = t('ai.limit_reached', 'Дневной лимит сообщений исчерпан');
                setRemaining(0);
            }
            const errorMsg = { role: 'model', message: errorText, isError: true };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    if (fetchingHistory) {
        return <div className="page-loading">{t('app.loading')}...</div>;
    }

    const isPremium = user?.isPremium;
    const aiEnabled = user?.aiEnabled;

    // Show lock screen only if AI is not globally enabled AND user is not premium
    const showLock = !aiEnabled && !isPremium;

    return (
        <div className="ai-chat-page">
            <header className="ai-chat-header">
                <div className="ai-avatar">🧠</div>
                <div className="ai-info">
                    <h1>{t('aiPsychologist')}</h1>
                    <p>{t('aiOnline')}</p>
                </div>
                {/* Show remaining messages for non-premium users */}
                {!isPremium && remaining !== null && !showLock && (
                    <div className="ai-remaining">
                        {remaining}/{dailyLimit}
                    </div>
                )}
            </header>

            {showLock ? (
                <div className="premium-gate-container" style={{ top: '60px' }}>
                    <div className="premium-gate-content">
                        <div className="lock-icon">🔒</div>
                        <h2>{t('premium.title')}</h2>
                        <p>{t('premium.features.ai')}</p>
                        <Link to="/premium" className="btn btn-primary">
                            {t('premium.get_plus')}
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    <div className="messages-container" ref={containerRef}>
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

                    {remaining === 0 && !isPremium && (
                        <div className="limit-reached-overlay">
                            <div className="limit-content">
                                <span className="limit-icon">🔒</span>
                                <div className="limit-text">
                                    <strong>{t('ai.limit_reached', 'На сегодня лимит исчерпан')}</strong>
                                    <p>{t('premium.subtitle', 'Оформите Pulse Plus для безлимитного общения')}</p>
                                </div>
                            </div>
                            <Link to="/premium" className="limit-btn">
                                Upgrade
                            </Link>
                        </div>
                    )}

                    <form className="chat-input-area" onSubmit={sendMessage}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={remaining === 0 && !isPremium
                                ? t('ai.limit_placeholder', 'Лимит исчерпан — получите Premium')
                                : t('typeMessage')}
                            disabled={loading || (remaining === 0 && !isPremium)}
                        />
                        <button type="submit" disabled={!input.trim() || loading || (remaining === 0 && !isPremium)}>
                            {loading ? '...' : '→'}
                        </button>
                    </form>
                </>
            )}
        </div>
    );
};

export default AiChatPage;
