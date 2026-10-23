const https = require('https');

module.exports = function spamFilterMiddleware(options = {}) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const maxLinks = options.maxLinks || 2;

    return async (req, res, next) => {
        try {
            const payloadString = typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body || '');

            if (!payloadString || payloadString === '{}') {
                return next();
            }

            // 1. Local link guardrail check
            const urlCount = (payloadString.match(/https?:\/\/[^\s]+/g) || []).length;
            if (urlCount > maxLinks) {
                console.log(`[Jev Filter] 🛑 Blocked by Local rule (Links: ${urlCount}/${maxLinks})`);
                return res.status(422).json({
                    error: "Unprocessable Content",
                    message: `Rejected: Payload contains ${urlCount} links, exceeding the max limit of ${maxLinks}.`
                });
            }

            if (!OPENROUTER_API_KEY) {
                return next();
            }

            // 2. Fire dual parallel primitives (Noul + Choice) with strict structural criteria blocks
            const responseData = await new Promise((resolve, reject) => {
                const postData = JSON.stringify({
                    "model": "typesafe/jev-1.13",
                    "state": `Incoming webhook data segment: ${payloadString}`,
                    "questions": {
                        "is_text_spam": {
                            "type": "noul",
                            "instructions": "Does this text represent explicit automated spam, advertisement abuse, or bot string flooding?",
                            "criteria": {
                                "true": "The payload contains blatant marketing phrases, repetitive text blocks, or malicious script patterns.",
                                "false": "The payload is a legitimate transactional update or user inquiry."
                            }
                        },
                        "intent_routing": {
                            "type": "choice",
                            "instructions": "Classify the functional engineering department intent of this transaction data segment.",
                            "criteria": {
                                "billing": "The payload contains invoices, receipts, payment gateway status webhooks, or credit card updates.",
                                "security_alerts": "The payload describes access failures, firewall blocks, token anomalies, or system vulnerabilities.",
                                "customer_support": "The text describes generic user complaints, bug reports, feature feedback, or standard operational inquiries."
                            }
                        }
                    }
                });

                const apiOptions = {
                    hostname: 'openrouter.ai',
                    port: 443,
                    path: '/api/v1/systemone',
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    },
                    timeout: 4000
                };

                const apiRequest = https.request(apiOptions, (apiResponse) => {
                    let body = '';
                    apiResponse.on('data', (chunk) => { body += chunk; });
                    apiResponse.on('end', () => {
                        try {
                            resolve(JSON.parse(body));
                        } catch (e) {
                            reject(e);
                        }
                    });
                });

                apiRequest.on('error', (err) => reject(err));
                apiRequest.on('timeout', () => { apiRequest.destroy(); reject(new Error("Timeout")); });

                apiRequest.write(postData);
                apiRequest.end();
            }).catch((err) => {
                console.error(`[Jev Filter] Async Request Exception: ${err.message}`);
                return null;
            });

            // 3. Evaluate Spam Guardrail Block
            const spamProbability = responseData?.answers?.is_text_spam?.noul;
            if (typeof spamProbability === 'number' && spamProbability > 0.75) {
                console.log(`[Jev Filter] 🛑 Blocked by Jev Spam Filter (${Math.round(spamProbability * 100)}%)`);
                return res.status(422).json({
                    error: "Unprocessable Content",
                    message: "Webhook payload processing rejected due to automated spam detection policies."
                });
            }

            // 4. Extract and Assign the Native Choice Routing Attribute
            const intentResponse = responseData?.answers?.intent_routing;

            // OpenRouter maps the selected choice directly to the .choice attribute inside the question key context
            const chosenCategory = intentResponse?.choice;
            const categoryConfidence = typeof intentResponse?.confidence === 'number' ? intentResponse.confidence : 1.0;

            // Inject the string category metadata into the Request object for downstream paths
            req.webhookCategory = chosenCategory || 'generic_queue';

            console.log(`[Jev Router] 🔀 Routed payload to: [${req.webhookCategory}] (Confidence: ${Math.round(categoryConfidence * 100)}%)`);

            return next();
        } catch (error) {
            console.error("❌ [Jev Filter Middleware Exception]:", error);
            return next();
        }
    };
};
