const { ImportantDate } = require('../models');
const { Op } = require('sequelize');

class DateService {
    /**
     * Create new important date
     */
    async createDate(pairId, data) {
        const date = await ImportantDate.create({
            pairId,
            title: data.title,
            description: data.description,
            eventDate: data.eventDate,
            category: data.category || 'custom',
            reminderDays: data.reminderDays || 1,
            isRecurring: data.isRecurring !== false,
        });

        return date;
    }

    /**
     * Get all dates for pair
     */
    async getDates(pairId) {
        const dates = await ImportantDate.findAll({
            where: { pairId },
            order: [['eventDate', 'ASC']],
        });

        // Calculate days until each date
        return dates.map(date => this.enrichDateWithCountdown(date));
    }

    /**
     * Get upcoming dates (next 30 days)
     */
    async getUpcomingDates(pairId) {
        const today = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);

        const dates = await ImportantDate.findAll({
            where: {
                pairId,
                eventDate: {
                    [Op.between]: [today.toISOString().split('T')[0], thirtyDaysLater.toISOString().split('T')[0]],
                },
            },
            order: [['eventDate', 'ASC']],
        });

        return dates.map(date => this.enrichDateWithCountdown(date));
    }

    /**
     * Update date
     */
    async updateDate(dateId, pairId, data) {
        const date = await ImportantDate.findOne({
            where: { id: dateId, pairId },
        });

        if (!date) {
            return { error: 'Date not found' };
        }

        await date.update(data);
        return { date };
    }

    /**
     * Delete date
     */
    async deleteDate(dateId, pairId) {
        const result = await ImportantDate.destroy({
            where: { id: dateId, pairId },
        });

        return { deleted: result > 0 };
    }

    /**
     * Get dates that need reminders today
     */
    async getDatesNeedingReminders() {
        const today = new Date().toISOString().split('T')[0];

        const dates = await ImportantDate.findAll({
            where: {
                [Op.or]: [
                    // Direct reminder days calculation
                    require('sequelize').literal(
                        `DATE(event_date) - INTERVAL '1 day' * reminder_days = '${today}'`
                    ),
                ],
            },
        });

        return dates;
    }

    /**
     * Add countdown info to date
     */
    enrichDateWithCountdown(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const eventDate = new Date(date.eventDate);
        eventDate.setHours(0, 0, 0, 0);

        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            ...date.toJSON(),
            daysUntil: diffDays,
            isToday: diffDays === 0,
            isPast: diffDays < 0,
        };
    }
}

module.exports = new DateService();
