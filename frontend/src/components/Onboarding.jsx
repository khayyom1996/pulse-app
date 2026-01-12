import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import './Onboarding.css';

const slides = [
    {
        image: '/images/onboarding_love.png',
        titleKey: 'onboarding.slide1_title',
        descKey: 'onboarding.slide1_desc',
    },
    {
        image: '/images/onboarding_dates.png',
        titleKey: 'onboarding.slide2_title',
        descKey: 'onboarding.slide2_desc',
    },
    {
        image: '/images/onboarding_wishes.png',
        titleKey: 'onboarding.slide3_title',
        descKey: 'onboarding.slide3_desc',
    },
    {
        image: '/images/onboarding_tree.png',
        titleKey: 'onboarding.slide4_title',
        descKey: 'onboarding.slide4_desc',
    },
];

export default function Onboarding({ onComplete }) {
    const { t } = useTranslation();
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            localStorage.setItem('pulse_onboarding_done', 'true');
            onComplete();
        }
    };

    const handleSkip = () => {
        localStorage.setItem('pulse_onboarding_done', 'true');
        onComplete();
    };

    const slide = slides[currentSlide];
    const isLastSlide = currentSlide === slides.length - 1;

    return (
        <div className="onboarding">
            <button className="onboarding-skip" onClick={handleSkip}>
                {t('onboarding.skip')}
            </button>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentSlide}
                    className="onboarding-slide"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="onboarding-image">
                        <img src={slide.image} alt="" />
                    </div>
                    <div className="onboarding-content">
                        <h2>{t(slide.titleKey)}</h2>
                        <p>{t(slide.descKey)}</p>
                    </div>
                </motion.div>
            </AnimatePresence>

            <div className="onboarding-footer">
                <div className="onboarding-dots">
                    {slides.map((_, index) => (
                        <span
                            key={index}
                            className={`dot ${index === currentSlide ? 'active' : ''}`}
                            onClick={() => setCurrentSlide(index)}
                        />
                    ))}
                </div>
                <button className="btn btn-primary onboarding-btn" onClick={handleNext}>
                    {isLastSlide ? t('onboarding.start') : t('onboarding.next')}
                </button>
            </div>
        </div>
    );
}
