import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTelegram } from './hooks/useTelegram';
import Navigation from './components/Navigation';
import Onboarding from './components/Onboarding';
import HomePage from './pages/HomePage';
import DatesPage from './pages/DatesPage';
import WishesPage from './pages/WishesPage';

export default function App() {
    const { ready, expand } = useTelegram();
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        // Initialize Telegram WebApp
        ready();
        expand();

        // Check if onboarding was completed
        const onboardingDone = localStorage.getItem('pulse_onboarding_done');
        if (!onboardingDone) {
            setShowOnboarding(true);
        }
    }, [ready, expand]);

    if (showOnboarding) {
        return <Onboarding onComplete={() => setShowOnboarding(false)} />;
    }

    return (
        <BrowserRouter>
            <div className="app">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/dates" element={<DatesPage />} />
                    <Route path="/wishes" element={<WishesPage />} />
                </Routes>
                <Navigation />
            </div>
        </BrowserRouter>
    );
}
