import { useState, useCallback } from 'react';

/**
 * Custom hook for Telegram WebApp functionality
 */
export function useTelegram() {
    const webapp = window.Telegram?.WebApp;

    const user = webapp?.initDataUnsafe?.user;
    const initData = webapp?.initData;
    const colorScheme = webapp?.colorScheme || 'dark';
    const themeParams = webapp?.themeParams || {};

    // Haptic feedback
    const haptic = useCallback((type = 'impact') => {
        try {
            if (type === 'impact') {
                webapp?.HapticFeedback?.impactOccurred('medium');
            } else if (type === 'notification') {
                webapp?.HapticFeedback?.notificationOccurred('success');
            } else if (type === 'selection') {
                webapp?.HapticFeedback?.selectionChanged();
            }
        } catch (e) {
            console.log('Haptic not available');
        }
    }, [webapp]);

    // Show popup
    const showPopup = useCallback((params) => {
        return new Promise((resolve) => {
            webapp?.showPopup(params, resolve);
        });
    }, [webapp]);

    // Show alert
    const showAlert = useCallback((message) => {
        return new Promise((resolve) => {
            webapp?.showAlert(message, resolve);
        });
    }, [webapp]);

    // Close webapp
    const close = useCallback(() => {
        webapp?.close();
    }, [webapp]);

    // Expand webapp
    const expand = useCallback(() => {
        webapp?.expand();
    }, [webapp]);

    // Ready
    const ready = useCallback(() => {
        webapp?.ready();
    }, [webapp]);

    // Main button
    const setMainButton = useCallback((text, onClick, color = null) => {
        if (!webapp?.MainButton) return;

        webapp.MainButton.setText(text);
        webapp.MainButton.onClick(onClick);

        if (color) {
            webapp.MainButton.setParams({ color });
        }

        webapp.MainButton.show();
    }, [webapp]);

    const hideMainButton = useCallback(() => {
        webapp?.MainButton?.hide();
    }, [webapp]);

    return {
        webapp,
        user,
        initData,
        colorScheme,
        themeParams,
        haptic,
        showPopup,
        showAlert,
        close,
        expand,
        ready,
        setMainButton,
        hideMainButton,
        isAvailable: !!webapp,
    };
}

/**
 * Custom hook for managing app state
 */
export function useAppState() {
    const [user, setUser] = useState(null);
    const [pair, setPair] = useState(null);
    const [partner, setPartner] = useState(null);
    const [streak, setStreak] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    return {
        user,
        setUser,
        pair,
        setPair,
        partner,
        setPartner,
        streak,
        setStreak,
        loading,
        setLoading,
        error,
        setError,
        isPaired: !!pair?.isComplete,
    };
}
