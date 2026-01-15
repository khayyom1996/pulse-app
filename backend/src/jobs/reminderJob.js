const cron = require('node-cron');
const { ImportantDate, User, Pair } = require('../models');
const { bot } = require('../bot');
const { Op } = require('sequelize');

/**
 * Job to send reminders for upcoming dates to premium users
 * Runs every day at 9:00 AM
 */
const startReminderJob = () => {
    // Run every day at 09:00
    cron.schedule('0 9 * * *', async () => {
        console.log('⏰ Running daily reminder job...');

        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            // Find all dates occurring tomorrow
            const upcomingDates = await ImportantDate.findAll({
                where: {
                    eventDate: tomorrowStr,
                },
                include: [
                    {
                        model: Pair,
                        include: [
                            { model: User, as: 'user1' },
                            { model: User, as: 'user2' }
                        ]
                    }
                ]
            });

            console.log(`Found ${upcomingDates.length} upcoming dates for tomorrow.`);

            for (const date of upcomingDates) {
                const pair = date.Pair;
                if (!pair) continue;

                // Check premium status for both users
                const users = [pair.user1, pair.user2].filter(u => u && u.isPremium);

                for (const user of users) {
                    // Check if this date should be visible to this user
                    if (date.visibility === 'private' && date.createdBy !== user.id) {
                        continue;
                    }

                    try {
                        const message = `🔔 *Напоминание о завтрашнем событии:*

✨ *${date.title}*
📅 Дата: завтра, ${new Date(date.eventDate).toLocaleDateString('ru-RU')}
${date.description ? `\n📝 _${date.description}_` : ''}

Не забудьте подготовиться! 💕`;

                        await bot.telegram.sendMessage(user.chatId || user.id, message, {
                            parse_mode: 'Markdown'
                        });
                        console.log(`Sent reminder to user ${user.id} for date ${date.id}`);
                    } catch (err) {
                        console.error(`Failed to send reminder to user ${user.id}:`, err.message);
                    }
                }
            }
        } catch (error) {
            console.error('Reminder job error:', error);
        }
    });

    console.log('🚀 Reminder job scheduled (09:00 daily)');
};

module.exports = { startReminderJob };
