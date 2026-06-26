import type { Model, Types } from 'mongoose';
import type { MCPCosmeticOverrideDocument } from '../types';

export interface MCPCosmeticOverrideData {
  title?: string;
  description?: string;
  iconPath?: string;
}

export interface MCPCosmeticOverrideMethods {
  upsertCosmeticOverride(
    serverName: string,
    data: MCPCosmeticOverrideData,
    updatedBy: string | Types.ObjectId,
  ): Promise<MCPCosmeticOverrideDocument>;
  getCosmeticOverride(serverName: string): Promise<MCPCosmeticOverrideDocument | null>;
  getAllCosmeticOverrides(): Promise<MCPCosmeticOverrideDocument[]>;
  deleteCosmeticOverride(serverName: string): Promise<MCPCosmeticOverrideDocument | null>;
}

export function createMCPCosmeticOverrideMethods(
  mongoose: typeof import('mongoose'),
): MCPCosmeticOverrideMethods {
  async function upsertCosmeticOverride(
    serverName: string,
    data: MCPCosmeticOverrideData,
    updatedBy: string | Types.ObjectId,
  ): Promise<MCPCosmeticOverrideDocument> {
    const Model = mongoose.models.MCPCosmeticOverride as Model<MCPCosmeticOverrideDocument>;
    const result = await Model.findOneAndUpdate(
      { serverName },
      { $set: { ...data, updatedBy } },
      { new: true, upsert: true, runValidators: true },
    ).lean();
    return result as MCPCosmeticOverrideDocument;
  }

  async function getCosmeticOverride(
    serverName: string,
  ): Promise<MCPCosmeticOverrideDocument | null> {
    const Model = mongoose.models.MCPCosmeticOverride as Model<MCPCosmeticOverrideDocument>;
    return await Model.findOne({ serverName }).lean();
  }

  async function getAllCosmeticOverrides(): Promise<MCPCosmeticOverrideDocument[]> {
    const Model = mongoose.models.MCPCosmeticOverride as Model<MCPCosmeticOverrideDocument>;
    return await Model.find({}).lean();
  }

  async function deleteCosmeticOverride(
    serverName: string,
  ): Promise<MCPCosmeticOverrideDocument | null> {
    const Model = mongoose.models.MCPCosmeticOverride as Model<MCPCosmeticOverrideDocument>;
    return await Model.findOneAndDelete({ serverName }).lean();
  }

  return {
    upsertCosmeticOverride,
    getCosmeticOverride,
    getAllCosmeticOverrides,
    deleteCosmeticOverride,
  };
}
