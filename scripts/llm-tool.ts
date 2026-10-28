import { defineTool } from '@nemesis-oss/ollama-sdk';
import type { FormattedMessage } from '../src/index.js';
import {
  advancedMessageSpecSchema,
  buildLlmMessage,
} from './llm-message.js';
import type { SendFormatResult } from './telegram.js';

export interface SendOutcome {
  readonly ok: boolean;
  readonly dryRun: boolean;
  readonly formats: readonly SendFormatResult[];
}

export type SendFormattedMessage = (
  message: FormattedMessage,
) => Promise<SendOutcome>;

const STOP_INSTRUCTION =
  'Do not call send_advanced_message again. Reply with a short confirmation.';

export function createSendAdvancedMessageTool(send: SendFormattedMessage) {
  let sent = false;

  return defineTool({
    name: 'send_advanced_message',
    description:
      'Send one advanced Telegram test message in native entities, HTML, and MarkdownV2. Call this exactly once.',
    schema: advancedMessageSpecSchema,
    execute: async (spec): Promise<string> => {
      if (sent) {
        return `Already sent. ${STOP_INSTRUCTION}`;
      }

      const outcome = await send(buildLlmMessage(spec));
      sent = true;
      const formats = outcome.formats
        .map((result) =>
          result.ok ? result.format : `${result.format} (failed)`,
        )
        .join(', ');
      const status = outcome.ok ? 'succeeded' : 'failed';

      return `Message send ${status} in ${formats}. ${STOP_INSTRUCTION}`;
    },
  });
}
