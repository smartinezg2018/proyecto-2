import { sequelize } from '../../../../database/connection.js';
import { AssetSupplier, Supplier } from '../../../../database/models/index.js';

function mapSupplier(supplier) {
  if (!supplier) {
    return null;
  }

  const data = supplier.get ? supplier.get({ plain: true }) : supplier;

  return {
    id: data.id,
    identification: data.identification,
    name: data.name,
    phone: data.phone,
    email: data.email,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export class SupplierRepository {
  async create(supplier) {
    const created = await Supplier.create({
      identification: supplier.identification,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      createdBy: supplier.createdBy,
      updatedBy: supplier.createdBy
    });

    return this.findById(created.id);
  }

  async findById(id) {
    const supplier = await Supplier.findByPk(id);
    return mapSupplier(supplier);
  }

  async findByIdentification(identification) {
    const supplier = await Supplier.findOne({ where: { identification } });
    return mapSupplier(supplier);
  }

  async findAll() {
    const suppliers = await Supplier.findAll({ order: [['name', 'ASC']] });
    return suppliers.map(mapSupplier);
  }

  async assignToAsset(assetId, supplierId, role, userId = null) {
    await sequelize.transaction(async (transaction) => {
      await AssetSupplier.upsert(
        {
          assetId: Number(assetId),
          supplierId: Number(supplierId),
          role,
          createdBy: userId
        },
        { transaction }
      );
    });
  }

  async findByAsset(assetId) {
    const assignment = await AssetSupplier.findOne({
      where: { assetId },
      include: [{ model: Supplier, as: 'supplier' }]
    });

    if (!assignment) {
      return null;
    }

    const data = assignment.get({ plain: true });
    return {
      ...mapSupplier(data.supplier),
      role: data.role,
      assignedAt: data.createdAt
    };
  }
}
