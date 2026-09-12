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
  const data = cost.get({ plain: true });
  return {
    id: data.id,
    assetId: data.assetId,
    type: data.type,
    amount: Number(data.amount),
    occurredOn: formatDate(data.occurredOn),
    description: data.description,
    createdBy: data.createdBy,
    createdAt: data.createdAt
  };
}

export class AssetCostRepository {
  async create(cost) {
    const created = await AssetCost.create({
      assetId: cost.assetId,
      type: cost.type,
      amount: cost.amount,
      occurredOn: cost.occurredOn,
      description: cost.description,
      createdBy: cost.createdBy
    });
    return mapCost(created);
  }

  async findByAsset(assetId, filters = {}) {
    const where = { assetId };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.from || filters.to) {
      where.occurredOn = {};
      if (filters.from) {
        where.occurredOn[Op.gte] = filters.from;
      }
      if (filters.to) {
        where.occurredOn[Op.lte] = filters.to;
      }
    }

    const costs = await AssetCost.findAll({
      where,
      order: [
        ['occurredOn', 'ASC'],
        ['id', 'ASC']
      ]
    });

    return costs.map(mapCost);
  }
}
