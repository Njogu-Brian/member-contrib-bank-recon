import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '../api/members';
import { transactionsApi } from '../api/transactions';
import { manualContributionsApi } from '../api/manualContributions';
import { settingsApi } from '../api/settings';
import toast from 'react-hot-toast';

export default function MemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: () => membersApi.get(id),
  });

  const { data: weekData } = useQuery({
    queryKey: ['settings', 'current-week'],
    queryFn: () => settingsApi.getCurrentWeek(),
  });

  // Fetch all transactions for this member
  const { data: transactionsData } = useQuery({
    queryKey: ['transactions', 'member', id],
    queryFn: async () => {
      let allTransactions = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await transactionsApi.list({ page, member_id: id, per_page: 100 });
        if (response.data && response.data.length > 0) {
          allTransactions = [...allTransactions, ...response.data];
          hasMore = response.next_page_url !== null;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      return { data: allTransactions };
    },
    enabled: !!id,
  });

  // Fetch manual contributions
  const { data: manualContributionsData } = useQuery({
    queryKey: ['manual-contributions', 'member', id],
    queryFn: async () => {
      let allContributions = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await manualContributionsApi.list({ page, member_id: id, per_page: 100 });
        if (response.data && response.data.length > 0) {
          allContributions = [...allContributions, ...response.data];
          hasMore = response.next_page_url !== null;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      return { data: allContributions };
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => membersApi.update(id, data),
    onSuccess: () => {
      toast.success('Member updated successfully');
      queryClient.invalidateQueries(['member', id]);
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Update failed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      phone: formData.get('phone') || null,
      email: formData.get('email') || null,
      member_code: formData.get('member_code') || null,
      member_number: formData.get('member_number') || null,
      notes: formData.get('notes') || null,
      is_active: formData.get('is_active') === 'on',
    };
    updateMutation.mutate(data);
  };

  if (memberLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!member) {
    return <div className="p-8 text-center">Member not found</div>;
  }

  const transactions = transactionsData?.data || [];
  const manualContributions = manualContributionsData?.data || [];
  const allContributions = [
    ...transactions.filter(t => t.credit > 0 && t.assignment_status !== 'unassigned' && t.assignment_status !== 'draft'),
    ...manualContributions,
  ].sort((a, b) => new Date(b.contribution_date || b.tran_date) - new Date(a.contribution_date || a.tran_date));

  const totalContributions = allContributions.reduce((sum, c) => sum + (parseFloat(c.credit || c.amount) || 0), 0);
  const expectedWeeks = weekData?.current_week || 0;
  const contributionWeeks = new Set(
    allContributions.map(c => {
      const date = new Date(c.contribution_date || c.tran_date);
      const startDate = weekData?.start_date ? new Date(weekData.start_date) : null;
      if (!startDate) return 0;
      const weeks = Math.floor((date - startDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
      return weeks;
    })
  ).size;

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate('/members')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Members
        </button>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member Info */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Member Information</h2>
            {isEditing ? (
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={member.name}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      name="phone"
                      defaultValue={member.phone || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={member.email || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Member Code</label>
                    <input
                      type="text"
                      name="member_code"
                      defaultValue={member.member_code || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Member Number</label>
                    <input
                      type="text"
                      name="member_number"
                      defaultValue={member.member_number || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      name="notes"
                      rows="3"
                      defaultValue={member.notes || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={member.is_active}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Name:</span>
                  <p className="text-lg font-semibold">{member.name}</p>
                </div>
                {member.phone && (
                  <div>
                    <span className="text-sm text-gray-500">Phone:</span>
                    <p className="text-base">{member.phone}</p>
                  </div>
                )}
                {member.email && (
                  <div>
                    <span className="text-sm text-gray-500">Email:</span>
                    <p className="text-base">{member.email}</p>
                  </div>
                )}
                {member.member_code && (
                  <div>
                    <span className="text-sm text-gray-500">Member Code:</span>
                    <p className="text-base">{member.member_code}</p>
                  </div>
                )}
                {member.member_number && (
                  <div>
                    <span className="text-sm text-gray-500">Member Number:</span>
                    <p className="text-base">{member.member_number}</p>
                  </div>
                )}
                {member.notes && (
                  <div>
                    <span className="text-sm text-gray-500">Notes:</span>
                    <p className="text-base">{member.notes}</p>
                  </div>
                )}
                <div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    member.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Contribution Summary */}
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Contribution Summary</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Total Contributions:</span>
                <p className="text-2xl font-bold text-green-600">KES {totalContributions.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Number of Contributions:</span>
                <p className="text-xl font-semibold">{allContributions.length}</p>
              </div>
              {expectedWeeks > 0 && (
                <>
                  <div>
                    <span className="text-sm text-gray-500">Expected Weeks:</span>
                    <p className="text-xl font-semibold">{expectedWeeks}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Weeks with Contributions:</span>
                    <p className="text-xl font-semibold">{contributionWeeks}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Status:</span>
                    <p className={`text-lg font-semibold ${
                      contributionWeeks >= expectedWeeks ? 'text-green-600' : 
                      contributionWeeks >= expectedWeeks * 0.8 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {contributionWeeks >= expectedWeeks ? 'On Track' : 
                       contributionWeeks >= expectedWeeks * 0.8 ? 'Behind' : 'Far Behind'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Contribution Statement */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Contribution Statement</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allContributions.length > 0 ? (
                    allContributions.map((contribution, index) => (
                      <tr key={contribution.id || index}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(contribution.contribution_date || contribution.tran_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {contribution.transaction_type || contribution.payment_method || 'Manual'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                          <div className="break-words">{contribution.particulars || contribution.description || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
                          {contribution.transaction_code || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">
                          KES {(contribution.credit || contribution.amount)?.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        No contributions found
                      </td>
                    </tr>
                  )}
                </tbody>
                {allContributions.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="4" className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        Total:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-green-600">
                        KES {totalContributions.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

