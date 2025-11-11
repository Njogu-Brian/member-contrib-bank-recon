import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../api/transactions';
import { membersApi } from '../api/members';
import toast from 'react-hot-toast';

export default function DraftAssignments() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'draft', page],
    queryFn: () => transactionsApi.list({ page, status: 'draft', per_page: 20 }),
  });

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.list({ per_page: 1000 }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, data }) => transactionsApi.assign(id, data),
    onSuccess: () => {
      toast.success('Transaction assigned successfully');
      queryClient.invalidateQueries(['transactions']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Assignment failed');
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (assignments) => {
      // Assign all transactions
      return Promise.all(
        assignments.map(({ transactionId, memberId }) =>
          transactionsApi.assign(transactionId, { member_id: memberId })
        )
      );
    },
    onSuccess: () => {
      toast.success('Bulk assignment completed');
      queryClient.invalidateQueries(['transactions']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Bulk assignment failed');
    },
  });

  const handleAssign = (transaction, memberId) => {
    assignMutation.mutate({
      id: transaction.id,
      data: { member_id: memberId },
    });
  };

  const handleBulkAssign = () => {
    const assignments = [];
    data?.data?.forEach((transaction) => {
      if (transaction.draft_member_ids && transaction.draft_member_ids.length === 1) {
        assignments.push({
          transactionId: transaction.id,
          memberId: transaction.draft_member_ids[0],
        });
      }
    });

    if (assignments.length === 0) {
      toast.error('No transactions with single draft member found');
      return;
    }

    if (window.confirm(`Assign ${assignments.length} transactions to their suggested members?`)) {
      bulkAssignMutation.mutate(assignments);
    }
  };

  const totalPages = data?.last_page || 1;
  const currentPage = data?.current_page || page;

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Draft Assignments</h1>
        <button
          onClick={handleBulkAssign}
          disabled={bulkAssignMutation.isPending || !data?.data?.some(t => t.draft_member_ids?.length === 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {bulkAssignMutation.isPending ? 'Assigning...' : 'Bulk Assign Single Matches'}
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Particulars</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suggested Members</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.data?.length > 0 ? (
                    data.data.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.tran_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.transaction_type || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                          <div className="break-words">{transaction.particulars}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          KES {transaction.credit?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {transaction.draft_member_ids && transaction.draft_member_ids.length > 0 ? (
                            <div className="space-y-1">
                              {transaction.draft_member_ids.map((memberId) => {
                                const member = membersData?.data?.find((m) => m.id === memberId);
                                return member ? (
                                  <div key={memberId} className="flex items-center gap-2">
                                    <span>{member.name}</span>
                                    {member.phone && <span className="text-xs text-gray-400">({member.phone})</span>}
                                    <button
                                      onClick={() => handleAssign(transaction, memberId)}
                                      disabled={assignMutation.isPending}
                                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                    >
                                      Assign
                                    </button>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400">No suggestions</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.match_confidence ? `${Math.round(transaction.match_confidence * 100)}%` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              // Open assign modal
                              window.location.href = `/transactions?assign=${transaction.id}`;
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                        No draft assignments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data?.next_page_url || isLoading}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{data?.from || 0}</span> to{' '}
                    <span className="font-medium">{data?.to || 0}</span> of{' '}
                    <span className="font-medium">{data?.total || 0}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!data?.next_page_url || isLoading}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

