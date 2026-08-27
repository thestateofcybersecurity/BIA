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

  var _biaAnthropic: Anthropic | undefined;
}

export function getAnthropic(): Anthropic {
  if (!globalThis._biaAnthropic) {
    // A bounded timeout keeps a hung generation from pinning a server-action
    // invocation for the SDK's ~10 minute default; two retries ride through
    // transient provider errors without an app-level retry loop.
    globalThis._biaAnthropic = new Anthropic({ timeout: 90_000, maxRetries: 2 });
  }
  return globalThis._biaAnthropic;
}
