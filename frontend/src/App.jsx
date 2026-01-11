import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTelegram } from './hooks/useTelegram';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import DatesPage from './pages/DatesPage';
import WishesPage from './pages/WishesPage';

export default function App() {
    const { ready, expand } = useTelegram();

    useEffect(() => {
        // Initialize Telegram WebApp
        ready();
        expand();
    }, [ready, expand]);

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
