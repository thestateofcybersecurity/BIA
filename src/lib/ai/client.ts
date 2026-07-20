import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude is the AI layer for tabletop exercise generation and after-action
 * reports. Enabled when ANTHROPIC_API_KEY is set; without it the app falls
 * back to the deterministic scenario library and AI features are hidden.
 */

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export const AI_MODEL = 'claude-opus-4-8';

declare global {
  // eslint-disable-next-line no-var
  var _biaAnthropic: Anthropic | undefined;
}

export function getAnthropic(): Anthropic {
  if (!globalThis._biaAnthropic) {
    globalThis._biaAnthropic = new Anthropic();
  }
  return globalThis._biaAnthropic;
}
