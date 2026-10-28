import { Agent, OllamaClient, ToolRegistry } from '@nemesis-oss/ollama-sdk';
import {
  toTelegramPayload,
  type FormattedMessage,
} from '../src/index.js';
import {
  createSendAdvancedMessageTool,
  type SendOutcome,
} from './llm-tool.js';
import {
  assertPayloadLength,
  sendAllFormats,
  TELEGRAM_FORMATS,
} from './telegram.js';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'minicpm5-toolagent:latest';

const SYSTEM_PROMPT = [
  'You are an integration-test agent for the @nemesis-oss/tg-format library.',
  'Generate original, concise test content and send it by calling send_advanced_message exactly once.',
  'Do not answer with plain text before or instead of the tool call.',
  'After the tool returns, do not call it again; reply with a short confirmation.',
  'The tool renders the message as native Telegram entities, HTML, and MarkdownV2.',
].join(' ');

const USER_PROMPT = [
  'Generate and send an advanced Telegram formatting test message.',
  'Call send_advanced_message exactly once and fill the content fields yourself.',
  'Keep every value within the schema limits. Requirements:',
  '- title: short, mentions LLM and Telegram formatting, max 80 characters',
  '- intro: one or two sentences with a few reserved characters and a Unicode emoji, max 200 characters',
  '- nested_text: one short phrase, max 160 characters, no formatting syntax',
  '- link_label: a short visible label with parentheses and an ampersand, max 60 characters, no URL',
  '- inline_code: a short snippet with a backtick and a backslash, max 80 characters',
  '- code: two to five lines of TypeScript with a template literal or regex using a backtick, max 400 characters, no Markdown fences',
  '- code_language: "ts"',
  '- quote: two or three plain-text lines about why Telegram formatting matters, max 300 characters',
  '- expandable_quote: exactly six short plain-text lines using real newline characters, not literal \\n, max 600 characters',
  'You can omit link_url, date_label, unix_time, and date_format; the tool supplies deterministic defaults.',
  'Do not use HTML tags or Markdown formatting in prose fields.',
  'Do not ask questions. Make the tool call now.',
].join('\n');

const credentials = resolveCredentials();
const dryRun = credentials === undefined;
const client = new OllamaClient({
  baseUrl: process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL,
});
let outcome: SendOutcome | undefined;

if (dryRun) {
  console.warn(
    'No BOT_TOKEN/CHAT_ID or DRY_RUN=1: rendering without sending.',
  );
}

try {
  await runCheck();
} catch (error) {
  console.error('\nLLM check failed:', error);
  process.exitCode = 1;
} finally {
  client.destroy();
}

async function runCheck(): Promise<void> {
  const model = process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;
  const tool = createSendAdvancedMessageTool(sendMessage);
  const agent = new Agent(client, {
    tools: new ToolRegistry({
      tools: [tool],
      onError: formatToolError,
    }),
    maxIterations: 4,
    maxToolCalls: 3,
    maxRepeatedToolCalls: 2,
    hooks: {
      onToolCallStart: (call) => {
        console.log(`\n[tool] ${call.function.name}`);
        console.log(JSON.stringify(call.function.arguments, null, 2));
      },
      onToolCallEnd: (result) => {
        console.log(
          `[tool] ${result.success ? 'ok' : formatToolError(result.error)}`,
        );
      },
    },
  });

  const result = await agent.run({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT },
    ],
    options: { temperature: 0 },
    think: false,
  });
  const calls = result.turns.flatMap((turn) => turn.toolCalls ?? []);

  console.log(`\nmodel: ${model}`);
  console.log(`iterations: ${result.totalIterations}`);
  console.log(`tool calls: ${calls.length}`);
  for (const call of calls) {
    console.log(
      `- ${call.function.name}(${JSON.stringify(call.function.arguments)})`,
    );
  }
  console.log(`final: ${result.finalMessage.content}`);

  if (calls.length === 0) {
    throw new Error('The model did not call send_advanced_message.');
  }
  if (outcome === undefined) {
    throw new Error('The tool call did not produce a send outcome.');
  }
  if (!outcome.ok) {
    throw new Error('One or more Telegram formats failed.');
  }

  console.log(
    dryRun
      ? '\nDry run complete: all three formats rendered.'
      : '\nLive send complete: all three formats delivered.',
  );
}

async function sendMessage(
  message: FormattedMessage,
): Promise<SendOutcome> {
  if (credentials === undefined) {
    for (const format of TELEGRAM_FORMATS) {
      const payload = toTelegramPayload(message, format);
      assertPayloadLength(payload.text, format);
      console.log(`\n----- ${format} -----\n${payload.text}`);
    }

    outcome = {
      ok: true,
      dryRun: true,
      formats: TELEGRAM_FORMATS.map((format) => ({ format, ok: true })),
    };
    return outcome;
  }

  const results = await sendAllFormats(message, {
    token: credentials.token,
    chatId: credentials.chatId,
    deleteMessages: process.env.DELETE_MESSAGES === '1',
  });
  outcome = {
    ok: results.every((result) => result.ok),
    dryRun: false,
    formats: results,
  };
  return outcome;
}

function formatToolError(error: Error): string {
  const issues = (error as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) return error.message;

  const details = issues
    .map(
      (issue: { path?: readonly (string | number)[]; message?: string }) =>
        `${issue.path?.join('.') ?? 'input'}: ${issue.message ?? 'invalid'}`,
    )
    .join('; ');

  return `${error.message}: ${details}`;
}

function resolveCredentials():
  | { readonly token: string; readonly chatId: string }
  | undefined {
  const token = process.env.BOT_TOKEN;
  const chatId = process.env.CHAT_ID;

  if (process.env.DRY_RUN === '1' || !token || !chatId) {
    return undefined;
  }

  return { token, chatId };
}
