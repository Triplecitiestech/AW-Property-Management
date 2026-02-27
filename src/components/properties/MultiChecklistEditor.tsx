'use client'

import { useState, useTransition } from 'react'
import {
  saveChecklistItemsForChecklist,
  deletePropertyChecklist,
  toggleChecklistEnabled,
  toggleChecklistItem,
  resetChecklistChecksForChecklist,
  createPropertyChecklist,
} from '@/lib/actions/checklist'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/checklist-defaults'

type ChecklistItem = { id: string; label: string; is_checked: boolean }
type Checklist = {
  id: string
  name: string
  category: string
  enabled: boolean
  items: ChecklistItem[]
}

const ALL_CATEGORIES = ['cleaning', 'maintenance', 'landscaping', 'general', 'other']

export default function MultiChecklistEditor({
  propertyId,
  initialChecklists,
}: {
  propertyId: string
  initialChecklists: Checklist[]
}) {
  const [checklists, setChecklists] = useState<Checklist[]>(initialChecklists)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [editLabels, setEditLabels] = useState<Record<string, string[]>>({})
  const [isPending, startTransition] = useTransition()
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('general')

  function toggleCollapse(id: string) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function startEdit(cl: Checklist) {
    setEditLabels(prev => ({ ...prev, [cl.id]: cl.items.map(i => i.label) }))
    setEditMode(prev => ({ ...prev, [cl.id]: true }))
  }

  function cancelEdit(id: string) {
    setEditMode(prev => ({ ...prev, [id]: false }))
  }

  function handleToggleItem(checklistId: string, item: ChecklistItem) {
    if (item.id.startsWith('temp-')) return
    setChecklists(prev => prev.map(cl =>
      cl.id !== checklistId ? cl : {
        ...cl,
        items: cl.items.map(i => i.id === item.id ? { ...i, is_checked: !i.is_checked } : i)
      }
    ))
    startTransition(async () => {
      await toggleChecklistItem(item.id, !item.is_checked)
    })
  }

  function handleResetChecks(checklistId: string) {
    setChecklists(prev => prev.map(cl =>
      cl.id !== checklistId ? cl : { ...cl, items: cl.items.map(i => ({ ...i, is_checked: false })) }
    ))
    startTransition(async () => {
      await resetChecklistChecksForChecklist(checklistId)
    })
  }

  function handleSaveEdit(cl: Checklist) {
    const labels = (editLabels[cl.id] ?? []).filter(Boolean)
    startTransition(async () => {
      const result = await saveChecklistItemsForChecklist(cl.id, propertyId, labels)
      if (!result.error) {
        setChecklists(prev => prev.map(c =>
          c.id !== cl.id ? c : {
            ...c,
            items: labels.map((label, i) => ({ id: `temp-${i}`, label, is_checked: false }))
          }
        ))
        setEditMode(prev => ({ ...prev, [cl.id]: false }))
      }
    })
  }

  function handleToggleEnabled(cl: Checklist) {
    setChecklists(prev => prev.map(c => c.id === cl.id ? { ...c, enabled: !c.enabled } : c))
    startTransition(async () => {
      await toggleChecklistEnabled(cl.id, !cl.enabled, propertyId)
    })
  }

  function handleDelete(cl: Checklist) {
    if (!confirm(`Delete "${cl.name}"? All items will be permanently removed.`)) return
    setChecklists(prev => prev.filter(c => c.id !== cl.id))
    startTransition(async () => {
      await deletePropertyChecklist(cl.id, propertyId)
    })
  }

  function handleAddChecklist() {
    if (!newName.trim()) return
    startTransition(async () => {
      const result = await createPropertyChecklist(propertyId, newName.trim(), newCategory)
      if (!result.error && result.id) {
        setChecklists(prev => [...prev, { id: result.id!, name: newName.trim(), category: newCategory, enabled: true, items: [] }])
        setNewName('')
        setNewCategory('general')
        setAddingNew(false)
      }
    })
  }

  const colors = (cat: string) => CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other

  return (
    <div className="space-y-3">
      {checklists.map(cl => {
        const isCollapsed = collapsed[cl.id] ?? false
        const isEditing = editMode[cl.id] ?? false
        const c = colors(cl.category)
        const checkedCount = cl.items.filter(i => i.is_checked).length
        const totalCount = cl.items.length

        return (
          <div key={cl.id} className={`rounded-xl border ${c.border} bg-[#0f1829] overflow-hidden transition-all`}>
            {/* Checklist header */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Collapse toggle */}
              <button
                type="button"
                onClick={() => toggleCollapse(cl.id)}
                className="text-[#4a6080] hover:text-white transition-colors flex-shrink-0"
              >
                <svg className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${c.badge}`}>
                    {CATEGORY_LABELS[cl.category] ?? cl.category}
                  </span>
                  <span className="font-medium text-[#cbd5e1] text-sm">{cl.name}</span>
                  {totalCount > 0 && (
                    <span className="text-xs text-[#4a6080]">
                      {checkedCount}/{totalCount}
                    </span>
                  )}
                  {!cl.enabled && (
                    <span className="text-xs text-[#4a6080] italic">disabled</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleEnabled(cl)}
                  disabled={isPending}
                  title={cl.enabled ? 'Disable checklist' : 'Enable checklist'}
                  className={`text-xs px-2 py-1 rounded border transition-all ${
                    cl.enabled
                      ? 'border-[#2a3d58] text-[#6480a0] hover:border-red-500/40 hover:text-red-400'
                      : 'border-teal-500/30 text-teal-400 hover:border-teal-400'
                  }`}
                >
                  {cl.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cl)}
                  disabled={isPending}
                  title="Delete checklist"
                  className="text-[#4a6080] hover:text-red-400 transition-colors p-1 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Checklist body — collapsible */}
            {!isCollapsed && (
              <div className="px-4 pb-4 border-t border-[#1e2d42] pt-3">
                {isEditing ? (
                  /* Edit mode */
                  <div className="space-y-2">
                    {(editLabels[cl.id] ?? []).map((label, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[#6480a0] text-xs w-5 text-right">{idx + 1}.</span>
                        <input
                          type="text"
                          value={label}
                          onChange={e => setEditLabels(prev => ({
                            ...prev,
                            [cl.id]: (prev[cl.id] ?? []).map((v, i) => i === idx ? e.target.value : v)
                          }))}
                          className="form-input text-sm flex-1"
                          placeholder="Checklist item…"
                        />
                        <button
                          type="button"
                          onClick={() => setEditLabels(prev => ({ ...prev, [cl.id]: (prev[cl.id] ?? []).filter((_, i) => i !== idx) }))}
                          className="text-[#6480a0] hover:text-red-400 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEditLabels(prev => ({ ...prev, [cl.id]: [...(prev[cl.id] ?? []), ''] }))}
                      className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors mt-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add item
                    </button>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleSaveEdit(cl)} disabled={isPending} className="btn-primary text-sm">
                        {isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => cancelEdit(cl.id)} className="btn-secondary text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  /* Check mode */
                  <div className="space-y-2">
                    {cl.items.length === 0 ? (
                      <p className="text-xs text-[#4a6080]">No items yet. Click Edit to add some.</p>
                    ) : (
                      <div className="space-y-1">
                        {[...cl.items].sort((a, b) => (a.is_checked === b.is_checked ? 0 : a.is_checked ? 1 : -1)).map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleToggleItem(cl.id, item)}
                            disabled={item.id.startsWith('temp-') || isPending || !cl.enabled}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all
                              ${item.is_checked ? 'bg-[#0f1829] opacity-50' : 'bg-[#1a2436] hover:bg-[#1e2d42]'}
                              ${!cl.enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all
                              ${item.is_checked ? `${c.bg} border-transparent` : 'border-[#3a4d60] bg-transparent'}`}>
                              {item.is_checked && (
                                <svg className={`w-2.5 h-2.5 ${c.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-sm flex-1 ${item.is_checked ? 'line-through text-[#6480a0]' : 'text-[#cbd5e1]'}`}>
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-2">
                        {checkedCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleResetChecks(cl.id)}
                            disabled={isPending}
                            className="text-xs text-[#6480a0] hover:text-white border border-[#2a3d58] hover:border-[#4a5d70] px-2.5 py-1 rounded-lg transition-all"
                          >
                            Reset ({checkedCount})
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => startEdit(cl)}
                        className={`text-xs ${c.text} hover:opacity-70 transition-opacity`}
                      >
                        Edit checklist →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Add new checklist */}
      {addingNew ? (
        <div className="rounded-xl border border-[#2a3d58] bg-[#0f1829] p-4 space-y-3">
          <p className="text-sm font-medium text-white">New Checklist</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">Category</label>
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="form-select text-sm">
                {ALL_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Deep Clean"
                className="form-input text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddChecklist} disabled={isPending || !newName.trim()} className="btn-primary text-sm">
              {isPending ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => setAddingNew(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#2a3d58]
                     text-sm text-[#6480a0] hover:text-white hover:border-[#4a5d70] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Checklist
        </button>
      )}
    </div>
  )
}
