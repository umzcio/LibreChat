import mcpCosmeticOverrideSchema from '~/schema/mcpCosmeticOverride';
import type { MCPCosmeticOverrideDocument } from '~/types';

export function createMCPCosmeticOverrideModel(mongoose: typeof import('mongoose')) {
  return (
    mongoose.models.MCPCosmeticOverride ||
    mongoose.model<MCPCosmeticOverrideDocument>('MCPCosmeticOverride', mcpCosmeticOverrideSchema)
  );
}
