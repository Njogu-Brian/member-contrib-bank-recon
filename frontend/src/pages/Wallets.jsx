import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWallets, createWallet, addContribution, getPenalties } from '../api/wallets'

export default function Wallets() {
  const queryClient = useQueryClient()
  const [contributionForm, setContributionForm] = useState({ amount: '', source: 'manual', reference: '' })
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [penaltiesMemberId, setPenaltiesMemberId] = useState(null)

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: getWallets,
  })

  const { data: penalties = [] } = useQuery({
    queryKey: ['penalties', penaltiesMemberId],
    queryFn: () => getPenalties(penaltiesMemberId),
    enabled: !!penaltiesMemberId,
  })

  const createWalletMutation = useMutation({
    mutationFn: createWallet,
    onSuccess: () => {
      queryClient.invalidateQueries(['wallets'])
    },
  })

  const contributionMutation = useMutation({
    mutationFn: ({ walletId, payload }) => addContribution({ walletId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries(['wallets'])
      setContributionForm({ amount: '', source: 'manual', reference: '' })
      alert('Contribution recorded')
    },
  })

  const handleCreateWallet = () => {
    const memberId = prompt('Enter member ID to create wallet for')
    if (memberId) {
      createWalletMutation.mutate({ member_id: Number(memberId) })
    }
  }

  const handleContributionSubmit = (e) => {
    e.preventDefault()
    if (!selectedWallet) return
    contributionMutation.mutate({
      walletId: selectedWallet.id,
      payload: {
        amount: Number(contributionForm.amount),
        source: contributionForm.source,
        reference: contributionForm.reference,
      },
    })
  }

  if (isLoading) {
    return <div>Loading wallets…</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wallets</h1>
          <p className="text-gray-600">Track balances and contributions for each member.</p>
        </div>
        <button
          onClick={handleCreateWallet}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
        >
          Create Wallet
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className={`border rounded-lg p-4 shadow-sm ${selectedWallet?.id === wallet.id ? 'ring-2 ring-indigo-500' : ''}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Member #{wallet.member_id}</h2>
                <p className="text-gray-600">{wallet.member?.name}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedWallet(wallet)
                  setPenaltiesMemberId(wallet.member_id)
                }}
                className="text-indigo-600 text-sm"
              >
                Manage
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-sm">Balance</p>
                <p className="text-2xl font-bold">KES {Number(wallet.balance).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Locked</p>
                <p className="text-2xl font-bold text-amber-600">KES {Number(wallet.locked_balance).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedWallet && (
        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={handleContributionSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Record Contribution</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                step="0.01"
                required
                value={contributionForm.amount}
                onChange={(e) => setContributionForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Source</label>
              <select
                value={contributionForm.source}
                onChange={(e) => setContributionForm((f) => ({ ...f, source: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="manual">Manual</option>
                <option value="mpesa">MPESA</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reference</label>
              <input
                type="text"
                value={contributionForm.reference}
                onChange={(e) => setContributionForm((f) => ({ ...f, reference: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="inline-flex justify-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
            >
              {contributionMutation.isLoading ? 'Saving…' : 'Record Contribution'}
            </button>
          </form>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Late Payment Penalties</h3>
              <button
                className="text-sm text-indigo-600"
                onClick={() => setPenaltiesMemberId(selectedWallet.member_id)}
              >
                Refresh
              </button>
            </div>
            {penalties && penalties.length > 0 ? (
              <ul className="space-y-3">
                {penalties.map((penalty) => (
                  <li key={penalty.id} className="border rounded p-3">
                    <div className="flex justify-between">
                      <span className="font-medium">KES {Number(penalty.amount).toLocaleString()}</span>
                      <span className="text-sm text-gray-600">{penalty.due_date}</span>
                    </div>
                    <p className="text-sm text-gray-600">{penalty.reason || 'Late contribution'}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No penalties for this member.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

