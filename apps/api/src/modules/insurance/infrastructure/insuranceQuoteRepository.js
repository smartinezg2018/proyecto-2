import { InsuranceQuote } from '../../../../database/models/InsuranceQuote.js';

function mapQuote(quote) {
  const data = quote.get({ plain: true });
  return {
    id: data.id,
    buildingId: data.buildingId,
    insurer: data.insurer,
    coverage: data.coverage,
    premium: Number(data.premium),
    validFrom: typeof data.validFrom === 'string' ? data.validFrom.slice(0, 10) : data.validFrom,
    validUntil:
      typeof data.validUntil === 'string' ? data.validUntil.slice(0, 10) : data.validUntil,
    documentRef: data.documentRef
  };
}

export class InsuranceQuoteRepository {
  async create(input) {
    const created = await InsuranceQuote.create({ ...input, updatedBy: input.createdBy });
    return mapQuote(created);
  }

  async findByBuilding(buildingId) {
    const quotes = await InsuranceQuote.findAll({
      where: { buildingId: Number(buildingId) },
      order: [
        ['premium', 'ASC'],
        ['id', 'ASC']
      ]
    });
    return quotes.map(mapQuote);
  }
}
