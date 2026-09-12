import { Provider } from '../../../../database/models/index.js';

function mapProvider(provider) {
  if (!provider) {
    return null;
  }

  const data = provider.get({ plain: true });
  return {
    id: data.id,
    name: data.name,
    contactName: data.contactName,
    email: data.email,
    phone: data.phone,
    address: data.address,
    createdBy: data.createdBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export class ProviderRepository {
  async create(provider) {
    const created = await Provider.create({
      name: provider.name,
      contactName: provider.contactName,
      email: provider.email,
      phone: provider.phone,
      address: provider.address,
      createdBy: provider.createdBy
    });
    return mapProvider(created);
  }

  async findById(id) {
    const provider = await Provider.findByPk(id);
    return mapProvider(provider);
  }

  async findByName(name) {
    const provider = await Provider.findOne({ where: { name } });
    return mapProvider(provider);
  }

  async findAll() {
    const providers = await Provider.findAll({ order: [['name', 'ASC']] });
    return providers.map(mapProvider);
  }
}
