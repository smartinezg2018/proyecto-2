import { Asset, AssetType } from '../../../../database/models/index.js';

function mapType(assetType) {
  if (!assetType) {
    return null;
  }

  const data = assetType.get({ plain: true });
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    createdBy: data.createdBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export class AssetTypeRepository {
  async create(assetType) {
    const created = await AssetType.create({
      code: assetType.code,
      name: assetType.name,
      createdBy: assetType.createdBy
    });
    return mapType(created);
  }

  async update(id, changes) {
    await AssetType.update({ name: changes.name }, { where: { id } });
    return this.findById(id);
  }

  async delete(id) {
    await AssetType.destroy({ where: { id } });
  }

  async findById(id) {
    const assetType = await AssetType.findByPk(id);
    return mapType(assetType);
  }

  async findByCode(code) {
    const assetType = await AssetType.findOne({ where: { code } });
    return mapType(assetType);
  }

  async findAll() {
    const types = await AssetType.findAll({ order: [['name', 'ASC']] });
    return types.map(mapType);
  }

  async countAssetsByType(code) {
    return Asset.count({ where: { type: code } });
  }
}
