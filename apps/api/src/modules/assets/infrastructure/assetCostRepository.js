import { Op } from 'sequelize';
import { AssetCost } from '../../../../database/models/index.js';

function formatDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapCost(cost) {
  if (!cost) {
    return null;
  }

  const data = cost.get({ plain: true });

  return {
    id: data.id,
    assetId: data.assetId,
    costType: data.costType,
    amount: Number(data.amount),
    costDate: formatDate(data.costDate),
    documentRef: data.documentRef,
    notes: data.notes,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export class AssetCostRepository {
  async create(cost) {
    const created = await AssetCost.create({
      assetId: cost.assetId,
      costType: cost.costType,
      amount: cost.amount,
      costDate: cost.costDate,
      documentRef: cost.documentRef,
      notes: cost.notes,
      createdBy: cost.createdBy,
      updatedBy: cost.createdBy
    });

    return this.findById(created.id);
  }

  async update(id, cost) {
    await AssetCost.update(
      {
        amount: cost.amount,
        costDate: cost.costDate,
        documentRef: cost.documentRef,
        notes: cost.notes,
        updatedBy: cost.updatedBy
      },
      { where: { id } }
    );

    return this.findById(id);
  }

  async findById(id) {
    const cost = await AssetCost.findByPk(id);
    return mapCost(cost);
  }

  async findAcquisitionByAsset(assetId) {
    const cost = await AssetCost.findOne({
      where: { assetId, costType: 'adquisicion' },
      order: [
        ['costDate', 'DESC'],
        ['id', 'DESC']
      ]
    });

    return mapCost(cost);
  }

  async findByAsset(assetId, filters = {}) {
    const where = { assetId: Number(assetId) };

    if (filters.costType) {
      where.costType = filters.costType;
    }

    if (filters.from || filters.to) {
      where.costDate = {};
      if (filters.from) {
        where.costDate[Op.gte] = filters.from;
      }
      if (filters.to) {
        where.costDate[Op.lte] = filters.to;
      }
    }

    const costs = await AssetCost.findAll({
      where,
      order: [
        ['costDate', 'DESC'],
        ['id', 'DESC']
      ]
    });

    return costs.map(mapCost);
  }
}
