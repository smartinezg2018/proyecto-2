import { ProjectQuote, Supplier } from '../../../../database/models/index.js';

function formatDate(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function mapProjectQuote(quote) {
  if (!quote) return null;
  const data = quote.get ? quote.get({ plain: true }) : quote;
  return {
    id: data.id,
    projectId: data.projectId,
    supplierId: data.supplierId,
    amount: Number(data.amount),
    validUntil: formatDate(data.validUntil),
    scope: data.scope,
    conditions: data.conditions,
    deliveryDays: data.deliveryDays === null || data.deliveryDays === undefined
      ? null
      : Number(data.deliveryDays),
    documentRef: data.documentRef,
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

const supplierInclude = { model: Supplier, as: 'supplier' };

export class ProjectQuoteRepository {
  async create(input) {
    const created = await ProjectQuote.create({ ...input, updatedBy: input.createdBy });
    return this.findById(created.id);
  }

  async findById(id) {
    const quote = await ProjectQuote.findByPk(id, { include: [supplierInclude] });
    return quote ? mapProjectQuote(quote) : null;
  }

  async findByProject(projectId) {
    const quotes = await ProjectQuote.findAll({
      where: { projectId: Number(projectId) },
      include: [supplierInclude],
      order: [
        ['id', 'ASC']
      ]
    });
    return quotes.map(mapProjectQuote);
  }
}
