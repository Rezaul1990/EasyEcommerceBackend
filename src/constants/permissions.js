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
    actions: ["view", "update", "cancel", "export", "manage"],
  },
  {
    module: "customers",
    group: "Customers",
    actions: ["view", "update", "export"],
  },
  {
    module: "staff",
    group: "Access Control",
    actions: ["view", "create", "update", "delete", "manage"],
  },
  {
    module: "roles",
    group: "Access Control",
    actions: ["view", "create", "update", "delete", "manage"],
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
