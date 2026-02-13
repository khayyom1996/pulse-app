import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import './WishesPage.css';

const EMOJI_OPTIONS = ['💫', '❤️', '🌟', '🎁', '🏖️', '🍽️', '🎬', '🎵', '💐', '🏠'];

export default function WishesPage() {
    const { t } = useTranslation();
    const [wishes, setWishes] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [newWishText, setNewWishText] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('💫');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchWishes = useCallback(async () => {
        try {
            const data = await api.getWishList();
            setWishes(data.wishes || []);
            setCurrentUserId(data.userId);
        } catch (e) {
            console.error('Failed to fetch wishes:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWishes();
    }, [fetchWishes]);

    const handleAddWish = async (e) => {
        e.preventDefault();
        if (!newWishText.trim() || submitting) return;

        setSubmitting(true);
        try {
            const result = await api.createWish({ text: newWishText.trim(), emoji: selectedEmoji });
            // Optimistic update: add new wish to state immediately
            if (result.wish) {
                setWishes(prev => [result.wish, ...prev]);
            }
            setNewWishText('');
            setSelectedEmoji('💫');
            setShowEmojiPicker(false);
            // Background sync to ensure consistency
            fetchWishes();
        } catch (err) {
            console.error('Failed to create wish:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleDone = async (wishId) => {
        try {
            await api.toggleWishDone(wishId);
            await fetchWishes();
        } catch (err) {
            console.error('Failed to toggle wish:', err);
        }
    };

    const handleDelete = async (wishId) => {
        try {
            await api.deleteWish(wishId);
            await fetchWishes();
        } catch (err) {
            console.error('Failed to delete wish:', err);
        }
    };

    const myWishes = wishes.filter(w => String(w.userId) === String(currentUserId));
    const partnerWishes = wishes.filter(w => String(w.userId) !== String(currentUserId));

    if (loading) {
        return (
            <div className="page wishes-page">
                <div className="wishes-loading">
                    <div className="spinner" />
                </div>
            </div>
        );
    }

    return (
        <div className="page wishes-page">
            <h1 className="page-title">💫 {t('wishes.title', 'Желания')}</h1>

            {/* Add Wish Form */}
            <form className="wish-form" onSubmit={handleAddWish}>
                <div className="wish-input-row">
                    <button
                        type="button"
                        className="emoji-btn"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                        {selectedEmoji}
                    </button>
                    <input
                        type="text"
                        className="wish-input"
                        placeholder={t('wishes.add_placeholder', 'Добавить желание...')}
                        value={newWishText}
                        onChange={(e) => setNewWishText(e.target.value)}
                        maxLength={500}
                    />
                    <button
                        type="submit"
                        className="wish-submit-btn"
                        disabled={!newWishText.trim() || submitting}
                    >
                        {submitting ? '...' : '+'}
                    </button>
                </div>

                <AnimatePresence>
                    {showEmojiPicker && (
                        <motion.div
                            className="emoji-picker"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            {EMOJI_OPTIONS.map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    className={`emoji-option ${selectedEmoji === emoji ? 'selected' : ''}`}
                                    onClick={() => { setSelectedEmoji(emoji); setShowEmojiPicker(false); }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>

            {/* Partner's Wishes */}
            <section className="wish-section">
                <h2 className="wish-section-title">
                    💝 {t('wishes.partner_wishes', 'Желания партнёра')}
                </h2>
                {partnerWishes.length === 0 ? (
                    <p className="wish-empty">{t('wishes.partner_empty', 'Партнёр ещё не добавил желания')}</p>
                ) : (
                    <div className="wish-list">
                        <AnimatePresence>
                            {partnerWishes.map(wish => (
                                <motion.div
                                    key={wish.id}
                                    className={`wish-item ${wish.isDone ? 'done' : ''}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    layout
                                >
                                    <button
                                        className="wish-check"
                                        onClick={() => handleToggleDone(wish.id)}
                                    >
                                        {wish.isDone ? '✅' : '⬜'}
                                    </button>
                                    <span className="wish-emoji">{wish.emoji}</span>
                                    <span className={`wish-text ${wish.isDone ? 'strikethrough' : ''}`}>
                                        {wish.text}
                                    </span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </section>

            {/* My Wishes */}
            <section className="wish-section">
                <h2 className="wish-section-title">
                    ✨ {t('wishes.my_wishes', 'Мои желания')}
                </h2>
                {myWishes.length === 0 ? (
                    <p className="wish-empty">{t('wishes.my_empty', 'У вас пока нет желаний')}</p>
                ) : (
                    <div className="wish-list">
                        <AnimatePresence>
                            {myWishes.map(wish => (
                                <motion.div
                                    key={wish.id}
                                    className={`wish-item mine ${wish.isDone ? 'done' : ''}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    layout
                                >
                                    <span className="wish-emoji">{wish.emoji}</span>
                                    <span className={`wish-text ${wish.isDone ? 'strikethrough' : ''}`}>
                                        {wish.text}
                                    </span>
                                    {wish.isDone && <span className="wish-done-badge">✅</span>}
                                    <button
                                        className="wish-delete"
                                        onClick={() => handleDelete(wish.id)}
                                    >
                                        🗑️
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </section>
        </div>
    );
}
