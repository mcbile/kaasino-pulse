import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { LayoutDashboard, Activity, CreditCard, Server, Gamepad2, Bell, Download, Filter, Users, Eye, EyeOff, ChevronsRight, ChevronsLeft, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { ThemeProvider } from './ThemeContext'
import { TimeRangeProvider, useTimeRange, TIME_RANGES } from './TimeRangeContext'
import { AuthProvider, useAuth, LoginPage, UserMenu } from './AuthContext'

// Filters
const BRANDS = ['All', 'Kaasino', 'Bet4star'] as const
const COUNTRIES = ['All', 'NL', 'GB', 'DE', 'N/A'] as const

type Brand = typeof BRANDS[number]
type Country = typeof COUNTRIES[number]

interface FiltersContextType {
  brand: Brand
  setBrand: (b: Brand) => void
  country: Country
  setCountry: (c: Country) => void
  appliedBrand: Brand
  appliedCountry: Country
  applyFilters: () => void
  filtersChanged: boolean
}

const FiltersContext = createContext<FiltersContextType | null>(null)

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<Brand>('All')
  const [country, setCountry] = useState<Country>('All')
  const [appliedBrand, setAppliedBrand] = useState<Brand>('All')
  const [appliedCountry, setAppliedCountry] = useState<Country>('All')

  const filtersChanged = brand !== appliedBrand || country !== appliedCountry

  const applyFilters = () => {
    setAppliedBrand(brand)
    setAppliedCountry(country)
  }

  return (
    <FiltersContext.Provider value={{
      brand, setBrand, country, setCountry,
      appliedBrand, appliedCountry, applyFilters, filtersChanged
    }}>
      {children}
    </FiltersContext.Provider>
  )
}

export function useFilters() {
  const ctx = useContext(FiltersContext)
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider')
  return ctx
}
import { OverviewPage } from './OverviewPage'
import { WebVitalsPage } from './WebVitalsPage'
import { PSPPage } from './PSPPage'
import { APIPage } from './APIPage'
import { GamesPage } from './GamesPage'
import { AlertsPage } from './AlertsPage'
import { FinancePage } from './FinancePage'
import { mockData, mockDataAPI } from './apiClient'
import { DollarSign } from 'lucide-react'

const queryClient = new QueryClient()

// Pages available to all users
type CommonPage = 'overview' | 'vitals' | 'api' | 'games' | 'alerts' | 'faq'
// Pages with restricted access (admin controls)
type RestrictedPage = 'finance' | 'psp'
// Admin-only pages
type AdminPage = 'users'

type Page = CommonPage | RestrictedPage | AdminPage

const pageConfig: Record<Page, { label: string; icon: React.ReactNode }> = {
  overview: { label: 'General', icon: <LayoutDashboard size={18} /> },
  vitals: { label: 'Web Vitals', icon: <Activity size={18} /> },
  api: { label: 'API', icon: <Server size={18} /> },
  games: { label: 'Games', icon: <Gamepad2 size={18} /> },
  alerts: { label: 'Alerts', icon: <Bell size={18} /> },
  finance: { label: 'Finance', icon: <DollarSign size={18} /> },
  psp: { label: 'PSP', icon: <CreditCard size={18} /> },
  users: { label: 'Users', icon: <Users size={18} /> },
  faq: { label: 'FAQ', icon: <HelpCircle size={18} /> },
}

// Client permissions for restricted pages (finance, psp, docs)
interface ClientPermissions {
  finance: boolean
  psp: boolean
  docs: boolean
}

const DEFAULT_PERMISSIONS: ClientPermissions = {
  finance: false,
  psp: false,
  docs: false,
}

function getClientPermissions(email: string): ClientPermissions {
  try {
    const allPermissions = JSON.parse(localStorage.getItem('pulse-client-permissions') || '{}')
    return allPermissions[email.toLowerCase()] || DEFAULT_PERMISSIONS
  } catch {
    return DEFAULT_PERMISSIONS
  }
}

