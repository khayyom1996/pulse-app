const { Telegraf, Markup } = require('telegraf');
const config = require('../config');
const authService = require('../services/authService');
const { User, Pair, LoveClick } = require('../models');

const bot = new Telegraf(config.telegramBotToken);

// Start command - register user and show main menu
bot.command('start', async (ctx) => {
    try {
        const telegramUser = ctx.from;
        const user = await authService.getOrCreateUser(telegramUser);
        const pair = await authService.getUserPair(user.id);

        // Check for deep link (invite code)
        const startPayload = ctx.message.text.split(' ')[1];
        if (startPayload && startPayload.startsWith('invite_')) {
            const inviteCode = startPayload.replace('invite_', '');
            const result = await authService.joinPair(user.id, inviteCode);

            if (result.error) {
                await ctx.reply(`❌ ${result.error}`);
            } else {
                await ctx.reply(
                    '💕 Вы успешно связаны с партнером!\n\nТеперь вы можете отправлять друг другу любовь через приложение.',
                    getMainKeyboard(true)
                );

                // Notify partner
                const partnerId = result.pair.user1Id;
                try {
                    await bot.telegram.sendMessage(
                        partnerId,
                        `💕 ${user.firstName || 'Ваш партнер'} присоединился к вам в Pulse!\n\nОткройте приложение, чтобы начать.`,
                        getMainKeyboard(true)
                    );
                } catch (e) {
                    console.error('Could not notify partner:', e.message);
                }
                return;
            }
        }

        // Regular start
        const welcomeMessage = pair && pair.user2Id
            ? `Привет, ${user.firstName || 'друг'}! 💕\n\nВы связаны с ${pair.user2?.firstName || pair.user1?.firstName || 'партнером'}.\n\n🌳 Ваш прогресс: ${pair.TreeStreak?.currentStreak || 0} дней`
            : `Добро пожаловать в Pulse! 💕\n\nЭто приложение для укрепления отношений с вашей половинкой.\n\n${pair ? `📎 Ваш код приглашения: ${pair.inviteCode}` : 'Создайте пару, чтобы начать!'}`;

        await ctx.reply(welcomeMessage, getMainKeyboard(!!pair?.user2Id));
    } catch (error) {
        console.error('Start command error:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Link command - create or get invite link
bot.command('link', async (ctx) => {
    try {
        const telegramUser = ctx.from;
        const user = await authService.getOrCreateUser(telegramUser);
        const { pair, isNew } = await authService.createPair(user.id);

        if (pair.user2Id) {
            await ctx.reply('💕 Вы уже связаны с партнером!');
            return;
        }

        const inviteLink = `https://t.me/${config.botUsername}?start=invite_${pair.inviteCode}`;

        await ctx.reply(
            `📎 Отправьте эту ссылку вашему партнеру:\n\n${inviteLink}\n\nИли код: ${pair.inviteCode}`,
            Markup.inlineKeyboard([
                Markup.button.url('Поделиться', `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Присоединяйся ко мне в Pulse! 💕')}`),
            ])
        );
    } catch (error) {
        console.error('Link command error:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Unlink command - disconnect pair
bot.command('unlink', async (ctx) => {
    try {
        const user = await authService.getOrCreateUser(ctx.from);
        const pair = await authService.getUserPair(user.id);

        if (!pair) {
            await ctx.reply('Вы не связаны с партнером.');
            return;
        }

        await ctx.reply(
            '⚠️ Вы уверены, что хотите разорвать связь?\n\nЭто действие нельзя отменить.',
            Markup.inlineKeyboard([
                Markup.button.callback('❌ Да, разорвать', 'confirm_unlink'),
                Markup.button.callback('💕 Нет, остаться', 'cancel_unlink'),
            ])
        );
    } catch (error) {
        console.error('Unlink command error:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Callback: confirm unlink
bot.action('confirm_unlink', async (ctx) => {
    try {
        const user = await User.findByPk(ctx.from.id);
        const pair = await authService.getUserPair(user.id);

        if (pair) {
            await pair.update({ isActive: false });
        }

        await ctx.editMessageText('Связь разорвана. Используйте /link для создания новой пары.');
    } catch (error) {
        console.error('Confirm unlink error:', error);
        await ctx.reply('Произошла ошибка.');
    }
});

// Callback: cancel unlink
bot.action('cancel_unlink', async (ctx) => {
    await ctx.editMessageText('💕 Отлично! Ваша связь сохранена.');
});

// Send love notification to partner (called from API)
async function sendLoveNotification(receiverId, senderName, message = null) {
    try {
        const text = message
            ? `💕 ${senderName} отправил вам любовь:\n\n"${message}"`
            : `💕 ${senderName} думает о вас и отправляет любовь!`;

        await bot.telegram.sendMessage(receiverId, text, {
            reply_markup: {
                inline_keyboard: [[
                    { text: '💕 Открыть Pulse', web_app: { url: config.webappUrl } },
                ]],
            },
        });
        return true;
    } catch (error) {
        console.error('Send notification error:', error.message);
        return false;
    }
}

// Main keyboard helper
function getMainKeyboard(isPaired = false) {
    return Markup.keyboard([
        [Markup.button.webApp('💕 Открыть Pulse', config.webappUrl)],
        [isPaired ? '/link' : '/link - Пригласить'],
    ]).resize();
}

module.exports = { bot, sendLoveNotification };
