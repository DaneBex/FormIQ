import Anthropic from '@anthropic-ai/sdk';
import Constants from 'expo-constants';

const apiKey = Constants.expoConfig?.extra?.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? '';

const client = new Anthropic({ apiKey });

export async function getCoachingFeedback(prompt: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== 'text') return '';
  return block.text;
}
