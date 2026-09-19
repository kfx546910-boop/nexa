export enum OwnerAccessLevel {
  VIEWER = 'viewer',
  OWNER = 'owner',
  ADMIN = 'admin'
}

export interface OwnerContext {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  allowedRoles: OwnerAccessLevel[];
  authorized?: boolean;
  profile?: Record<string, unknown>;
}

export function createOwnerContext(overrides: Partial<OwnerContext> = {}): OwnerContext {
  return {
    name: 'Owner',
    email: '',
    allowedRoles: [OwnerAccessLevel.OWNER],
    authorized: false,
    ...overrides
  };
}

export function hasOwnerAccess(owner: OwnerContext | null, required: OwnerAccessLevel): boolean {
  if (!owner) return false;
  if (owner.authorized === false) return false;
  return owner.allowedRoles.includes(required) || owner.allowedRoles.includes(OwnerAccessLevel.ADMIN);
}
