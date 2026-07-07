function getDateRange(query = {}, field = "createdAt") {
  const filter = {};
  const now = new Date();
  let startDate = query.startDate ? new Date(query.startDate) : null;
  let endDate = query.endDate ? new Date(query.endDate) : null;

  if (query.quickDate === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }

  if (query.quickDate === "yesterday") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (query.quickDate === "this_week") {
    const day = now.getDay();
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }

  if (query.quickDate === "this_month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  if (startDate || endDate) {
    filter[field] = {};
    if (startDate && !Number.isNaN(startDate.valueOf())) filter[field].$gte = startDate;
    if (endDate && !Number.isNaN(endDate.valueOf())) filter[field].$lte = endDate;
  }

  return filter;
}

module.exports = { getDateRange };
