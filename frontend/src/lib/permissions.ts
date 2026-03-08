type Role = 'admin' | 'director' | 'contador' | 'readonly'
type Action =
  | 'create:project' | 'edit:project' | 'delete:project'
  | 'create:budget' | 'edit:budget' | 'activate:budget'
  | 'create:contract' | 'edit:contract'
  | 'create:additive' | 'edit:additive'
  | 'create:payment' | 'approve:payment' | 'reject:payment' | 'mark_paid:payment'
  | 'manage:users'

const PERMISSIONS: Record<Role, Action[]> = {
  admin: [
    'create:project', 'edit:project', 'delete:project',
    'create:budget', 'edit:budget', 'activate:budget',
    'create:contract', 'edit:contract',
    'create:additive', 'edit:additive',
    'create:payment', 'approve:payment', 'reject:payment', 'mark_paid:payment',
    'manage:users',
  ],
  director: [
    'create:project', 'edit:project',
    'create:budget', 'edit:budget', 'activate:budget',
    'create:contract', 'edit:contract',
    'create:additive', 'edit:additive',
    'create:payment', 'approve:payment', 'reject:payment',
  ],
  contador: [
    'create:additive',
    'create:payment', 'mark_paid:payment',
  ],
  readonly: [],
}

export function canUser(role: string | undefined, action: Action): boolean {
  if (!role) return false
  return PERMISSIONS[role as Role]?.includes(action) ?? false
}
