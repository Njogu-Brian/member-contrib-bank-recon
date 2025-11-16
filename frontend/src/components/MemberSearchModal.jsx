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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={onClose}>
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
          
          {/* Search Input */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
          </div>

          {/* Members List */}
          <div className="mb-4 max-h-96 overflow-y-auto border border-gray-200 rounded-md">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading members...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No members found</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id.toString())}
                    className={`p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedMemberId === member.id.toString() ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{member.name}</div>
                        {member.phone && (
                          <div className="text-sm text-gray-500">Phone: {member.phone}</div>
                        )}
                        {member.email && (
                          <div className="text-sm text-gray-500">Email: {member.email}</div>
                        )}
                        {member.member_code && (
                          <div className="text-sm text-gray-500">Code: {member.member_code}</div>
                        )}
                      </div>
                      {selectedMemberId === member.id.toString() && (
                        <div className="text-indigo-600">✓</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedMemberId}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

