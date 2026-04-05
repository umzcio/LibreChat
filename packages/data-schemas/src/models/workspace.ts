import workspaceSchema from '~/schema/workspace';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import type { IWorkspaceSession } from '~/types';

export function createWorkspaceSessionModel(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(workspaceSchema);
  return (
    mongoose.models.WorkspaceSession ||
    mongoose.model<IWorkspaceSession>('WorkspaceSession', workspaceSchema)
  );
}
