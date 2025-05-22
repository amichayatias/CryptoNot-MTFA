import axios from 'axios';
import { config } from '../config/config';
import logger from '../utils/logger';

const POSITIVE_KEYWORDS = ['bullish', 'approved', 'adoption', 'partnership', 'upgrade'];
const NEGATIVE_KEYWORDS = ['bearish', 'hack', 'ban', 'regulation', 'crash'];

export async function fetchNewsSentiment(): Promise<{ sentiment: 'Positive' | 'Negative' | 'Neutral'; titles: string[] }> {
  try {
    const response = await axios.get(`https://cryptopanic.com/api/v1/posts/?auth_token=${config.cryptopanic.apiKey}&kind=news`);
    const posts = response.data.results.filter((post: any) => post.title.toLowerCase().includes('btc') || post.title.toLowerCase().includes('bitcoin'));
    const titles = posts.map((post: any) => post.title);

    let positiveCount = 0;
    let negativeCount = 0;

    titles.forEach((title: string) => {
      const lowerTitle = title.toLowerCase();
      if (POSITIVE_KEYWORDS.some(keyword => lowerTitle.includes(keyword))) positiveCount++;
      if (NEGATIVE_KEYWORDS.some(keyword => lowerTitle.includes(keyword))) negativeCount++;
    });

    const sentiment = positiveCount > negativeCount ? 'Positive' : negativeCount > positiveCount ? 'Negative' : 'Neutral';
    logger.info(`News sentiment analysis: ${sentiment}, titles=${titles.length}`);
    return { sentiment, titles };
  } catch (error) {
    logger.error(`Failed to fetch news: ${error}`);
    throw error;
  }
}