/**
 * Catalog of your 2TB Google Drive links.
 * Each item has a name, description, and the direct Google Drive URL.
 */
const catalog = {
    tutorials: {
        title: '🎓 Video Tutorials',
        items: [
            {
                id: 'setup_pc',
                name: 'Setup PC for Design',
                description: 'How to optimize your Windows setup for graphic design.',
                url: 'https://drive.google.com/YOUR_FILE_LINK_1'
            },
            {
                id: 'download_fonts',
                name: 'How to Install Fonts',
                description: 'Step-by-step guide to installing fonts on PC/Mac.',
                url: 'https://drive.google.com/YOUR_FILE_LINK_2'
            }
        ]
    },
    resources: {
        title: '🎨 Graphics & Files',
        items: [
            {
                id: 'ai_template',
                name: '.ai Source File',
                description: 'Professional AI template for your projects.',
                url: 'https://drive.google.com/YOUR_FILE_LINK_3'
            }
        ]
    }
};

module.exports = catalog;
