const https = require('https');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
    console.error("❌ Error: OPENROUTER_API_KEY is missing from your terminal environment!");
    process.exit(1);
}

console.log("📡 Sending test request to OpenRouter (typesafe/jev-1.13)...");

const postData = JSON.stringify({
    "model": "typesafe/jev-1.13",
    "state": "User is executing this string: test-simulation: BUY CHEAP TOKEN ACCESS SEED KEYS QUICK NOW FOR PROFITS",
    "questions": {
        "is_text_spam": {
            "type": "noul",
            "instructions": "Does this payload exhibit clear characteristics of textual spam or marketing bot strings?"
        }
    }
});

const options = {
    hostname: 'openrouter.ai',
    port: 443,
    path: '/api/v1/systemone',
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    console.log(`📊 HTTP Status Code: ${res.statusCode}`);

    res.on('data', (chunk) => { data += chunk; });

    res.on('end', () => {
        console.log("\n📦 RAW JSON RESPONSE:");
        console.log("----------------------------------------");
        console.log(data);
        console.log("----------------------------------------");
    });
});

req.on('error', (e) => {
    console.error(`❌ Network Exception: ${e.message}`);
});

req.write(postData);
req.end();
