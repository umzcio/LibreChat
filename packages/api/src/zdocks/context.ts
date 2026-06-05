import axios from 'axios';
import { logger } from '@librechat/data-schemas';
import type { IMongoFile, IZdock } from '@librechat/data-schemas';
import { generateShortLivedToken } from '~/crypto/jwt';

const MAX_EMBEDDED_FILES = 10;
const MAX_TEXT_CHARS = 8000;

export interface ProjectContextDeps {
  getZdock(zdockId: string, userId?: string): Promise<IZdock | null>;
  getZdockFiles(zdockId: string, userId?: string): Promise<IMongoFile[]>;
}

export interface ProjectContextOptions {
  zdockId: string;
  userId: string;
  userQuery?: string;
}

export function createZdockContextBuilder(deps: ProjectContextDeps) {
  async function queryRag(
    embeddedFiles: IMongoFile[],
    userId: string,
    userQuery: string,
  ): Promise<string[]> {
    if (embeddedFiles.length === 0 || !process.env.RAG_API_URL || !userQuery) {
      return [];
    }

    const capped = embeddedFiles.slice(0, MAX_EMBEDDED_FILES);
    const jwtToken = generateShortLivedToken(userId);
    const ragResults = await Promise.allSettled(
      capped.map((f) =>
        axios.post(
          `${process.env.RAG_API_URL}/query`,
          { file_id: f.file_id, query: userQuery, k: 4 },
          { headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const contextParts: string[] = [];
    for (let i = 0; i < ragResults.length; i++) {
      const result = ragResults[i];
      if (result.status === 'fulfilled' && result.value.data?.length > 0) {
        const chunks = result.value.data
          .map((item: Record<string, unknown>[]) =>
            (item[0] as { page_content?: string })?.page_content?.trim(),
          )
          .filter(Boolean)
          .join('\n\n');
        if (chunks) {
          contextParts.push(`### ${capped[i].filename}\n${chunks}`);
        }
      }
    }
    return contextParts;
  }

  function buildTextContext(files: IMongoFile[]): string[] {
    const textFiles = files.filter((f) => !f.embedded && f.text);
    if (textFiles.length === 0) {
      return [];
    }

    const parts: string[] = [];
    let totalChars = 0;
    for (const f of textFiles) {
      const text = f.text ?? '';
      if (totalChars + text.length > MAX_TEXT_CHARS) {
        const remaining = MAX_TEXT_CHARS - totalChars;
        if (remaining > 0) {
          parts.push(`### ${f.filename}\n${text.slice(0, remaining)}`);
        }
        break;
      }
      parts.push(`### ${f.filename}\n${text}`);
      totalChars += text.length;
    }
    return parts;
  }

  function buildMemorySection(project: IZdock): string {
    const bullets = project.memory?.length
      ? project.memory.map((m) => `\u2022 ${m}`).join('\n')
      : '';
    return `## Project Memory\nYou have project-scoped memory that automatically learns from conversations in this project. Facts, preferences, and decisions are saved and carried across conversations.\n${bullets ? `Current memory:\n${bullets}` : 'No memories saved yet.'}\nWhen the user asks you to remember or forget something, acknowledge it naturally \u2014 the memory system processes it automatically after the conversation.`;
  }

  async function buildZdockContext(
    options: ProjectContextOptions,
  ): Promise<string | undefined> {
    const { zdockId, userId, userQuery } = options;
    try {
      const project = await deps.getZdock(zdockId, userId);
      if (!project) {
        return undefined;
      }

      const parts: string[] = [];

      if (project.instructions) {
        parts.push(`## Project Instructions\n${project.instructions}`);
      }

      const projectFiles = await deps.getZdockFiles(zdockId, userId);
      const embeddedFiles = projectFiles.filter((f) => f.embedded);

      const ragParts = await queryRag(embeddedFiles, userId, userQuery ?? '');
      if (ragParts.length > 0) {
        parts.push(`## Project Knowledge Base (relevant excerpts)\n${ragParts.join('\n\n')}`);
      }

      const textParts = buildTextContext(projectFiles);
      if (textParts.length > 0) {
        parts.push(`## Project Knowledge Base\n${textParts.join('\n\n')}`);
      }

      parts.push(buildMemorySection(project));

      return parts.length > 0 ? parts.join('\n\n') : undefined;
    } catch (error) {
      logger.error('[buildZdockContext]', error);
      return undefined;
    }
  }

  return { buildZdockContext };
}
