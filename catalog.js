/**
 * Catalog of your resources with Subcategory support.
 */
const catalog = {
    tutorials: {
        title: '🎓 Video Tutorials',
        subcategories: {
            pc_fixes: {
                title: '🖨️ Printer & PC Fixes',
                items: [
                    {
                        id: 'fix_printer',
                        name: 'How to fix printer',
                        description: 'Universal guide to fixing common printer connectivity issues.',
                        url: 'https://drive.google.com/YOUR_VIDEO_1'
                    },
                    {
                        id: 'setup_pc',
                        name: 'Setup PC for Design',
                        description: 'How to optimize your Windows setup for graphic design.',
                        url: 'https://drive.google.com/YOUR_VIDEO_2'
                    }
                ]
            },
            telegram_tips: {
                title: '📱 Telegram Masterclass',
                items: [
                    {
                        id: 'change_font_tg',
                        name: 'Change font in Telegram',
                        description: 'Learn how to use custom fonts and styles in your Telegram messages.',
                        url: 'https://drive.google.com/YOUR_VIDEO_3'
                    }
                ]
            }
        }
    },
    resources: {
        title: '🎨 Graphics & Files',
        items: [
            {
                id: 'ai_template',
                name: 'Illustrator Source File',
                description: 'Professional AI template for your projects.',
                url: 'https://drive.google.com/drive/folders/1LbU-SPy5mM-ObqAAZgq9R5iupRsfgGIW?usp=sharing'
            }
        ]
    }
};

module.exports = catalog;
