import { MaintenanceQuote, Supplier } from '../../../../database/models/index.js';

function mapQuote(quote) {
  const data = quote.get({ plain: true });
  return {
    id: data.id,
    maintenanceId: data.maintenanceId,
    supplierId: data.supplierId,
    amount: Number(data.amount),
    validUntil:
      typeof data.validUntil === 'string' ? data.validUntil.slice(0, 10) : data.validUntil,
    documentRef: data.documentRef,
    scope: data.scope,
    conditions: data.conditions,
    supplier: data.supplier
      ? {
          id: data.supplier.id,
          name: data.supplier.name,
          identification: data.supplier.identification,
          phone: data.supplier.phone,
          email: data.supplier.email
        }
      : null
  };
}

export class MaintenanceQuoteRepository {
  async create(input) {
    const created = await MaintenanceQuote.create({ ...input, updatedBy: input.createdBy });
    return this.findById(created.id);
  }

  async findById(id) {
    const quote = await MaintenanceQuote.findByPk(id, {
      include: [{ model: Supplier, as: 'supplier' }]
    });
    return quote ? mapQuote(quote) : null;
  }

  async findByMaintenance(maintenanceId) {
    const quotes = await MaintenanceQuote.findAll({
      where: { maintenanceId: Number(maintenanceId) },
      include: [{ model: Supplier, as: 'supplier' }],
      order: [
        ['amount', 'ASC'],
        ['id', 'ASC']
      ]
    });
    return quotes.map(mapQuote);
  }
}
