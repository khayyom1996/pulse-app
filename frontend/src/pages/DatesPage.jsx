import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import './DatesPage.css';

export default function DatesPage() {
    const { t } = useTranslation();
    const [dates, setDates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        eventDate: '',
        category: 'custom',
        reminderDays: 1,
        visibility: 'both',
    });

    useEffect(() => {
        loadDates();
    }, []);

    const loadDates = async () => {
        try {
            const result = await api.getDates();
            setDates(result.dates || []);
        } catch (error) {
            console.error('Failed to load dates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.createDate(formData);
            setShowForm(false);
            setFormData({ title: '', eventDate: '', category: 'custom', reminderDays: 1, visibility: 'both' });
            loadDates();
        } catch (error) {
            console.error('Failed to create date:', error);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.deleteDate(id);
            loadDates();
        } catch (error) {
            console.error('Failed to delete date:', error);
        }
    };

    const getCategoryEmoji = (category) => {
        const emojis = {
            anniversary: '💍',
            birthday: '🎂',
            first_date: '💕',
            custom: '📅',
        };
        return emojis[category] || '📅';
    };

    const formatDaysUntil = (daysUntil) => {
        if (daysUntil === 0) return t('dates.today');
        if (daysUntil > 0) return t('dates.days_left', { days: daysUntil });
        return t('dates.days_ago', { days: Math.abs(daysUntil) });
    };

    if (loading) {
        return (
            <div className="page loading-page">
                <div className="loader">📅</div>
                <p>{t('app.loading')}</p>
            </div>
        );
    }

    return (
        <div className="page dates-page">
            <div className="page-header">
                <h1 className="page-title">{t('dates.title')}</h1>
                <button
                    className="btn btn-primary add-btn"
                    onClick={() => setShowForm(true)}
                >
                    + {t('dates.add')}
                </button>
            </div>

            {/* Date list */}
            <div className="dates-list">
                <AnimatePresence>
                    {dates.length === 0 ? (
                        <motion.div
                            className="empty-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <span className="empty-emoji">📅</span>
                            <p>{t('dates.empty')}</p>
                        </motion.div>
                    ) : (
                        dates.map((date, index) => (
                            <motion.div
                                key={date.id}
                                className={`date-card ${date.isToday ? 'today' : ''} ${date.isPast ? 'past' : ''}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="date-emoji">{getCategoryEmoji(date.category)}</div>
                                <div className="date-info">
                                    <h3 className="date-title">
                                        {date.title}
                                        {date.visibility === 'private' && <span className="private-badge">🔒</span>}
                                    </h3>
                                    <p className="date-date">
                                        {new Date(date.eventDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="date-countdown">
                                    <span className={`days ${date.isToday ? 'today' : ''}`}>
                                        {formatDaysUntil(date.daysUntil)}
                                    </span>
                                </div>
                                <button
                                    className="delete-btn"
                                    onClick={() => handleDelete(date.id)}
                                >
                                    ✕
                                </button>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Add date form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowForm(false)}
                    >
                        <motion.form
                            className="date-form"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            onSubmit={handleSubmit}
                        >
                            <h2>{t('dates.add')}</h2>

                            <input
                                type="text"
                                placeholder={t('dates.form.title_placeholder')}
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />

                            <input
                                type="date"
                                value={formData.eventDate}
                                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                                required
                            />

                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="anniversary">{t('dates.categories.anniversary')}</option>
                                <option value="birthday">{t('dates.categories.birthday')}</option>
                                <option value="first_date">{t('dates.categories.first_date')}</option>
                                <option value="custom">{t('dates.categories.custom')}</option>
                            </select>

                            {/* Visibility toggle */}
                            <div className="visibility-toggle">
                                <label className="toggle-label">{t('dates.form.visibility')}</label>
                                <div className="toggle-options">
                                    <button
                                        type="button"
                                        className={`toggle-btn ${formData.visibility === 'both' ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, visibility: 'both' })}
                                    >
                                        👥 {t('dates.form.visibility_both')}
                                    </button>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${formData.visibility === 'private' ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, visibility: 'private' })}
                                    >
                                        🔒 {t('dates.form.visibility_private')}
                                    </button>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                    {t('dates.form.cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {t('dates.form.save')}
                                </button>
                            </div>
                        </motion.form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
