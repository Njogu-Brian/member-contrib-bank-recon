import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMembers } from '../api/members'

export default function MemberSearchModal({ isOpen, onClose, onSelect, title = 'Select Member', preSelectedId = null }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState(preSelectedId ? preSelectedId.toString() : '')

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['members', 'search', searchTerm],
    queryFn: () => getMembers({ search: searchTerm, per_page: 100 }),
    enabled: isOpen,
  })

  useEffect(() => {
    if (preSelectedId) {
      setSelectedMemberId(preSelectedId.toString())
    }
  }, [preSelectedId])

  const members = membersData?.data || []

  const filteredMembers = members.filter(member => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      member.name?.toLowerCase().includes(search) ||
      member.phone?.toLowerCase().includes(search) ||
      member.email?.toLowerCase().includes(search) ||
      member.member_code?.toLowerCase().includes(search)
    )
  })

  const handleSelect = () => {
    if (selectedMemberId) {
      const member = members.find(m => m.id.toString() === selectedMemberId)
      if (member) {
        onSelect(member)
        setSearchTerm('')
        setSelectedMemberId('')
      }
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-gray-900/95 px-4 py-10 md:items-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-3xl border-2 border-gray-300 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Quick switch</p>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            Esc
          </button>
        </div>

        <div className="mt-6">
          <input
            type="text"
            placeholder="Search by name, phone, code…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border-2 border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            autoFocus
          />
        </div>

        <div className="mt-4 max-h-96 overflow-y-auto rounded-2xl border-2 border-gray-300 bg-white">
          {isLoading ? (
            <div className="p-6 text-center text-gray-600">Searching members…</div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-6 text-center text-gray-600">No members match "{searchTerm}".</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredMembers.map((member) => {
                const isSelected = selectedMemberId === member.id.toString()
                return (
                  <li
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id.toString())}
                    className={`cursor-pointer px-5 py-4 transition bg-white ${
                      isSelected ? 'bg-brand-50 border-l-4 border-brand-500' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                        <div className="text-xs text-gray-600">
                          {[member.phone, member.email, member.member_code]
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                          Selected
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedMemberId}
            className="rounded-2xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  )
}

