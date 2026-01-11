const { WishCard, WishSwipe, WishMatch } = require('../models');
const { Op } = require('sequelize');

class WishService {
    /**
     * Get available cards for user (not yet swiped)
     */
    async getAvailableCards(userId, pairId, category = null, limit = 10) {
        // Get already swiped card IDs
        const swipedCards = await WishSwipe.findAll({
            where: { userId },
            attributes: ['cardId'],
        });
        const swipedIds = swipedCards.map(s => s.cardId);

        // Build query
        const where = {
            isPremium: false, // Only free cards in MVP
        };

        if (swipedIds.length > 0) {
            where.id = { [Op.notIn]: swipedIds };
        }

        if (category) {
            where.category = category;
        }

        const cards = await WishCard.findAll({
            where,
            order: [['sortOrder', 'ASC'], ['id', 'ASC']],
            limit,
        });

        return cards;
    }

    /**
     * Swipe on a card
     * Returns: { swipe, match } if matched
     */
    async swipeCard(userId, pairId, cardId, liked) {
        // Check if already swiped
        const existing = await WishSwipe.findOne({
            where: { userId, cardId },
        });

        if (existing) {
            return { error: 'Already swiped this card' };
        }

        // Create swipe
        const swipe = await WishSwipe.create({
            userId,
            pairId,
            cardId,
            liked,
        });

        // Check for match if liked
        if (liked) {
            const match = await this.checkForMatch(pairId, cardId, userId);
            if (match) {
                return { swipe, match, isNewMatch: true };
            }
        }

        return { swipe, match: null };
    }

    /**
     * Check if partner also liked this card
     */
    async checkForMatch(pairId, cardId, userId) {
        // Get partner's swipe on same card
        const partnerSwipe = await WishSwipe.findOne({
            where: {
                pairId,
                cardId,
                liked: true,
                userId: { [Op.ne]: userId },
            },
        });

        if (!partnerSwipe) {
            return null;
        }

        // Check if match already exists
        const existingMatch = await WishMatch.findOne({
            where: { pairId, cardId },
        });

        if (existingMatch) {
            return existingMatch;
        }

        // Create new match
        const match = await WishMatch.create({
            pairId,
            cardId,
        });

        return match;
    }

    /**
     * Get all matches for pair
     */
    async getMatches(pairId) {
        const matches = await WishMatch.findAll({
            where: { pairId },
            include: [{ model: WishCard }],
            order: [['matchedAt', 'DESC']],
        });

        return matches;
    }

    /**
     * Mark match as completed
     */
    async completeMatch(matchId, pairId) {
        const match = await WishMatch.findOne({
            where: { id: matchId, pairId },
        });

        if (!match) {
            return { error: 'Match not found' };
        }

        await match.update({
            isCompleted: true,
            completedAt: new Date(),
        });

        return { match };
    }

    /**
     * Get swipe statistics
     */
    async getStats(userId, pairId) {
        const totalSwiped = await WishSwipe.count({ where: { userId } });
        const liked = await WishSwipe.count({ where: { userId, liked: true } });
        const matches = await WishMatch.count({ where: { pairId } });
        const completed = await WishMatch.count({ where: { pairId, isCompleted: true } });

        return {
            totalSwiped,
            liked,
            matches,
            completed,
        };
    }
}

module.exports = new WishService();
