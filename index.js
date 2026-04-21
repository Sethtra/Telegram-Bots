const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const { Redis } = require('@upstash/redis');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const catalog = require('./catalog');

// 1. Initialize Redis (Upstash)
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 2. Initialize Bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// 3. Initialize Express (Manager & Redirector)
const app = express();
const PORT = process.env.PORT || 3000;

/**
 * UI: Main Menu Generator
 */
const mainMenuKeyboard = () => {
    const buttons = Object.keys(catalog).map(key => 
        [Markup.button.callback(catalog[key].title, `cat_${key}`)]
    );
    return Markup.inlineKeyboard(buttons);
};

// --- TELEGRAM BOT LOGIC ---

bot.start((ctx) => {
    ctx.replyWithHTML(
        '<b>🔥 Welcome to T-Bot Premium Hub</b>\n\n' +
        'Select a category to get your 24/7 self-destructing links.\n' +
        '<i>All links expire automatically after 5 minutes.</i>',
        mainMenuKeyboard()
    );
});

bot.action(/^cat_(.+)$/, async (ctx) => {
    const categoryKey = ctx.match[1];
    const category = catalog[categoryKey];
    if (!category) return ctx.answerCbQuery('Category not found!');

    const buttons = category.items.map(item => [
        Markup.button.callback(`🔹 ${item.name}`, `item_${categoryKey}_${item.id}`)
    ]);
    buttons.push([Markup.button.callback('⬅️ Back', 'main_menu')]);

    await ctx.editMessageText(`<b>${category.title}</b>\nChoose an item:`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
    });
});

bot.action(/^item_(.+)_(.+)$/, async (ctx) => {
    const categoryKey = ctx.match[1];
    const itemId = ctx.match[2];
    const item = catalog[categoryKey]?.items.find(i => i.id === itemId);
    if (!item) return ctx.answerCbQuery('Item not found!');

    await ctx.editMessageText(
        `<b>📦 ${item.name}</b>\n\n${item.description}\n\n` +
        `⚠️ <i>The generated link will be unique and valid for 5 minutes only.</i>`,
        Markup.inlineKeyboard([
            [Markup.button.callback('🚀 Generate Fresh Link', `link_${categoryKey}_${itemId}`)],
            [Markup.button.callback('⬅️ Back', `cat_${categoryKey}`)]
        ])
    );
});

bot.action(/^link_(.+)_(.+)$/, async (ctx) => {
    const categoryKey = ctx.match[1];
    const itemId = ctx.match[2];
    const item = catalog[categoryKey]?.items.find(i => i.id === itemId);
    if (!item) return ctx.answerCbQuery('Item not found!');

    await ctx.answerCbQuery('Generating unique secure link...');

    // A. Generate Unique Token
    const token = uuidv4();
    
    // B. Store in Redis with 5-minute expiry (300 seconds)
    await redis.set(token, item.url, { ex: 300 });

    // C. Construct the Bouncer URL
    const bouncerUrl = `${process.env.BASE_URL}/dl/${token}`;

    const sentMessage = await ctx.replyWithHTML(
        `<b>✅ Link Generated!</b>\n\n` +
        `<code>${item.name}</code>\n\n` +
        `This link is unique to you and expires in <b>5 minutes</b>.`,
        Markup.inlineKeyboard([
            [Markup.button.url('⬇️ Download Now', bouncerUrl)]
        ])
    );

    // Auto-delete message from Telegram after 5 mins (Bonus UI/UX)
    setTimeout(() => {
        ctx.telegram.deleteMessage(ctx.chat.id, sentMessage.message_id).catch(() => {});
    }, 300000);
});

bot.action('main_menu', async (ctx) => {
    await ctx.editMessageText('<b>Select a category:</b>', {
        parse_mode: 'HTML',
        ...mainMenuKeyboard()
    });
});

// --- EXPRESS REDIRECTOR LOGIC ---

// Health check for Cron-job.org / Render
app.get('/health', (req, res) => res.send('Bot is Alive!'));

// The actual Bouncer route
app.get('/dl/:token', async (req, res) => {
    const { token } = req.params;
    
    // 1. Fetch real URL from Redis
    const realUrl = await redis.get(token);

    if (realUrl) {
        // 2. Redirect to Google Drive
        console.log(`[Bouncer] Redirecting token ${token} to file.`);
        res.redirect(realUrl);
    } else {
        // 3. Expired or invalid
        res.status(410).send(
            '<h1>⚠️ Link Expired</h1>' +
            '<p>This download link has expired. Please go back to the Telegram bot and generate a fresh one.</p>'
        );
    }
});

// 4. Start the Engines
app.listen(PORT, () => {
    console.log(`Bouncer Server running on port ${PORT}`);
});

bot.launch().then(() => console.log('Telegram Bot is running...'));

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));