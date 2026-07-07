function getPagination(query = {}, defaults = {}) {
  const maxLimit = defaults.maxLimit || 100;
  const fallbackLimit = defaults.limit || 20;
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || fallbackLimit), 1), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function buildPaginationMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    pages: Math.max(Math.ceil(total / limit), 1),
  };
}

module.exports = { getPagination, buildPaginationMeta };
