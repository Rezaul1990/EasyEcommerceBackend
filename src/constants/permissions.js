const modules = [
  {
    module: "dashboard",
    group: "Dashboard",
    actions: ["view"],
  },
  {
    module: "products",
    group: "Catalog",
    actions: ["view", "create", "update", "delete", "manage"],
  },
  {
    module: "categories",
    group: "Catalog",
    actions: ["view", "create", "update", "delete", "manage"],
  },
  {
    module: "orders",
    group: "Orders",
    actions: ["view", "create", "update", "edit", "delete", "cancel", "export", "manage"],
  },
  {
    module: "coupons",
    group: "Discounts",
    actions: ["view", "create", "update", "edit", "delete", "manage"],
  },
  {
    module: "inventory",
    group: "Inventory",
    actions: ["view", "create", "update", "edit", "delete", "export", "manage"],
  },
  {
    module: "brands",
    group: "Catalog",
    actions: ["view", "create", "update", "edit", "delete", "manage"],
  },
  {
    module: "banners",
    group: "Marketing",
    actions: ["view", "create", "update", "edit", "delete", "manage"],
  },
  {
    module: "content",
    group: "Content",
    actions: ["view", "update", "publish", "manage"],
  },
  {
    module: "payments",
    group: "Payments",
    actions: ["view", "create", "update", "edit", "delete", "manage"],
  },
  {
    module: "refunds",
    group: "Payments",
    actions: ["view", "create", "update", "edit", "delete", "manage"],
  },
  {
    module: "customers",
    group: "Customers",
    actions: ["view", "update", "export"],
  },
  {
    module: "staff",
    group: "Access Control",
    actions: ["view", "create", "update", "edit", "delete", "manage"],
  },
  {
    module: "roles",
    group: "Access Control",
    actions: ["view", "create", "update", "edit", "delete", "manage"],
  },
  {
    module: "settings",
    group: "Settings",
    actions: ["view", "update", "branding", "business", "notifications", "integrations"],
  },
  {
    module: "auditLogs",
    group: "Audit Logs",
    actions: ["view"],
  },
  {
    module: "reports",
    group: "Reports",
    actions: ["view", "export"],
  },
];

const permissionRegistry = modules.flatMap((definition) =>
  definition.actions.map((action) => ({
    key: `${definition.module}.${action}`,
    module: definition.module,
    action,
    label: `${action[0].toUpperCase()}${action.slice(1)} ${definition.group}`,
    description: `Allows ${action} access for ${definition.group.toLowerCase()}.`,
    group: definition.group,
  })),
);

const allPermissions = permissionRegistry.map((permission) => permission.key);

module.exports = { permissionRegistry, allPermissions };
