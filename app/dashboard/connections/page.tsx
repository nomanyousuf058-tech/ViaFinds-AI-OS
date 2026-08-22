'use client'
import React, { useState, useEffect } from 'react'
import { PROVIDER_CATALOG, CATEGORIES, getProviderById } from '@/lib/connections-catalog'

interface Connection {
  _id: string
  name: string
  category: string
  type: string
  providerId: string
  apiKey: string
  rawApiKey?: string
  enabled: boolean
  lastTested?: string
  error?: string | null
  settings?: Record<string, unknown>
  provider?: {
    id: string
    name: string
    category: string
    type: string
    icon: string
    credentialFields?: { key: string; label: string; type: 'password' | 'text'; placeholder?: string }[]
  }
  status: 'connected' | 'disconnected' | 'missing_key' | 'error'
}

interface ModalState {
  open: boolean
  mode: 'add' | 'edit'
  connection?: Connection
  selectedProviderId: string
  name: string
  apiKey: string
  enabled: boolean
  settings: Record<string, unknown>
  error: string
  saving: boolean
  testing: boolean
  testResult: { success: boolean; error?: string } | null
}

const EMPTY_MODAL: ModalState = {
  open: false,
  mode: 'add',
  selectedProviderId: '',
  name: '',
  apiKey: '',
  enabled: true,
  settings: {},
  error: '',
  saving: false,
  testing: false,
  testResult: null,
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [modal, setModal] = useState<ModalState>(EMPTY_MODAL)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string }>>({})

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/connections')
      const data = await res.json()
      if (data.success) {
        setConnections(data.data || [])
      }
    } catch (e) {
      console.error('Failed to fetch connections:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  const getConnection = (providerId: string): Connection | undefined => {
    return connections.find(c => c.providerId === providerId)
  }

  const handleAdd = () => {
    setModal({
      ...EMPTY_MODAL,
      open: true,
      mode: 'add',
      selectedProviderId: '',
      name: '',
      apiKey: '',
      enabled: true,
      settings: {},
    })
  }

  const handleQuickAdd = (providerId: string) => {
    const provider = getProviderById(providerId)
    setModal({
      ...EMPTY_MODAL,
      open: true,
      mode: 'add',
      selectedProviderId: providerId,
      name: provider?.name || '',
      apiKey: '',
      enabled: true,
      settings: {},
    })
  }

  const handleEdit = (connection: Connection) => {
    setModal({
      ...EMPTY_MODAL,
      open: true,
      mode: 'edit',
      connection,
      selectedProviderId: connection.providerId,
      name: connection.name,
      apiKey: '',
      enabled: connection.enabled,
      settings: connection.settings || {},
      error: '',
      testResult: null,
    })
  }

  const handleDelete = async (connection: Connection) => {
    if (!confirm(`Delete connection "${connection.name}"?`)) return
    try {
      const res = await fetch(`/api/connections/${connection._id}`, { method: 'DELETE' })
      if (res.ok) {
        setConnections(prev => prev.filter(c => c._id !== connection._id))
      }
    } catch (e) {
      console.error('Failed to delete connection:', e)
    }
  }

  const handleSave = async () => {
    if (!modal.name || !modal.selectedProviderId) {
      setModal(prev => ({ ...prev, error: 'Name and provider are required' }))
      return
    }

    setModal(prev => ({ ...prev, saving: true, error: '' }))
    try {
      const body: Record<string, unknown> = {
        name: modal.name,
        providerId: modal.selectedProviderId,
        apiKey: modal.apiKey,
        enabled: modal.enabled,
        settings: modal.settings,
      }

      if (modal.mode === 'edit' && modal.connection?._id) {
        body._id = modal.connection._id
      }

      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success) {
        fetchConnections()
        setModal(EMPTY_MODAL)
      } else {
        setModal(prev => ({ ...prev, error: data.error || 'Failed to save', saving: false }))
      }
    } catch {
      setModal(prev => ({ ...prev, error: 'Failed to save connection', saving: false }))
    }
  }

  const handleTest = async (connection: Connection) => {
    setTestingId(connection.providerId)
    setTestResults(prev => ({ ...prev, [connection.providerId]: { success: false, error: 'Testing...' } }))
    try {
      const res = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: connection._id }),
      })
      const data = await res.json()
      setTestResults(prev => ({ ...prev, [connection.providerId]: { success: data.success, error: data.error } }))
      // Update local state with the test result
      setConnections(prev => prev.map(c => {
        if (c._id === connection._id) {
          return {
            ...c,
            lastTested: new Date().toISOString(),
            error: data.success ? null : (data.error || 'Test failed'),
            status: data.success ? 'connected' : 'error',
          }
        }
        return c
      }))
    } catch {
      setTestResults(prev => ({ ...prev, [connection.providerId]: { success: false, error: 'Network error' } }))
    } finally {
      setTestingId(null)
    }
  }

  const handleTestFromModal = async () => {
    if (!modal.apiKey) {
      setModal(prev => ({ ...prev, testResult: { success: false, error: 'Enter an API key to test' } }))
      return
    }
    setModal(prev => ({ ...prev, testing: true, testResult: null }))
    try {
      const res = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: modal.selectedProviderId, apiKey: modal.apiKey }),
      })
      const data = await res.json()
      setModal(prev => ({ ...prev, testing: false, testResult: { success: data.success, error: data.error } }))
    } catch {
      setModal(prev => ({ ...prev, testing: false, testResult: { success: false, error: 'Network error' } }))
    }
  }

  const handleToggleEnable = async (connection: Connection) => {
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: connection._id, enabled: !connection.enabled }),
      })
      if (res.ok) {
        setConnections(prev => prev.map(c => c._id === connection._id ? { ...c, enabled: !c.enabled } : c))
      }
    } catch (e) {
      console.error('Failed to toggle connection:', e)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleString()
  }

  const getStatusBadge = (status: string, _error?: string | null) => {
    if (status === 'disconnected') {
      return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-[#ffebee] text-[#ba1a1a] border border-[#ffdad6]">Disabled</span>
    }
    if (status === 'error') {
      return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-[#ffebee] text-[#ba1a1a] border border-[#ffdad6]">Error</span>
    }
    if (status === 'connected') {
      return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-[#e2e7ff] text-[#006a61] border border-[#c5c5d7]">Connected</span>
    }
    return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-[#fff8e1] text-[#f57c00] border border-[#ffe0b2]">Missing Key</span>
  }

  const filteredCategories = CATEGORIES.filter(cat => {
    if (!searchQuery) return true
    return PROVIDER_CATALOG.some(p => {
      if (p.category !== cat) return false
      const conn = getConnection(p.id)
      const nameMatch = (p.name || conn?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      const idMatch = p.id.toLowerCase().includes(searchQuery.toLowerCase())
      return nameMatch || idMatch
    })
  })

  if (loading) {
    return <div className="p-8 text-center text-[#757686]">Loading connections...</div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-[28px] font-bold text-[#131b2e] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0426be]" style={{ fontVariationSettings: "'FILL' 1" }}>memory</span>
            Connection Center
          </h2>
          <p className="text-[14px] text-[#444655] mt-1">Manage integrations, credentials, and service health across all platforms.</p>
        </div>
        <button
          onClick={handleAdd}
          className="h-9 px-4 bg-[#0426be] text-white hover:bg-[#031d99] rounded text-[12px] font-semibold tracking-[0.05em] transition-colors flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          ADD CONNECTION
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#757686] text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connections..."
            className="w-full pl-10 pr-4 py-2 border border-[#c5c5d7] rounded-lg text-[14px] text-[#131b2e] placeholder:text-[#757686] focus:outline-none focus:ring-2 focus:ring-[#0426be] bg-white"
          />
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#757686]">
          <span className="material-symbols-outlined text-[16px]">info</span>
          {connections.filter(c => c.status === 'connected').length} of {connections.length} connected
        </div>
      </div>

      {filteredCategories.map(category => {
        const providersInCategory = PROVIDER_CATALOG.filter(p => p.category === category)
        const catalogRows = providersInCategory.map(provider => {
          const connection = getConnection(provider.id)
          return {
            provider,
            connection,
            status: connection?.status || 'missing_key',
            lastTested: connection?.lastTested,
            error: connection?.error,
          }
        })

        const customInCategory = connections
          .filter(c => c.category === category && !PROVIDER_CATALOG.some(p => p.id === c.providerId))
          .map(connection => ({
            provider: {
              id: connection.providerId,
              name: connection.name,
              category: connection.category,
              type: connection.type,
              icon: 'link',
            } as Connection['provider'],
            connection,
            status: connection.status,
            lastTested: connection.lastTested,
            error: connection.error,
          }))

        const allRows = [...catalogRows, ...customInCategory]

        const rows = searchQuery
          ? allRows.filter(row => {
              const name = (row.provider?.name || row.connection?.name || '').toLowerCase()
              const id = row.provider?.id?.toLowerCase() || ''
              return name.includes(searchQuery.toLowerCase()) || id.includes(searchQuery.toLowerCase())
            })
          : allRows

        if (rows.length === 0) return null

        return (
          <div key={category} className="mb-8">
            <h3 className="text-[14px] font-semibold tracking-[0.05em] uppercase text-[#757686] mb-4 flex items-center gap-2">
              {category}
              <span className="text-[11px] font-normal normal-case tracking-normal text-[#9ca3af]">
                ({rows.filter(r => r.status === 'connected').length}/{rows.length})
              </span>
            </h3>
            <div className="bg-white border border-[#c5c5d7] rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#faf8ff] border-b border-[#c5c5d7]">
                    <th className="text-[12px] font-semibold tracking-[0.05em] text-[#444655] p-4 py-3 w-64">NAME</th>
                    <th className="text-[12px] font-semibold tracking-[0.05em] text-[#444655] p-4 py-3 w-36">STATUS</th>
                    <th className="text-[12px] font-semibold tracking-[0.05em] text-[#444655] p-4 py-3 w-40">LAST TESTED</th>
                    <th className="text-[12px] font-semibold tracking-[0.05em] text-[#444655] p-4 py-3">ERROR / NOTES</th>
                    <th className="text-[12px] font-semibold tracking-[0.05em] text-[#444655] p-4 py-3 text-right w-64">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="text-[14px] text-[#131b2e] divide-y divide-[#c5c5d7]">
                  {rows.map(({ provider, connection, status, lastTested, error }) => {
                    const isTesting = testingId === provider!.id
                    const testResult = testResults[provider!.id]
                    const displayName = connection?.name || provider!.name
                    const showAdd = !connection

                    return (
                      <tr key={provider!.id} className="hover:bg-[#f1f5f9] transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[#757686] group-hover:text-[#0426be] transition-colors text-[20px]">
                              {provider!.icon}
                            </span>
                            <div>
                              <div className="font-semibold text-[#131b2e]">{displayName}</div>
                              <div className="text-[11px] text-[#757686] font-mono">{provider!.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(status, error)}
                        </td>
                        <td className="p-4 text-[13px] text-[#757686] font-mono">
                          {formatDate(lastTested)}
                        </td>
                        <td className="p-4 text-[13px]">
                          {error ? (
                            <span className="text-[#ba1a1a] font-mono text-[12px]">{error}</span>
                          ) : testResult?.error ? (
                            <span className={`text-[12px] font-mono ${testResult.success ? 'text-[#006a61]' : 'text-[#ba1a1a]'}`}>
                              {testResult.error}
                            </span>
                          ) : (
                            <span className="text-[#9ca3af] text-[12px]">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {showAdd ? (
                              <button
                                onClick={() => handleQuickAdd(provider!.id)}
                                className="text-[12px] font-semibold px-3 py-1.5 rounded bg-[#0426be] text-white hover:bg-[#031d99] transition-colors flex items-center gap-1"
                                title="Add Connection"
                              >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                Add
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => connection && handleTest(connection)}
                                  disabled={isTesting}
                                  className="text-[12px] font-semibold px-2.5 py-1.5 rounded border border-[#c5c5d7] text-[#444655] hover:bg-[#f2f3ff] hover:text-[#0426be] hover:border-[#0426be] transition-colors disabled:opacity-50 flex items-center gap-1"
                                  title="Test Connection"
                                >
                                  {isTesting ? (
                                    <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                                  ) : (
                                    <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                                  )}
                                  Test
                                </button>
                                <button
                                  onClick={() => connection && handleToggleEnable(connection)}
                                  className={`text-[12px] font-semibold px-2.5 py-1.5 rounded border transition-colors flex items-center gap-1 ${
                                    connection?.enabled
                                      ? 'border-[#c5c5d7] text-[#444655] hover:bg-[#f2f3ff] hover:text-[#006a61]'
                                      : 'border-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffebee]'
                                  }`}
                                  title={connection?.enabled ? 'Disable' : 'Enable'}
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    {connection?.enabled ? 'toggle_on' : 'toggle_off'}
                                  </span>
                                </button>
                                <button
                                  onClick={() => connection && handleEdit(connection)}
                                  className="text-[12px] font-semibold px-2.5 py-1.5 rounded border border-[#c5c5d7] text-[#444655] hover:bg-[#f2f3ff] hover:text-[#0426be] hover:border-[#0426be] transition-colors flex items-center gap-1"
                                  title="Edit Credentials"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                  Edit
                                </button>
                                <button
                                  onClick={() => connection && handleDelete(connection)}
                                  className="text-[12px] font-semibold px-2.5 py-1.5 rounded border border-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffebee] transition-colors flex items-center gap-1"
                                  title="Delete"
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {filteredCategories.length === 0 && (
        <div className="bg-white border border-[#c5c5d7] rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] mb-4 block">search_off</span>
          <p className="text-[#757686] text-[14px]">No connections match your search.</p>
          <button onClick={() => setSearchQuery('')} className="mt-4 text-[#0426be] hover:underline text-[12px] font-semibold">Clear search</button>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(EMPTY_MODAL)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-[#c5c5d7] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#c5c5d7] bg-[#faf8ff] flex justify-between items-center">
              <h3 className="text-[18px] font-semibold text-[#131b2e]">
                {modal.mode === 'add' ? 'Add Connection' : 'Edit Connection'}
              </h3>
              <button onClick={() => setModal(EMPTY_MODAL)} className="text-[#757686] hover:text-[#131b2e]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {modal.mode === 'add' && (
                <div>
                  <label className="block text-[12px] font-semibold tracking-[0.05em] text-[#757686] mb-1.5">PROVIDER</label>
                  <select
                    value={modal.selectedProviderId}
                    onChange={(e) => {
                      const providerId = e.target.value
                      const provider = getProviderById(providerId)
                      setModal(prev => ({
                        ...prev,
                        selectedProviderId: providerId,
                        name: provider?.name || prev.name,
                      }))
                    }}
                    className="w-full border border-[#c5c5d7] rounded px-3 py-2 text-[14px] text-[#131b2e] bg-white focus:outline-none focus:ring-2 focus:ring-[#0426be]"
                  >
                    <option value="">Select a provider...</option>
                    {CATEGORIES.map(cat => (
                      <optgroup key={cat} label={cat}>
                        {PROVIDER_CATALOG.filter(p => p.category === cat).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="__custom">Custom Connection...</option>
                  </select>
                </div>
              )}

              {modal.selectedProviderId === '__custom' ? (
                <>
                  <div>
                    <label className="block text-[12px] font-semibold tracking-[0.05em] text-[#757686] mb-1.5">NAME</label>
                    <input
                      type="text"
                      value={modal.name}
                      onChange={(e) => setModal(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Connection name"
                      className="w-full border border-[#c5c5d7] rounded px-3 py-2 text-[14px] text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#0426be]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold tracking-[0.05em] text-[#757686] mb-1.5">CATEGORY</label>
                    <select
                      value={(modal.settings?.category as string) || ''}
                      onChange={(e) => setModal(prev => ({ ...prev, settings: { ...prev.settings, category: e.target.value } }))}
                      className="w-full border border-[#c5c5d7] rounded px-3 py-2 text-[14px] text-[#131b2e] bg-white focus:outline-none focus:ring-2 focus:ring-[#0426be]"
                    >
                      <option value="">Select category...</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[12px] font-semibold tracking-[0.05em] text-[#757686] mb-1.5">NAME</label>
                  <input
                    type="text"
                    value={modal.name}
                    onChange={(e) => setModal(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Connection name"
                    className="w-full border border-[#c5c5d7] rounded px-3 py-2 text-[14px] text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#0426be]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[12px] font-semibold tracking-[0.05em] text-[#757686] mb-1.5">API KEY / CREDENTIAL</label>
                <input
                  type="password"
                  value={modal.apiKey}
                  onChange={(e) => setModal(prev => ({ ...prev, apiKey: e.target.value, testResult: null }))}
                  placeholder={modal.mode === 'edit' ? 'Leave empty to keep current' : 'Enter API key'}
                  className="w-full border border-[#c5c5d7] rounded px-3 py-2 text-[14px] text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#0426be]"
                />
                {modal.mode === 'edit' && (
                  <p className="text-[11px] text-[#757686] mt-1">Leave empty to keep the existing key.</p>
                )}
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-[14px] font-medium text-[#131b2e]">Enabled</span>
                <div className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in">
                  <input
                    type="checkbox"
                    checked={modal.enabled}
                    onChange={(e) => setModal(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-[#757686] appearance-none cursor-pointer checked:bg-white checked:border-[#0426be]"
                  />
                  <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${modal.enabled ? 'bg-[#0426be]' : 'bg-[#757686]'}`}></label>
                </div>
              </div>

              {modal.testResult && (
                <div className={`p-3 rounded-lg text-[13px] ${modal.testResult.success ? 'bg-[#e2e7ff] text-[#006a61] border border-[#c5c5d7]' : 'bg-[#ffebee] text-[#ba1a1a] border border-[#ffdad6]'}`}>
                  {modal.testResult.success ? 'Connection test passed.' : `Test failed: ${modal.testResult.error}`}
                </div>
              )}

              {modal.error && (
                <div className="p-3 rounded-lg bg-[#ffebee] text-[#ba1a1a] border border-[#ffdad6] text-[13px]">
                  {modal.error}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[#c5c5d7] flex items-center justify-between">
              <button
                onClick={handleTestFromModal}
                disabled={modal.testing || !modal.apiKey}
                className="h-9 px-4 border border-[#c5c5d7] text-[#444655] hover:bg-[#f2f3ff] hover:text-[#0426be] rounded text-[12px] font-semibold tracking-[0.05em] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {modal.testing ? (
                  <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                )}
                TEST
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModal(EMPTY_MODAL)}
                  className="h-9 px-4 border border-[#c5c5d7] text-[#444655] hover:bg-[#f2f3ff] rounded text-[12px] font-semibold tracking-[0.05em] transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSave}
                  disabled={modal.saving}
                  className="h-9 px-6 bg-[#0426be] text-white hover:bg-[#031d99] rounded text-[12px] font-semibold tracking-[0.05em] transition-colors disabled:opacity-50"
                >
                  {modal.saving ? 'SAVING...' : 'SAVE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
