import { logger } from '~/config';
import type { ProjectMethods } from '@librechat/data-schemas';

export interface ProjectContextDeps {
  getProject: ProjectMethods['getProject'];
  getProjectFiles: ProjectMethods['getProjectFiles'];
}

export function createProjectContextBuilder(deps: ProjectContextDeps) {
  async function buildProjectContext(projectId: string): Promise<string | undefined> {
    try {
      const project = await deps.getProject(projectId);
      if (!project) {
        return undefined;
      }

      const parts: string[] = [];

      if (project.instructions) {
        parts.push(`## Project Instructions\n${project.instructions}`);
      }

      const projectFiles = await deps.getProjectFiles(projectId);
      const filesWithText = projectFiles.filter((f) => f.text);
      if (filesWithText.length > 0) {
        const fileContextParts = filesWithText.map((f) => `### ${f.filename}\n${f.text}`);
        parts.push(`## Project Knowledge Base\n${fileContextParts.join('\n\n')}`);
      }

      return parts.length > 0 ? parts.join('\n\n') : undefined;
    } catch (error) {
      logger.error('[buildProjectContext]', error);
      return undefined;
    }
  }

  return { buildProjectContext };
}
