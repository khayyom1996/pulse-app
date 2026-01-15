import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import './AiChatPage.css';

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
            const data = await apiClient.getAiHistory();
            setMessages(data.history || []);
        } catch (error) {
            console.error('Failed to load history:', error);
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
        return <div className="ai-chat-loading">{t('loading')}...</div>;
    }

    return (
        <div className="ai-chat-page">
            <header className="ai-chat-header">
                <div className="ai-avatar">🧠</div>
                <div className="ai-info">
                    <h1>{t('aiPsychologist')}</h1>
                    <p>{t('aiOnline')}</p>
                </div>
            </header>

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
                            {msg.message}
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
        </div>
    );
};

export default AiChatPage;
