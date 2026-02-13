import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import './PremiumPage.css';

const PremiumPage = () => {
    const { t } = useTranslation();
    const [premiumStatus, setPremiumStatus] = useState({ isPremium: false, premiumUntil: null, discount: 0, pricing: null });
    const [loading, setLoading] = useState(true);
    const [purchaseLoading, setPurchaseLoading] = useState(false);
    const [selectedTier, setSelectedTier] = useState('monthly');

    useEffect(() => {
        loadPremiumStatus();
    }, []);

    const loadPremiumStatus = async () => {
        try {
            const status = await apiClient.getPremiumStatus();
            setPremiumStatus(status);
        } catch (error) {
            console.error('Failed to load premium status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        setPurchaseLoading(true);
        try {
            const { invoiceLink } = await apiClient.createInvoice(selectedTier);

            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.openInvoice(invoiceLink, (status) => {
                    if (status === 'paid') {
                        loadPremiumStatus();
                    }
                });
            } else {
                window.open(invoiceLink, '_blank');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            alert(t('errors.unknown'));
        } finally {
            setPurchaseLoading(false);
        }
    };

    // Get prices from backend settings (with fallback defaults)
    const prices = premiumStatus.pricing || { monthly: 299, six_months: 999, yearly: 1499 };
    const discount = premiumStatus.discount || 0;

    const getDiscountedPrice = (base) => {
        if (discount > 0) return Math.round(base * (1 - discount / 100));
        return base;
    };

    if (loading) return <div className="page-loading">{t('app.loading')}</div>;

    return (
        <div className="premium-page animate-fade-in">
            <header className="premium-header">
                <div className="premium-badge">PLUS</div>
                <h1>{t('premium.title')}</h1>
                <p>{t('premium.subtitle')}</p>
            </header>

            <div className="premium-features">
                <div className="feature-item">
                    <span className="feature-icon">🧠</span>
                    <div className="feature-text">
                        <h3>{t('premium.features.ai')}</h3>
                    </div>
                </div>
                <div className="feature-item">
                    <span className="feature-icon">🌳</span>
                    <div className="feature-text">
                        <h3>{t('premium.features.tree')}</h3>
                    </div>
                </div>
                <div className="feature-item">
                    <span className="feature-icon">✨</span>
                    <div className="feature-text">
                        <h3>{t('premium.features.wishes')}</h3>
                    </div>
                </div>
                <div className="feature-item">
                    <span className="feature-icon">❤️</span>
                    <div className="feature-text">
                        <h3>{t('premium.features.love')}</h3>
                    </div>
                </div>
                <div className="feature-item">
                    <span className="feature-icon">📅</span>
                    <div className="feature-text">
                        <h3>{t('premium.features.dates')}</h3>
                    </div>
                </div>
                <div className="feature-item">
                    <span className="feature-icon">🔔</span>
                    <div className="feature-text">
                        <h3>{t('premium.features.notifs')}</h3>
                    </div>
                </div>
            </div>

            {premiumStatus.isPremium && (
                <div className="premium-active-card">
                    <div className="success-icon">✨</div>
                    <h3>{t('premium.success')}</h3>
                    <p>
                        {t('premium.active_until', {
                            date: new Date(premiumStatus.premiumUntil).toLocaleDateString()
                        })}
                    </p>
                </div>
            )}

            <div className="premium-options">
                {premiumStatus.isPremium && (
                    <h3 className="renew-title">🔄 Продлить подписку</h3>
                )}

                <div
                    className={`premium-option ${selectedTier === 'monthly' ? 'active' : ''}`}
                    onClick={() => setSelectedTier('monthly')}
                >
                    {discount > 0 && <div className="save-badge discount">-{discount}%</div>}
                    <div className="option-info">
                        <h3>{t('premium.monthly')}</h3>
                        <p>
                            {discount > 0 ? (
                                <>
                                    <span className="old-price">{prices.monthly}</span>
                                    <span> {getDiscountedPrice(prices.monthly)} {t('premium.stars')}</span>
                                </>
                            ) : `${prices.monthly} ${t('premium.stars')}`}
                        </p>
                    </div>
                </div>

                <div
                    className={`premium-option ${selectedTier === 'six_months' ? 'active' : ''}`}
                    onClick={() => setSelectedTier('six_months')}
                >
                    <div className="save-badge">{t('premium.save_22')}</div>
                    {discount > 0 && <div className="save-badge discount secondary">-{discount}% OFF</div>}
                    <div className="option-info">
                        <h3>{t('premium.six_months')}</h3>
                        <p>
                            {discount > 0 ? (
                                <>
                                    <span className="old-price">{prices.six_months}</span>
                                    <span> {getDiscountedPrice(prices.six_months)} {t('premium.stars')}</span>
                                </>
                            ) : `${prices.six_months} ${t('premium.stars')}`}
                        </p>
                    </div>
                </div>

                <div
                    className={`premium-option ${selectedTier === 'yearly' ? 'active' : ''}`}
                    onClick={() => setSelectedTier('yearly')}
                >
                    <div className="save-badge">{t('premium.save_45')}</div>
                    {discount > 0 && <div className="save-badge discount secondary">-{discount}% OFF</div>}
                    <div className="option-info">
                        <h3>{t('premium.yearly')}</h3>
                        <p>
                            {discount > 0 ? (
                                <>
                                    <span className="old-price">{prices.yearly}</span>
                                    <span> {getDiscountedPrice(prices.yearly)} {t('premium.stars')}</span>
                                </>
                            ) : `${prices.yearly} ${t('premium.stars')}`}
                        </p>
                    </div>
                </div>

                <button
                    className="btn btn-primary purchase-btn"
                    onClick={handlePurchase}
                    disabled={purchaseLoading}
                >
                    {purchaseLoading ? t('app.loading') : (premiumStatus.isPremium ? '🔄 Продлить подписку' : t('premium.get_plus'))}
                </button>
            </div>

            <footer className="payment-footer">
                <p>Secure payment via Telegram Stars <span className="star-icon">⭐️</span></p>
            </footer>
        </div>
    );
};

export default PremiumPage;