function setClientPermissions(email: string, permissions: ClientPermissions) {
  const allPermissions = JSON.parse(localStorage.getItem('pulse-client-permissions') || '{}')
  allPermissions[email.toLowerCase()] = permissions
  localStorage.setItem('pulse-client-permissions', JSON.stringify(allPermissions))
}

function getRegisteredUsers(): Array<{ email: string; name: string; nickname: string }> {
  try {
    const users = JSON.parse(localStorage.getItem('pulse-registered-users') || '{}')
    return Object.values(users)
  } catch {
    return []
  }
}

function TimeRangeSelector() {
  const { range, setRange } = useTimeRange()

  return (
    <select
      value={range}
      onChange={(e) => setRange(e.target.value as typeof range)}
      className="select"
    >
      {TIME_RANGES.map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  )
}

function BrandSelector() {
  const { brand, setBrand } = useFilters()

  return (
    <select
      value={brand}
      onChange={(e) => setBrand(e.target.value as Brand)}
      className="select"
    >
      {BRANDS.map((b) => (
        <option key={b} value={b}>{b === 'All' ? 'All Brands' : b}</option>
      ))}
    </select>
  )
}

function CountrySelector() {
  const { country, setCountry } = useFilters()

  return (
    <select
      value={country}
      onChange={(e) => setCountry(e.target.value as Country)}
      className="select"
    >
      {COUNTRIES.map((c) => (
        <option key={c} value={c}>{c === 'All' ? 'All Countries' : c}</option>
      ))}
    </select>
  )
}

function ApplyFiltersButton() {
  const { applyFilters, filtersChanged } = useFilters()

  return (
    <button
      onClick={applyFilters}
      disabled={!filtersChanged}
      className={`btn ${filtersChanged ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
    >
      <Filter size={16} />
      Apply
    </button>
  )
}

// Export utilities
function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h]
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`
      return val
    }).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

function exportToMarkdown(data: Record<string, unknown>[], title: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const mdContent = [
    `# ${title}`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    '| ' + headers.join(' | ') + ' |',
    '| ' + headers.map(() => '---').join(' | ') + ' |',
    ...data.map(row => '| ' + headers.map(h => row[h]).join(' | ') + ' |')
  ].join('\n')

  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`
  link.click()
}

// Extended user type with role
interface ManagedUser {
  email: string
  name: string
  nickname: string
  role: 'admin' | 'client'
  password?: string
}

function getAllUsers(): ManagedUser[] {
  try {
    const users = JSON.parse(localStorage.getItem('pulse-managed-users') || '{}')
    return Object.values(users)
  } catch {
    return []
  }
}

function saveAllUsers(users: ManagedUser[]) {
  const usersMap: Record<string, ManagedUser> = {}
  users.forEach(u => { usersMap[u.email.toLowerCase()] = u })
  localStorage.setItem('pulse-managed-users', JSON.stringify(usersMap))
  // Also sync with legacy registered users format
  const legacyFormat: Record<string, { email: string; name: string; nickname: string; password: string }> = {}
  users.forEach(u => {
    legacyFormat[u.email.toLowerCase()] = {
      email: u.email,
      name: u.name,
      nickname: u.nickname,
      password: u.password || '',
    }
  })
  localStorage.setItem('pulse-registered-users', JSON.stringify(legacyFormat))
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password + '1!' // Ensure it meets requirements
}

// Users Management Page (Admin/Super Admin)
function UsersPage() {
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === 'super_admin'

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [permissions, setPermissions] = useState<Record<string, ClientPermissions>>({})
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [newUser, setNewUser] = useState<Partial<ManagedUser>>({ role: 'client' })
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const loadUsers = () => {
    // First try managed users, then fall back to registered users
    let loadedUsers = getAllUsers()
    if (loadedUsers.length === 0) {
      const legacyUsers = getRegisteredUsers()
      loadedUsers = legacyUsers.map(u => ({
        ...u,
        role: 'client' as const,
      }))
      if (loadedUsers.length > 0) {
        saveAllUsers(loadedUsers)
      }
    }

    // Add super_admin to the list (hardcoded, not editable)
    const superAdmin: ManagedUser = {
      email: 'michael@starcrown.partners',
      name: 'Michael',
      nickname: 'McBile',
      role: 'super_admin' as any,
    }
    // Check if super_admin already in list
    if (!loadedUsers.some(u => u.email.toLowerCase() === superAdmin.email.toLowerCase())) {
      loadedUsers = [superAdmin, ...loadedUsers]
    }

    setUsers(loadedUsers)

    const perms: Record<string, ClientPermissions> = {}
    loadedUsers.forEach(u => {
      perms[u.email] = getClientPermissions(u.email)
    })
    setPermissions(perms)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const togglePermission = (email: string, key: keyof ClientPermissions) => {
    const current = permissions[email] || DEFAULT_PERMISSIONS
    const updated = { ...current, [key]: !current[key] }
    setPermissions(prev => ({ ...prev, [email]: updated }))
    setClientPermissions(email, updated)
  }

  const handleAddUser = () => {
    if (!newUser.nickname || !newUser.email) return

    const fullEmail = newUser.email.includes('@')
      ? newUser.email.toLowerCase()
      : `${newUser.email.toLowerCase()}@starcrown.partners`

    // Check for duplicates
    if (users.some(u => u.email.toLowerCase() === fullEmail)) {
      alert('User with this email already exists')
      return
    }

    if (users.some(u => u.nickname.toLowerCase() === newUser.nickname?.toLowerCase())) {
      alert('User with this nickname already exists')
      return
    }

    const password = generatePassword()
    const user: ManagedUser = {
      email: fullEmail,
      name: newUser.nickname,
      nickname: newUser.nickname,
      role: newUser.role || 'client',
      password: password,
    }

    const updatedUsers = [...users, user]
    saveAllUsers(updatedUsers)
    setUsers(updatedUsers)
    setNewUser({ role: 'client' })
    setIsAddingUser(false)
    setGeneratedPassword(password)
  }

  const handleUpdateUser = () => {
    if (!editingUser) return

    const updatedUsers = users.map(u =>
      u.email.toLowerCase() === editingUser.email.toLowerCase() ? editingUser : u
    )
    saveAllUsers(updatedUsers)
    setUsers(updatedUsers)
    setEditingUser(null)
  }

  const handleResetPassword = (email: string) => {
    const password = generatePassword()
    const updatedUsers = users.map(u =>
      u.email.toLowerCase() === email.toLowerCase() ? { ...u, password } : u
    )
    saveAllUsers(updatedUsers)
    setUsers(updatedUsers)
    setShowResetConfirm(null)
    setGeneratedPassword(password)
  }

  const handleDeleteUser = (email: string) => {
    const updatedUsers = users.filter(u => u.email.toLowerCase() !== email.toLowerCase())
    saveAllUsers(updatedUsers)
    setUsers(updatedUsers)
    // Also clear permissions
    const allPermissions = JSON.parse(localStorage.getItem('pulse-client-permissions') || '{}')
    delete allPermissions[email.toLowerCase()]
    localStorage.setItem('pulse-client-permissions', JSON.stringify(allPermissions))
    setShowDeleteConfirm(null)
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-500/20 text-purple-500'
      case 'admin': return 'bg-blue-500/20 text-blue-500'
      case 'client': return 'bg-emerald-500/20 text-emerald-500'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Generated Password Modal */}
      {generatedPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 max-w-md">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Password Generated</h3>
            <p className="text-theme-muted mb-4">Save this password - it will not be shown again:</p>
            <div className="bg-[var(--bg-card-alt)] p-4 rounded-lg font-mono text-lg text-center text-theme-primary mb-4">
              {generatedPassword}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedPassword)
                setGeneratedPassword(null)
              }}
              className="w-full btn btn-primary"
            >
              Copy & Close
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Add New User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-theme-muted mb-1">Nickname</label>
                <input
                  type="text"
                  value={newUser.nickname || ''}
                  onChange={e => setNewUser({ ...newUser, nickname: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-theme bg-transparent text-theme-primary"
                  placeholder="Enter nickname"
                />
              </div>
              <div>
                <label className="block text-sm text-theme-muted mb-1">Email</label>
                <div className="flex">
                  <input
                    type="text"
                    value={newUser.email || ''}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value.replace(/@.*$/, '') })}
                    className="flex-1 px-4 py-2 rounded-l-lg border border-r-0 border-theme bg-transparent text-theme-primary"
                    placeholder="username"
                  />
                  <span className="px-4 py-2 rounded-r-lg border border-theme bg-[var(--bg-card-alt)] text-theme-muted text-sm flex items-center">
                    @starcrown.partners
                  </span>
                </div>
              </div>
              {/* Only super admin can create admins */}
              {isSuperAdmin && (
                <div>
                  <label className="block text-sm text-theme-muted mb-1">Role</label>
                  <select
                    value={newUser.role || 'client'}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'client' })}
                    className="w-full px-4 py-2 rounded-lg border border-theme bg-transparent text-theme-primary"
                  >
                    <option value="client">Client</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsAddingUser(false)} className="flex-1 btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleAddUser} className="flex-1 btn btn-primary">
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-theme-muted mb-1">Nickname</label>
                <input
                  type="text"
                  value={editingUser.nickname}
                  onChange={e => setEditingUser({ ...editingUser, nickname: e.target.value, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-theme bg-transparent text-theme-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-theme-muted mb-1">Email</label>
                <input
                  type="text"
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-theme bg-transparent text-theme-primary"
                />
              </div>
              {/* Only super admin can change roles */}
              {isSuperAdmin && (
                <div>
                  <label className="block text-sm text-theme-muted mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'client' })}
                    className="w-full px-4 py-2 rounded-lg border border-theme bg-transparent text-theme-primary"
                  >
                    <option value="client">Client</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingUser(null)} className="flex-1 btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleUpdateUser} className="flex-1 btn btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 max-w-md">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Reset Password</h3>
            <p className="text-theme-muted mb-4">
              Are you sure you want to reset the password for this user? A new password will be generated.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(null)} className="flex-1 btn btn-secondary">
                Cancel
              </button>
              <button onClick={() => handleResetPassword(showResetConfirm)} className="flex-1 btn btn-primary">
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 max-w-md">
            <h3 className="text-lg font-semibold text-[var(--gradient-4)] mb-4">Delete User</h3>
            <p className="text-theme-muted mb-4">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(showDeleteConfirm)}
                className="flex-1 btn"
                style={{ background: 'var(--gradient-4)', color: 'white' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-theme-primary">User Management</h3>
          <div className="flex gap-3">
            <button onClick={loadUsers} className="btn btn-secondary text-sm">
              Refresh
            </button>
            <button onClick={() => setIsAddingUser(true)} className="btn btn-primary text-sm">
              + Add User
            </button>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-8 text-theme-muted">
            No users yet. Click "Add User" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-theme-muted text-sm border-b border-theme">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3 text-center">Finance</th>
                  <th className="pb-3 text-center">PSP</th>
                  <th className="pb-3 text-center">Docs</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-theme-primary">
                {users.map((user) => {
                  const userPerms = permissions[user.email] || DEFAULT_PERMISSIONS
                  return (
                    <tr key={user.email} className="border-b border-theme">
                      <td className="py-4">
                        <div>
                          <div className="font-medium">{user.nickname}</div>
                          <div className="text-xs text-theme-muted">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      {(['finance', 'psp', 'docs'] as const).map((key) => (
                        <td key={key} className="py-4 text-center">
                          {user.role === 'super_admin' ? (
                            // Super admin always has full access - show static enabled icon
                            <span className="p-2 rounded-lg bg-green-500/20 text-green-500 inline-flex">
                              <Eye size={16} />
                            </span>
                          ) : (
                            <button
                              onClick={() => togglePermission(user.email, key)}
                              className={`p-2 rounded-lg transition-colors ${userPerms[key] ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}
                            >
                              {userPerms[key] ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                          )}
                        </td>
                      ))}
                      <td className="py-4">
                        <div className="flex justify-end gap-2">
                          {/* Super admin cannot be edited. Super admin can manage admins/clients, admins can only manage clients */}
                          {user.role === 'super_admin' ? (
                            <span className="text-xs text-theme-muted">—</span>
                          ) : (isSuperAdmin || user.role === 'client') ? (
                            <>
                              <button
                                onClick={() => setEditingUser(user)}
                                className="px-3 py-1 text-xs rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setShowResetConfirm(user.email)}
                                className="px-3 py-1 text-xs rounded-lg bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 transition-colors"
                              >
                                Reset Password
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(user.email)}
                                className="px-3 py-1 text-xs rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-theme-muted">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Legend */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-theme-primary mb-4">Roles & Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-500">super_admin</span>
            <span className="text-theme-secondary">Full access + User management</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-500">admin</span>
            <span className="text-theme-secondary">Full dashboard access</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400">client</span>
            <span className="text-theme-secondary">Limited access (per permissions)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// FAQ Modal Component
const FAQ_ITEMS = [
  {
    category: 'Общие вопросы',
    items: [
      { q: 'Что такое Product Pulse?', a: 'Система мониторинга производительности: Go Collector (~50k events/sec), Frontend SDK и Dashboard для визуализации метрик.' },
      { q: 'Какие метрики собираются?', a: 'Web Vitals (LCP, FID, CLS, INP), API Performance, PSP транзакции, Game Providers, Business Metrics (GGR, deposits).' },
    ]
  },
  {
    category: 'Web Vitals',
    items: [
      { q: 'LCP (Largest Contentful Paint)', a: 'Время загрузки самого большого элемента (картинка, текстовый блок). Хорошо: <2.5s, Плохо: >4s' },
      { q: 'FID (First Input Delay)', a: 'Задержка между первым кликом пользователя и реакцией браузера. Хорошо: <100ms, Плохо: >300ms' },
      { q: 'CLS (Cumulative Layout Shift)', a: 'Визуальная стабильность — насколько "прыгает" контент при загрузке. Хорошо: <0.1, Плохо: >0.25' },
      { q: 'INP (Interaction to Next Paint)', a: 'Отзывчивость — время от любого взаимодействия до обновления экрана. Хорошо: <200ms, Плохо: >500ms' },
      { q: 'TTFB (Time to First Byte)', a: 'Время до первого байта ответа от сервера. Хорошо: <800ms, Плохо: >1.8s' },
      { q: 'FCP (First Contentful Paint)', a: 'Время до первого контента на экране (текст, картинка). Хорошо: <1.8s, Плохо: >3s' },
    ]
  },
  {
    category: 'API Метрики',
    items: [
      { q: 'Request Count', a: 'Количество запросов к endpoint за выбранный период времени.' },
      { q: 'Error Rate', a: 'Процент ошибок (4xx + 5xx) от всех запросов. Норма: <1%' },
      { q: 'Avg Duration', a: 'Средняя длительность запроса в миллисекундах.' },
      { q: 'P95 / P99 Duration', a: 'Персентили: 95% / 99% запросов быстрее этого значения. Показывает "хвост" медленных запросов.' },
      { q: 'Throughput', a: 'Пропускная способность — запросов в секунду (req/sec).' },
    ]
  },
  {
    category: 'PSP Метрики',
    items: [
      { q: 'Success Rate', a: 'Процент успешных транзакций (deposits/withdrawals). Норма: >95%' },
      { q: 'Avg Latency', a: 'Среднее время обработки платежа в миллисекундах.' },
      { q: 'Transaction Volume', a: 'Количество транзакций за выбранный период.' },
      { q: 'Failed Transactions', a: 'Список неуспешных транзакций с причинами отказа.' },
    ]
  },
  {
    category: 'Game Метрики',
    items: [
      { q: 'Availability', a: 'Процент времени, когда game provider доступен. Норма: >99.9%' },
      { q: 'Success Rate', a: 'Процент успешных запусков игр.' },
      { q: 'ISR (Instant Success Rate)', a: 'Процент мгновенных успешных запусков без retry. Показывает качество интеграции.' },
      { q: 'Avg Response Time', a: 'Среднее время ответа от провайдера в миллисекундах.' },
    ]
  },
  {
    category: 'Finance Метрики',
    items: [
      { q: 'GGR (Gross Gaming Revenue)', a: 'Валовый игровой доход = ставки минус выигрыши.' },
      { q: 'Deposits', a: 'Сумма пополнений за выбранный период.' },
      { q: 'Withdrawals', a: 'Сумма выводов за выбранный период.' },
      { q: 'Active Sessions', a: 'Количество активных пользовательских сессий.' },
    ]
  },
  {
    category: 'Dashboard',
    items: [
      { q: 'Как применить фильтры?', a: 'Выберите Brand, Country и Time Range, затем нажмите кнопку Apply.' },
      { q: 'Как экспортировать данные?', a: 'Нажмите Export и выберите формат: CSV или Markdown.' },
      { q: 'Как часто обновляются данные?', a: 'Автоматически каждые 30 секунд.' },
    ]
  },
  {
    category: 'Авторизация',
    items: [
      { q: 'Какие роли есть в системе?', a: 'super_admin (полный доступ), admin (все страницы), client (ограниченный доступ по permissions).' },
      { q: 'Как войти в систему?', a: 'Email/Nickname + пароль или Google OAuth для @starcrown.partners.' },
    ]
  },
]

function FAQPage() {
  const { user } = useAuth()
  const [expandedCategory, setExpandedCategory] = useState<string | null>(FAQ_ITEMS[0].category)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  // Documentation visible to: super_admin, admin, or clients with docs permission
  const isSuperAdmin = user?.role === 'super_admin'
  const isAdmin = user?.role === 'admin' || isSuperAdmin
  const permissions = user ? getClientPermissions(user.email) : DEFAULT_PERMISSIONS
  const showDocs = isAdmin || permissions.docs

  return (
    <div className="space-y-6">
      {/* Grid of FAQ categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {FAQ_ITEMS.map((category) => (
          <div key={category.category} className="card p-0 overflow-hidden">
            <button
              onClick={() => setExpandedCategory(expandedCategory === category.category ? null : category.category)}
              className="w-full flex items-center justify-between p-4 bg-card-alt hover:bg-card-alt/80 transition-colors"
            >
              <span className="font-semibold text-theme-primary">{category.category}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-theme-muted">{category.items.length} items</span>
                {expandedCategory === category.category ? (
                  <ChevronDown size={18} className="text-theme-muted" />
                ) : (
                  <ChevronRight size={18} className="text-theme-muted" />
                )}
              </div>
            </button>
            {expandedCategory === category.category && (
              <div className="divide-y divide-theme">
                {category.items.map((item, idx) => {
                  const itemKey = `${category.category}-${idx}`
                  return (
                    <div key={idx} className="bg-[var(--bg-card)]">
                      <button
                        onClick={() => setExpandedItem(expandedItem === itemKey ? null : itemKey)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-card-alt/50 transition-colors"
                      >
                        <span className="text-theme-secondary">{item.q}</span>
                        {expandedItem === itemKey ? (
                          <ChevronDown size={16} className="text-theme-muted flex-shrink-0 ml-2" />
                        ) : (
                          <ChevronRight size={16} className="text-theme-muted flex-shrink-0 ml-2" />
                        )}
                      </button>
                      {expandedItem === itemKey && (
                        <div className="px-4 pb-4 text-sm text-theme-muted">
                          {item.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer card with links - only for admins or clients with docs permission */}
      {showDocs && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Documentation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://github.com/mcbile/product-pulse/blob/main/FAQ.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-theme hover:bg-card-alt transition-colors"
            >
              <HelpCircle size={24} className="text-brand" />
              <div>
                <div className="font-medium text-theme-primary">FAQ.md</div>
                <div className="text-xs text-theme-muted">Full FAQ documentation</div>
              </div>
            </a>
            <a
              href="https://github.com/mcbile/product-pulse/blob/main/DEPENDENCIES.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-theme hover:bg-card-alt transition-colors"
            >
              <Server size={24} className="text-blue-500" />
              <div>
                <div className="font-medium text-theme-primary">DEPENDENCIES.md</div>
                <div className="text-xs text-theme-muted">Frontend dependency map</div>
              </div>
            </a>
            <a
              href="https://github.com/mcbile/product-pulse/blob/main/CLAUDE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-theme hover:bg-card-alt transition-colors"
            >
              <Activity size={24} className="text-emerald-500" />
              <div>
                <div className="font-medium text-theme-primary">CLAUDE.md</div>
                <div className="text-xs text-theme-muted">Development instructions</div>
              </div>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function ExportMenu({ currentPage }: { currentPage: Page }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { appliedBrand, appliedCountry } = useFilters()
  const { range } = useTimeRange()

  const filters = {
    brand: appliedBrand,
    country: appliedCountry,
    timeRange: range,
  }

  const getExportData = async (): Promise<{ data: Record<string, unknown>[]; title: string }> => {
    switch (currentPage) {
      case 'overview': {
        const overview = await mockDataAPI.getOverview(filters)
        return { data: [overview as unknown as Record<string, unknown>], title: 'Overview Metrics' }
      }
      case 'finance': {
        const finance = await mockDataAPI.getOverview(filters)
        return { data: [finance as unknown as Record<string, unknown>], title: 'Finance Metrics' }
      }
      case 'psp': {
        const psp = await mockDataAPI.getPSPHealth(filters)
        return { data: psp as unknown as Record<string, unknown>[], title: 'PSP Health' }
      }
      case 'api': {
        const api = await mockDataAPI.getAPIPerformance(filters)
        return { data: api as unknown as Record<string, unknown>[], title: 'API Performance' }
      }
      case 'games': {
        const games = await mockDataAPI.getGameProviders(filters)
        return { data: games as unknown as Record<string, unknown>[], title: 'Game Providers' }
      }
      case 'vitals': {
        const vitals = await mockDataAPI.getWebVitals(filters)
        const vitalsArray = Object.entries(vitals).map(([key, val]) => ({
          metric: key,
          value: val.value,
          rating: val.rating,
        }))
        return { data: vitalsArray, title: 'Web Vitals' }
      }
      case 'alerts': {
        const alerts = await mockDataAPI.getAlerts(filters)
        return { data: alerts as unknown as Record<string, unknown>[], title: 'Alerts' }
      }
      default:
        return { data: [], title: 'Export' }
    }
  }

  const handleExport = async (format: 'csv' | 'md') => {
    setIsExporting(true)
    try {
      const { data, title } = await getExportData()
      if (format === 'csv') {
        exportToCSV(data, title)
      } else {
        exportToMarkdown(data, title)
      }
    } finally {
      setIsExporting(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-secondary flex items-center gap-2"
        disabled={isExporting}
      >
        <Download size={16} className={isExporting ? 'animate-pulse' : ''} />
        {isExporting ? 'Exporting...' : 'Export'}
      </button>
      {isOpen && !isExporting && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 card p-2 min-w-[120px]">
            <button
              onClick={() => handleExport('csv')}
              className="w-full text-left px-3 py-2 text-sm text-theme-secondary hover:bg-card-alt rounded-lg transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('md')}
              className="w-full text-left px-3 py-2 text-sm text-theme-secondary hover:bg-card-alt rounded-lg transition-colors"
            >
              Export Markdown
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const isAdmin = user?.role === 'admin' || isSuperAdmin
  const permissions = user ? getClientPermissions(user.email) : DEFAULT_PERMISSIONS

  // Build available pages based on role and permissions
  // Common pages available to all: overview, alerts, vitals, api, games
  // Restricted pages (admin controls access): finance, psp
  // Admin/Super Admin: users (user management)
  const commonPages: Page[] = ['overview', 'alerts', 'vitals', 'api', 'games', 'faq']
  const restrictedPages: Page[] = isAdmin
    ? ['finance', 'psp']
    : (['finance', 'psp'] as const).filter(p => permissions[p])
  const adminPages: Page[] = isAdmin ? ['users'] : []

  const availablePages: Page[] = [...commonPages, ...restrictedPages, ...adminPages]

  const [currentPage, setCurrentPage] = useState<Page>(() => availablePages[0] || 'overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('pulse-sidebar-collapsed')
    return saved === 'true'
  })

  // Redirect if current page becomes unavailable
  useEffect(() => {
    if (!availablePages.includes(currentPage)) {
      setCurrentPage(availablePages[0] || 'overview')
    }
  }, [availablePages, currentPage])

  // Save sidebar state
  useEffect(() => {
    localStorage.setItem('pulse-sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  const renderPage = () => {
    switch (currentPage) {
      case 'overview': return <OverviewPage />
      case 'vitals': return <WebVitalsPage />
      case 'psp': return <PSPPage />
      case 'api': return <APIPage />
      case 'games': return <GamesPage />
      case 'alerts': return <AlertsPage />
      case 'finance': return <FinancePage />
      case 'users': return <UsersPage />
      case 'faq': return <FAQPage />
      default: return <OverviewPage />
    }
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside
        className={`sidebar flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16 p-2' : 'w-52 p-4'}`}
      >
        {/* Header with Logo */}
        <div className={`flex items-center mb-4 ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center flex-shrink-0">
            <span className="text-white font-extrabold text-2xl">M</span>
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-brand font-bold text-xl leading-tight">Pulse</span>
              <span className="text-theme-muted text-[10px] uppercase tracking-widest font-medium">Product</span>
            </div>
          )}
        </div>

        {/* Collapse/Expand button */}
        <div className="mb-4">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`sidebar-item w-full flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''} text-blue-500 hover:bg-blue-500/10`}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="w-5 flex items-center justify-center flex-shrink-0">
              {sidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </span>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          {availablePages.map((page) => {
            const isActive = currentPage === page
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`sidebar-item w-full flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''} ${isActive ? 'active pointer-events-none' : ''}`}
                title={sidebarCollapsed ? pageConfig[page].label : undefined}
              >
                <span className="w-5 flex items-center justify-center flex-shrink-0">{pageConfig[page].icon}</span>
                {!sidebarCollapsed && <span>{pageConfig[page].label}</span>}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto" style={{ background: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-theme-primary">
              {pageConfig[currentPage].label}
            </h2>
            <p className="text-theme-muted text-sm mt-1">
              Real-time performance monitoring
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <BrandSelector />
            <CountrySelector />
            <TimeRangeSelector />
            <ApplyFiltersButton />
            <ExportMenu currentPage={currentPage} />
            <UserMenu />
          </div>
        </div>

        {/* Page Content */}
        {renderPage()}
      </main>
    </div>
  )
}

function ProtectedApp() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Same Dashboard for both admin and clients (permissions handled inside)
  return (
    <TimeRangeProvider>
      <FiltersProvider>
        <Dashboard />
      </FiltersProvider>
    </TimeRangeProvider>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ProtectedApp />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
