import axios from 'axios';
import { config } from '../config/config';
import logger from '../utils/logger';
import { newsKeywords } from './newsKeywords';

type Sentiment = 'Positive' | 'Negative' | 'Neutral';

interface NewsPost {
    title: string;
    [key: string]: any;
}

interface SentimentResult {
    sentiment: Sentiment;
    titles: string[];
    confidence: number;
}

let cache: { data: SentimentResult; timestamp: number } | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function normalizeText(text: string): string {
    return text.toLowerCase().replace(/[^\w\s]/gi, '').trim();
}

function countMatches(titles: string[], keywords: string[]): number {
    const regexes = keywords.map(k => new RegExp(`\\b${k}\\b`, 'i'));
    return titles.reduce((count, title) => {
        const normalized = normalizeText(title);
        return regexes.some(regex => regex.test(normalized)) ? count + 1 : count;
    }, 0);
}

function determineSentiment(positive: number, negative: number): Sentiment {
    if (positive > negative) return 'Positive';
    if (negative > positive) return 'Negative';
    return 'Neutral';
}

export async function fetchNewsSentiment(): Promise<SentimentResult> {
    const now = Date.now();

    // ✅ Serve from cache if not expired
    if (cache && now - cache.timestamp < CACHE_DURATION_MS) {
        logger.info('Serving news sentiment from cache');
        return cache.data;
    }

    try {
        const { data } = await axios.get(`https://cryptopanic.com/api/v1/posts/`, {
            params: {
                auth_token: config.cryptopanic.apiKey,
                kind: 'news',
            },
        });

        const posts: NewsPost[] = (data?.results || []).filter((post: any) =>
            post.title?.toLowerCase().includes('btc') || post.title?.toLowerCase().includes('bitcoin')
        );

        const titles = posts.map(post => post.title);
        const positiveCount = countMatches(titles, newsKeywords.positive);
        const negativeCount = countMatches(titles, newsKeywords.negative);
        const sentiment = determineSentiment(positiveCount, negativeCount);

        const total = positiveCount + negativeCount;
        const confidence = total > 0 ? (positiveCount - negativeCount) / total : 0;

        const result: SentimentResult = { sentiment, titles, confidence: Number(confidence.toFixed(2)) };

        logger.info(`News sentiment: ${sentiment} | Confidence: ${result.confidence} | Titles analyzed: ${titles.length}`);

        // 🔁 Update cache
        cache = { data: result, timestamp: now };

        return result;
    } catch (error) {
        logger.error(`Error fetching news sentiment: ${error instanceof Error ? error.message : String(error)}`);
        throw new Error('Failed to fetch and analyze news sentiment');
    }
}
