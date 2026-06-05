const axios = require('axios');
const { logger } = require('@librechat/data-schemas');
const db = require('~/models');

const MAX_MEMORY_ENTRIES = 50;

const SYSTEM_PROMPT = `You analyze conversation transcripts and extract durable, reusable facts about the user and their project. Return a JSON object with a single key "memories" containing an array of concise bullet strings.

Only store facts that would still be relevant and useful in a future conversation weeks from now. Good memories include:
- User preferences and communication style ("User prefers first-person, direct tone")
- Audience and context ("Posts target higher ed CIOs")
- Project goals, deadlines, and key decisions ("Project deadline is June 15")
- Recurring patterns and stated constraints ("No em dashes, avoid hype")
- Key people, roles, and relationships ("Dr. Smith is keynote speaker")

Do NOT store:
- One-off events or session artifacts ("User uploaded a file", "User asked about X")
- Error messages, failed actions, or transient system states
- Anything that is only relevant to the current conversation
- Generic or vague observations
- Off-topic requests that the assistant rejected or that contradict the project's purpose
- Test messages or throwaway requests
{projectContext}

Each memory should be:
- A single sentence capturing one durable fact
- Written in third person ("User prefers...", "Project deadline is...")
- Specific enough to be actionable in future conversations
- Unique — do not repeat information already in existing memory

Existing project memory (do not duplicate these):
{existingMemory}

Return format: {"memories": ["memory 1", "memory 2", ...]}
If there is nothing new worth remembering, return {"memories": []}`;

async function synthesizeProjectMemory(zdockId, userId) {
  const endpoint =
    process.env.MEMORY_MODEL_ENDPOINT || 'http://host.docker.internal:11434/v1';
  const model = process.env.MEMORY_MODEL || 'qwen3:8b';

  const project = await db.getZdock(zdockId, userId);
  if (!project) {
    logger.warn('[ProjectMemory] Project not found for synthesis', { zdockId });
    return;
  }

  const convosResult = await db.getConvosByCursor(userId, {
    zdockId,
    limit: 5,
  });
  const conversations = convosResult?.conversations || [];
  if (conversations.length === 0) {
    logger.debug('[ProjectMemory] No conversations to synthesize', { zdockId });
    return;
  }

  const transcriptParts = [];
  for (const convo of conversations) {
    const messages = await db.getMessages({ conversationId: convo.conversationId });
    if (!messages || messages.length === 0) {
      continue;
    }
    const lines = messages.map((m) => {
      const role = m.isCreatedByUser ? 'User' : 'Assistant';
      const text =
        typeof m.text === 'string'
          ? m.text
          : Array.isArray(m.content)
            ? m.content.map((c) => c.text || '').join('')
            : '';
      return `${role}: ${text}`;
    });
    transcriptParts.push(`--- Conversation: ${convo.title || convo.conversationId} ---\n${lines.join('\n')}`);
  }

  const transcript = transcriptParts.join('\n\n');
  if (!transcript.trim()) {
    logger.debug('[ProjectMemory] Empty transcript, skipping synthesis', { zdockId });
    return;
  }

  const existingMemory = project.memory || [];
  const existingMemoryStr =
    existingMemory.length > 0 ? existingMemory.map((m) => `- ${m}`).join('\n') : '(none)';

  const projectContext = project.instructions
    ? `\nProject instructions (for context — use this to judge what is relevant to this project):\n${project.instructions}\n`
    : '';
  const systemPrompt = SYSTEM_PROMPT
    .replace('{existingMemory}', existingMemoryStr)
    .replace('{projectContext}', projectContext);

  let newMemories = [];
  try {
    const response = await axios.post(
      `${endpoint}/chat/completions`,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        temperature: 0.3,
      },
      { timeout: 120000 },
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (content) {
      // Extract JSON from response — model may wrap it in markdown code fences
      const jsonMatch = content.match(/\{[\s\S]*"memories"[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.memories)) {
        newMemories = parsed.memories.filter((m) => typeof m === 'string' && m.trim());
      }
    }
  } catch (err) {
    logger.error('[ProjectMemory] LLM call failed', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    return;
  }

  if (newMemories.length === 0) {
    logger.debug('[ProjectMemory] No new memories extracted', { zdockId });
    return;
  }

  const existingSet = new Set(existingMemory.map((m) => m.toLowerCase().trim()));
  const dedupedNew = newMemories.filter((m) => !existingSet.has(m.toLowerCase().trim()));
  const mergedMemory = [...existingMemory, ...dedupedNew].slice(0, MAX_MEMORY_ENTRIES);

  await db.updateZdock(zdockId, userId, {
    memory: mergedMemory,
    memoryUpdatedAt: new Date(),
  });

  logger.info('[ProjectMemory] Synthesized memory', {
    zdockId,
    newEntries: dedupedNew.length,
    totalEntries: mergedMemory.length,
  });
}

module.exports = { synthesizeProjectMemory };
