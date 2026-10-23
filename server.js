const express = require('express');
const spamFilter = require('./middleware/spamFilter');

const app = express();
const PORT = 3000;

// Middleware to parse incoming JSON request payloads
app.use(express.json());

// Wire up your Jev AI spam filter middleware to protect the /webhook route
app.use('/webhook', spamFilter({ maxLinks: 2 }));

// A simple mock route handler for successful requests
app.post('/webhook', (req, res) => {
    const category = req.webhookCategory;

    // Use a clean switch control flow structure to run targeted code scripts
    switch (category) {
        case 'billing':
            return res.json({
                success: true,
                processedBy: "Financial Account Ledger Database Pipeline"
            });

        case 'security_alerts':
            return res.json({
                success: true,
                processedBy: "Ops Critical Infosec Monitoring Core"
            });

        case 'customer_support':
            return res.json({
                success: true,
                processedBy: "ZenDesk Ticket Synchronization Framework"
            });

        default:
            return res.json({
                success: true,
                processedBy: "Standard Uncategorized Data Storage Buffer",
                debugCategoryReceived: category // Debug helper to trace values
            });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
    console.log(`🔒 Jev AI Spam Filter Guard is ACTIVE on /webhook`);
});
