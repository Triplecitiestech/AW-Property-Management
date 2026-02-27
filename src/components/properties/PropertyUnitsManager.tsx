'use client'

import { useState, useTransition } from 'react'
import BulkUnitCreateModal from './BulkUnitCreateModal'
import { createUnit, deleteUnit, updateUnit } from '@/lib/actions/units'
import { unitLabel, unitsLabel } from '@/lib/unit-parser'

type Unit = {
  id: string
  identifier: string
  name: string | null
  floor: number | null
  notes: string | null
  is_active: boolean
  sort_order: number
}

export default function PropertyUnitsManager({
  propertyId,
  propertyType,
  initialUnits,
}: {
  propertyId: string
  propertyType: string
  initialUnits: Unit[]
}) {
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newIdentifier, setNewIdentifier] = useState('')
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editIdentifier, setEditIdentifier] = useState('')
  const [editName, setEditName] = useState('')
  const [isPending, startTransition] = useTransition()

  const singular = unitLabel(propertyType)
  const plural = unitsLabel(propertyType)
  const existingIds = units.map(u => u.identifier)

  function handleBulkCreated(count: number) {
    // Refresh the page to pick up new units; the server component holds the full list
    window.location.reload()
  }

  function handleAddSingle() {
    if (!newIdentifier.trim()) return
    setAddError(null)
    startTransition(async () => {
      const res = await createUnit(propertyId, newIdentifier.trim(), newName.trim() || undefined)
      if ('error' in res) {
        setAddError(res.error)
      } else {
        setUnits(prev => [...prev, {
          id: res.unit.id,
          identifier: res.unit.identifier,
          name: newName.trim() || null,
          floor: null,
          notes: null,
          is_active: true,
          sort_order: prev.length,
        }])
        setNewIdentifier('')
        setNewName('')
        setShowAddForm(false)
      }
    })
  }

  function startEdit(unit: Unit) {
    setEditingId(unit.id)
    setEditIdentifier(unit.identifier)
    setEditName(unit.name ?? '')
  }

  function handleSaveEdit(unitId: string) {
    startTransition(async () => {
      await updateUnit(unitId, { identifier: editIdentifier, name: editName })
      setUnits(prev => prev.map(u => u.id === unitId
        ? { ...u, identifier: editIdentifier.trim().toUpperCase(), name: editName.trim() || null }
        : u
      ))
      setEditingId(null)
    })
  }

  function handleToggleActive(unit: Unit) {
    startTransition(async () => {
      await updateUnit(unit.id, { is_active: !unit.is_active })
      setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, is_active: !u.is_active } : u))
    })
  }

  function handleDelete(unit: Unit) {
    if (!confirm(`Delete ${singular} "${unit.identifier}"? Work orders and stays linked to this ${singular.toLowerCase()} will be unlinked.`)) return
    startTransition(async () => {
      await deleteUnit(unit.id, propertyId)
      setUnits(prev => prev.filter(u => u.id !== unit.id))
    })
  }

  const activeUnits   = units.filter(u => u.is_active)
  const inactiveUnits = units.filter(u => !u.is_active)

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm text-white">{plural}</h3>
          <p className="text-xs text-[#6480a0] mt-0.5">
            {activeUnits.length} active{inactiveUnits.length > 0 ? `, ${inactiveUnits.length} inactive` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAddForm(v => !v); setAddError(null) }}
            className="btn-secondary text-xs"
          >
            + Add {singular}
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="btn-secondary text-xs"
          >
            Bulk Add
          </button>
        </div>
      </div>

      {/* Single-add form */}
      {showAddForm && (
        <div className="mb-4 p-4 rounded-xl bg-[#1a2436] border border-[#2a3d58] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">{singular} # / ID *</label>
              <input
                type="text"
                className="form-input text-sm font-mono"
                placeholder="101 or 56A"
                value={newIdentifier}
                onChange={e => setNewIdentifier(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSingle()}
              />
            </div>
            <div>
              <label className="form-label text-xs">Display Name (optional)</label>
              <input
                type="text"
                className="form-input text-sm"
                placeholder="Corner Suite"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSingle()}
              />
            </div>
          </div>
          {addError && <p className="text-xs text-red-400">{addError}</p>}
          <div className="flex gap-2">
            <button onClick={handleAddSingle} disabled={isPending || !newIdentifier.trim()}
              className="btn-primary text-xs">
              {isPending ? 'Adding…' : `Add ${singular}`}
            </button>
            <button onClick={() => { setShowAddForm(false); setAddError(null) }}
              className="btn-secondary text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Unit list */}
      {units.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-[#4a6080]">No {plural.toLowerCase()} added yet.</p>
          <p className="text-xs text-[#3a5060] mt-1">
            Use &quot;Bulk Add&quot; to create many at once from a range like 101–150.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#1e2d42]">
          {[...activeUnits, ...inactiveUnits].map(unit => (
            <div key={unit.id} className={`py-2.5 flex items-center gap-3 ${!unit.is_active ? 'opacity-50' : ''}`}>
              {editingId === unit.id ? (
                <>
                  <input
                    type="text"
                    className="form-input text-xs font-mono w-24"
                    value={editIdentifier}
                    onChange={e => setEditIdentifier(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-input text-xs flex-1"
                    value={editName}
                    placeholder="Display name (optional)"
                    onChange={e => setEditName(e.target.value)}
                  />
                  <button onClick={() => handleSaveEdit(unit.id)} disabled={isPending}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="text-xs text-[#6480a0] hover:text-white transition-colors">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="font-mono text-sm font-semibold text-white w-16 flex-shrink-0">
                    {unit.identifier}
                  </span>
                  {unit.name && (
                    <span className="text-sm text-[#8aa0be] flex-1 truncate">{unit.name}</span>
                  )}
                  {!unit.name && <span className="flex-1" />}

                  {!unit.is_active && (
                    <span className="text-[10px] text-[#4a6080] bg-[#1e2d42] rounded-full px-2 py-0.5">
                      inactive
                    </span>
                  )}

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(unit)}
                      className="text-xs text-[#6480a0] hover:text-white transition-colors">
                      Edit
                    </button>
                    <button onClick={() => handleToggleActive(unit)}
                      className="text-xs text-[#6480a0] hover:text-white transition-colors">
                      {unit.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDelete(unit)}
                      className="text-xs text-red-500/70 hover:text-red-400 transition-colors">
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bulk modal */}
      {showBulkModal && (
        <BulkUnitCreateModal
          propertyId={propertyId}
          existingIdentifiers={existingIds}
          unitLabel={singular}
          onClose={() => setShowBulkModal(false)}
          onCreated={handleBulkCreated}
        />
      )}
    </div>
  )
}
