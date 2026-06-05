import zdockSchema from '~/schema/zdock';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import type { IZdock } from '~/types';

export function createZdockModel(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(zdockSchema);
  return mongoose.models.Zdock || mongoose.model<IZdock>('Project', zdockSchema);
}
