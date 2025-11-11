import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../api/transactions';
import { membersApi } from '../api/members';
import toast from 'react-hot-toast';

export default function Transactions() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [bulkMemberSearch, setBulkMemberSearch] = useState('');
  const [selectedBulkMember, setSelectedBulkMember] = useState(null);
  const [splits, setSplits] = useState([{ member_id: '', amount: '', notes: '' }]);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const bankStatementId = urlParams.get('bank_statement_id');

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, status, search, bankStatementId],
    queryFn: () => {
      const params = { page, per_page: 20 };
      if (status) params.status = status;
      if (search) params.search = search;
      if (bankStatementId) params.bank_statement_id = bankStatementId;
      return transactionsApi.list(params);
    },
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
      setShowAssignModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Assignment failed');
    },
  });

  const splitMutation = useMutation({
    mutationFn: ({ id, data }) => transactionsApi.split(id, data),
    onSuccess: () => {
      toast.success('Transaction split successfully');
      queryClient.invalidateQueries(['transactions']);
      setShowSplitModal(false);
      setSplits([{ member_id: '', amount: '', notes: '' }]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Split failed');
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: (params) => transactionsApi.autoAssign(params),
    onSuccess: (response) => {
      toast.success(`Auto-assigned ${response.auto_assigned} out of ${response.total} transactions`);
      queryClient.invalidateQueries(['transactions']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Auto-assignment failed');
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (assignments) => transactionsApi.bulkAssign(assignments),
    onSuccess: (response) => {
      toast.success(`Bulk assigned ${response.assigned} transactions`);
      queryClient.invalidateQueries(['transactions']);
      setShowBulkAssignModal(false);
      setSelectedTransactions([]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Bulk assignment failed');
    },
  });

  const handleAssign = (transaction) => {
    setSelectedTransaction({...transaction, selectedMemberId: null});
    setMemberSearch('');
    setShowAssignModal(true);
  };

  const handleSplit = (transaction) => {
    setSelectedTransaction(transaction);
    setSplits([{ member_id: '', amount: '', notes: '' }]);
    setShowSplitModal(true);
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (!selectedTransaction?.selectedMemberId) {
      toast.error('Please select a member');
      return;
    }
    
    assignMutation.mutate({
      id: selectedTransaction.id,
      data: { member_id: selectedTransaction.selectedMemberId },
    });
  };

  const handleSplitSubmit = (e) => {
    e.preventDefault();
    const splitData = splits
      .filter(s => s.member_id && s.amount)
      .map(s => ({
        member_id: parseInt(s.member_id),
        amount: parseFloat(s.amount),
        notes: s.notes || null,
      }));

    if (splitData.length === 0) {
      toast.error('Please add at least one split');
      return;
    }

    splitMutation.mutate({
      id: selectedTransaction.id,
      data: { splits: splitData },
    });
  };

  const addSplit = () => {
    setSplits([...splits, { member_id: '', amount: '', notes: '' }]);
  };

  const removeSplit = (index) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplit = (index, field, value) => {
    const newSplits = [...splits];
    newSplits[index][field] = value;
    setSplits(newSplits);
  };

  const getTotalSplitAmount = () => {
    return splits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
  };

  const handleAutoAssign = () => {
    if (window.confirm('This will attempt to auto-assign unassigned transactions based on name and phone number matches. Continue?')) {
      autoAssignMutation.mutate({ limit: 500 });
    }
  };

  const totalPages = data?.last_page || 1;
  const currentPage = data?.current_page || page;
  const getPageNumbers = () => {
    const pages = [];
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          {bankStatementId && (
            <p className="text-sm text-gray-500 mt-1">
              Filtered by statement ID: {bankStatementId}
              <Link
                to="/transactions"
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                (Clear filter)
              </Link>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAutoAssign}
            disabled={autoAssignMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {autoAssignMutation.isPending ? 'Auto-assigning...' : 'Auto-Assign Transactions'}
          </button>
          <button
            onClick={() => {
              const unassigned = data?.data?.filter(t => t.assignment_status === 'unassigned' || t.assignment_status === 'draft') || [];
              if (unassigned.length === 0) {
                toast.error('No unassigned or draft transactions on this page');
                return;
              }
              setSelectedTransactions(unassigned.map(t => ({...t, selected: false})));
              setSelectedBulkMember(null);
              setBulkMemberSearch('');
              setShowBulkAssignModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Bulk Assign
          </button>
        </div>
      </div>

      {autoAssignMutation.isSuccess && autoAssignMutation.data && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            <strong>Auto-assignment completed:</strong> {autoAssignMutation.data.auto_assigned} auto-assigned, {autoAssignMutation.data.draft_assigned} draft-assigned out of {autoAssignMutation.data.total} transactions.
          </p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Status</option>
              <option value="unassigned">Unassigned</option>
              <option value="draft">Draft</option>
              <option value="auto_assigned">Auto-Assigned</option>
              <option value="manual_assigned">Manual Assigned</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Particulars
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.data && data.data.length > 0 ? (
                    data.data.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.tran_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.transaction_type || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-2xl break-words" title={transaction.particulars}>
                          {transaction.particulars}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                        {transaction.transaction_code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        KES {transaction.credit?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.member?.name || '-'}
                        {transaction.draft_member_ids && transaction.draft_member_ids.length > 0 && (
                          <span className="ml-2 text-xs text-orange-600">
                            ({transaction.draft_member_ids.length} draft)
                          </span>
                        )}
                        {transaction.match_confidence && (
                          <span className="ml-2 text-xs text-gray-400">
                            ({Math.round(transaction.match_confidence * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transaction.assignment_status === 'auto_assigned' ? 'bg-green-100 text-green-800' :
                          transaction.assignment_status === 'manual_assigned' ? 'bg-blue-100 text-blue-800' :
                          transaction.assignment_status === 'draft' ? 'bg-orange-100 text-orange-800' :
                          transaction.assignment_status === 'flagged' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.assignment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {(transaction.assignment_status === 'unassigned' || transaction.assignment_status === 'draft') && (
                            <>
                              <button
                                onClick={() => handleAssign(transaction)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                {transaction.assignment_status === 'draft' ? 'Select' : 'Assign'}
                              </button>
                              {transaction.assignment_status === 'unassigned' && (
                                <button
                                  onClick={() => handleSplit(transaction)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Split
                                </button>
                              )}
                            </>
                          )}
                          {transaction.splits && transaction.splits.length > 0 && (
                            <span className="text-xs text-gray-500">
                              ({transaction.splits.length} splits)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    ))
                  ) : (
                    <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      No transactions found
                    </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

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
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {getPageNumbers().map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        disabled={isLoading}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        } disabled:opacity-50`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!data?.next_page_url || isLoading}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {showAssignModal && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">
              {selectedTransaction.assignment_status === 'draft' ? 'Select Member from Draft' : 'Assign Transaction'}
            </h3>
            {selectedTransaction.draft_member_ids && selectedTransaction.draft_member_ids.length > 0 && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-sm text-orange-800 font-semibold mb-2">Suggested Members:</p>
                <ul className="text-sm text-orange-700 list-disc list-inside">
                  {selectedTransaction.draft_member_ids.map((memberId) => {
                    const member = membersData?.data?.find((m) => m.id === memberId);
                    return member ? <li key={memberId}>{member.name} {member.phone ? `(${member.phone})` : ''}</li> : null;
                  })}
                </ul>
              </div>
            )}
            <form onSubmit={handleAssignSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Member (Name or Phone)
                </label>
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Type name or phone number..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                />
                <input type="hidden" name="member_id" value={selectedTransaction?.selectedMemberId || ''} required />
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                  {selectedTransaction.draft_member_ids && selectedTransaction.draft_member_ids.length > 0 && (
                    <div className="p-2 bg-orange-50">
                      <p className="text-xs font-semibold text-orange-800 mb-1">Suggested:</p>
                      {selectedTransaction.draft_member_ids
                        .map((memberId) => membersData?.data?.find((m) => m.id === memberId))
                        .filter(Boolean)
                        .filter((m) => 
                          !memberSearch || 
                          m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                          m.phone?.includes(memberSearch)
                        )
                        .map((member) => (
                          <div
                            key={member.id}
                            onClick={() => {
                              setSelectedTransaction({...selectedTransaction, selectedMemberId: member.id});
                              setMemberSearch(`${member.name} ${member.phone || ''}`);
                            }}
                            className={`p-2 cursor-pointer rounded hover:bg-orange-100 ${
                              selectedTransaction?.selectedMemberId === member.id ? 'bg-orange-200' : ''
                            }`}
                          >
                            <div className="text-sm font-medium">{member.name}</div>
                            {member.phone && <div className="text-xs text-gray-600">{member.phone}</div>}
                          </div>
                        ))}
                    </div>
                  )}
                  {membersData?.data
                    ?.filter((m) => 
                      !memberSearch || 
                      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                      m.phone?.includes(memberSearch)
                    )
                    .slice(0, 10)
                    .map((member) => (
                      <div
                        key={member.id}
                        onClick={() => {
                          setSelectedTransaction({...selectedTransaction, selectedMemberId: member.id});
                          setMemberSearch(`${member.name} ${member.phone || ''}`);
                        }}
                        className={`p-2 cursor-pointer hover:bg-gray-50 ${
                          selectedTransaction?.selectedMemberId === member.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="text-sm font-medium">{member.name}</div>
                        {member.phone && <div className="text-xs text-gray-600">{member.phone}</div>}
                      </div>
                    ))}
                  {memberSearch && membersData?.data?.filter((m) => 
                    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                    m.phone?.includes(memberSearch)
                  ).length === 0 && (
                    <div className="p-4 text-center text-gray-500 text-sm">No members found</div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSplitModal && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">Split Transaction</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                <strong>Amount:</strong> KES {selectedTransaction.credit?.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Particulars:</strong> {selectedTransaction.particulars}
              </p>
            </div>
            <form onSubmit={handleSplitSubmit}>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Splits
                  </label>
                  <button
                    type="button"
                    onClick={addSplit}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Split
                  </button>
                </div>
                {splits.map((split, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-5">
                      <select
                        value={split.member_id}
                        onChange={(e) => updateSplit(index, 'member_id', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Select member...</option>
                        {membersData?.data?.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name} {member.phone ? `(${member.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={split.amount}
                        onChange={(e) => updateSplit(index, 'amount', e.target.value)}
                        placeholder="Amount"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={split.notes}
                        onChange={(e) => updateSplit(index, 'notes', e.target.value)}
                        placeholder="Notes (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      {splits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSplit(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="mt-2 text-sm">
                  <strong>Total:</strong> KES {getTotalSplitAmount().toLocaleString()} / KES {selectedTransaction.credit?.toLocaleString()}
                  {Math.abs(getTotalSplitAmount() - selectedTransaction.credit) > 0.01 && (
                    <span className="text-red-600 ml-2">(Amounts must match)</span>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSplitModal(false);
                    setSplits([{ member_id: '', amount: '', notes: '' }]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={splitMutation.isPending || Math.abs(getTotalSplitAmount() - selectedTransaction.credit) > 0.01}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  Split Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Bulk Assign Transactions</h3>
            
            {/* Member Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Member (Name or Phone)
              </label>
              <input
                type="text"
                value={bulkMemberSearch}
                onChange={(e) => {
                  setBulkMemberSearch(e.target.value);
                  setSelectedBulkMember(null);
                }}
                placeholder="Type name or phone number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
              />
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                {membersData?.data
                  ?.filter((m) => 
                    !bulkMemberSearch || 
                    m.name.toLowerCase().includes(bulkMemberSearch.toLowerCase()) ||
                    m.phone?.includes(bulkMemberSearch)
                  )
                  .slice(0, 10)
                  .map((member) => (
                    <div
                      key={member.id}
                      onClick={() => {
                        setSelectedBulkMember(member);
                        setBulkMemberSearch(`${member.name} ${member.phone || ''}`);
                      }}
                      className={`p-2 cursor-pointer hover:bg-gray-50 ${
                        selectedBulkMember?.id === member.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="text-sm font-medium">{member.name}</div>
                      {member.phone && <div className="text-xs text-gray-600">{member.phone}</div>}
                    </div>
                  ))}
                {bulkMemberSearch && membersData?.data?.filter((m) => 
                  m.name.toLowerCase().includes(bulkMemberSearch.toLowerCase()) ||
                  m.phone?.includes(bulkMemberSearch)
                ).length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">No members found</div>
                )}
              </div>
              {selectedBulkMember && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    <strong>Selected:</strong> {selectedBulkMember.name} {selectedBulkMember.phone ? `(${selectedBulkMember.phone})` : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Transaction Selection */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Transactions ({selectedTransactions.filter(t => t.selected).length} selected)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTransactions(selectedTransactions.map(t => ({...t, selected: true})));
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTransactions(selectedTransactions.map(t => ({...t, selected: false})));
                    }}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Select</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Particulars</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedTransactions.map((transaction) => (
                      <tr key={transaction.id} className={transaction.selected ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={transaction.selected || false}
                            onChange={(e) => {
                              setSelectedTransactions(selectedTransactions.map(t => 
                                t.id === transaction.id ? {...t, selected: e.target.checked} : t
                              ));
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {new Date(transaction.tran_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-md">
                          <div className="truncate">{transaction.particulars}</div>
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-green-600">
                          KES {transaction.credit?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowBulkAssignModal(false);
                  setSelectedTransactions([]);
                  setSelectedBulkMember(null);
                  setBulkMemberSearch('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedBulkMember) {
                    toast.error('Please select a member');
                    return;
                  }
                  const selected = selectedTransactions.filter(t => t.selected);
                  if (selected.length === 0) {
                    toast.error('Please select at least one transaction');
                    return;
                  }
                  const assignments = selected.map(t => ({
                    transaction_id: t.id,
                    member_id: selectedBulkMember.id,
                  }));
                  bulkAssignMutation.mutate(assignments);
                }}
                disabled={bulkAssignMutation.isPending || !selectedBulkMember}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {bulkAssignMutation.isPending ? 'Assigning...' : `Assign ${selectedTransactions.filter(t => t.selected).length} Selected`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

