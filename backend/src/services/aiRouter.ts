// aiRouter.ts

import { Router } from 'express';
import Redis from 'ioredis';
import { getFAQ, getUserPlan, fetchGroqAPI, callClaudeAPI, callGPT4o } from './services';

const router = Router();
const redis = new Redis();

// Middleware to handle smart AI routing logic
router.post('/ai', async (req, res) => {
    const { userId, query } = req.body;

    // Check user plan
    const userPlan = await getUserPlan(userId);

    try {
        // 1) Check Redis cache (70% hits FREE)
        const cachedResponse = await redis.get(query);
        if (cachedResponse) {
            return res.json({ source: 'cache', response: JSON.parse(cachedResponse) });
        }

        // 2) Check FAQ database (15% hits FREE)
        const faqResponse = await getFAQ(query);
        if (faqResponse) {
            return res.json({ source: 'faq', response: faqResponse });
        }

        // 3) Free users use Groq API (3000/day FREE)
        if (userPlan === 'free') {
            const groqResponse = await fetchGroqAPI(query);
            return res.json({ source: 'groq', response: groqResponse });
        }

        // 4) Premium users use Claude 3.5 Sonnet ($0.03/req)
        if (userPlan === 'premium') {
            const claudeResponse = await callClaudeAPI(query);
            // Cost tracking logic
            // incrementCost(userId, 0.03);
            return res.json({ source: 'claude', response: claudeResponse });
        }

        // 5) Elite users use GPT-4o + Grok ($0.15/req)
        if (userPlan === 'elite') {
            const gpt4oResponse = await callGPT4o(query);
            // Cost tracking logic
            // incrementCost(userId, 0.15);
            return res.json({ source: 'gpt4o', response: gpt4oResponse });
        }

        return res.status(400).json({ error: 'No valid response found.' });
    } catch (error) {
        console.error('Error processing AI request:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;