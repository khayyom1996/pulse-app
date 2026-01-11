import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';
import api from '../api/client';
import './WishesPage.css';

export default function WishesPage() {
    const { t } = useTranslation();
    const { haptic } = useTelegram();
    const [cards, setCards] = useState([]);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showMatch, setShowMatch] = useState(null);
    const [category, setCategory] = useState(null);
    const [activeTab, setActiveTab] = useState('cards'); // 'cards' or 'matches'
    const [swipeDirection, setSwipeDirection] = useState(null);
    const cardRef = useRef(null);

    useEffect(() => {
        loadData();
    }, [category]);

    const loadData = async () => {
        try {
            const [cardsResult, matchesResult] = await Promise.all([
                api.getWishCards(category),
                api.getMatches(),
            ]);
            setCards(cardsResult.cards || []);
            setMatches(matchesResult.matches || []);
        } catch (error) {
            console.error('Failed to load wishes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSwipe = async (cardId, liked) => {
        haptic('selection');
        setSwipeDirection(liked ? 'right' : 'left');

        // Remove card from deck
        setTimeout(() => {
            setCards(prev => prev.filter(c => c.id !== cardId));
            setSwipeDirection(null);
        }, 300);

        try {
            const result = await api.swipeCard(cardId, liked);

            if (result.isMatch) {
                haptic('notification');
                setShowMatch(result.match);
                loadData(); // Refresh matches
            }
        } catch (error) {
            console.error('Failed to swipe:', error);
        }
    };

    const currentCard = cards[0];

    const getCardText = (card) => {
        const lang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || 'ru';
        if (lang === 'tg' && card.textTg) return card.textTg;
        if (lang === 'en' && card.textEn) return card.textEn;
        return card.textRu;
    };

    if (loading) {
        return (
            <div className="page loading-page">
                <div className="loader">💜</div>
                <p>{t('app.loading')}</p>
            </div>
        );
    }

    return (
        <div className="page wishes-page">
            <h1 className="page-title">{t('wishes.title')}</h1>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'cards' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cards')}
                >
                    Карточки
                </button>
                <button
                    className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
                    onClick={() => setActiveTab('matches')}
                >
                    Совпадения ({matches.length})
                </button>
            </div>

            {/* Category filter */}
            {activeTab === 'cards' && (
                <div className="category-filter">
                    <button
                        className={`filter-btn ${!category ? 'active' : ''}`}
                        onClick={() => setCategory(null)}
                    >
                        Все
                    </button>
                    <button
                        className={`filter-btn ${category === 'romance' ? 'active' : ''}`}
                        onClick={() => setCategory('romance')}
                    >
                        💕 {t('wishes.categories.romance')}
                    </button>
                    <button
                        className={`filter-btn ${category === 'adventure' ? 'active' : ''}`}
                        onClick={() => setCategory('adventure')}
                    >
                        🌍 {t('wishes.categories.adventure')}
                    </button>
                    <button
                        className={`filter-btn ${category === 'leisure' ? 'active' : ''}`}
                        onClick={() => setCategory('leisure')}
                    >
                        🎬 {t('wishes.categories.leisure')}
                    </button>
                </div>
            )}

            {/* Cards view */}
            {activeTab === 'cards' && (
                <div className="cards-container">
                    <AnimatePresence>
                        {currentCard ? (
                            <motion.div
                                key={currentCard.id}
                                ref={cardRef}
                                className={`wish-card ${swipeDirection ? `swipe-${swipeDirection}` : ''}`}
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{
                                    x: swipeDirection === 'right' ? 300 : -300,
                                    opacity: 0,
                                    rotate: swipeDirection === 'right' ? 20 : -20,
                                }}
                                transition={{ duration: 0.3 }}
                            >
                                <span className="card-emoji">{currentCard.emoji || '💭'}</span>
                                <p className="card-text">{getCardText(currentCard)}</p>
                                <span className="card-category">
                                    {t(`wishes.categories.${currentCard.category}`)}
                                </span>
                            </motion.div>
                        ) : (
                            <div className="no-cards">
                                <span className="empty-emoji">✨</span>
                                <p>{t('wishes.no_cards')}</p>
                            </div>
                        )}
                    </AnimatePresence>

                    {currentCard && (
                        <div className="swipe-buttons">
                            <button
                                className="swipe-btn dislike"
                                onClick={() => handleSwipe(currentCard.id, false)}
                            >
                                ✕
                            </button>
                            <button
                                className="swipe-btn like"
                                onClick={() => handleSwipe(currentCard.id, true)}
                            >
                                ❤️
                            </button>
                        </div>
                    )}

                    <p className="swipe-hint">{t('wishes.swipe_hint')}</p>
                </div>
            )}

            {/* Matches view */}
            {activeTab === 'matches' && (
                <div className="matches-list">
                    {matches.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-emoji">💫</span>
                            <p>Пока нет совпадений</p>
                        </div>
                    ) : (
                        matches.map((match) => (
                            <motion.div
                                key={match.id}
                                className={`match-card ${match.isCompleted ? 'completed' : ''}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <span className="match-emoji">{match.WishCard?.emoji || '💜'}</span>
                                <div className="match-info">
                                    <p className="match-text">{getCardText(match.WishCard)}</p>
                                    <span className="match-date">
                                        {new Date(match.matchedAt).toLocaleDateString()}
                                    </span>
                                </div>
                                {match.isCompleted && <span className="completed-badge">✓</span>}
                            </motion.div>
                        ))
                    )}
                </div>
            )}

            {/* Match popup */}
            <AnimatePresence>
                {showMatch && (
                    <motion.div
                        className="match-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowMatch(null)}
                    >
                        <motion.div
                            className="match-popup"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                        >
                            <span className="match-hearts">💕</span>
                            <h2 className="match-text">{t('wishes.match')}</h2>
                            <p>{t('wishes.match_text')}</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
