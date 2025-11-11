import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import toast from 'react-hot-toast';

export default function Settings() {
  const queryClient = useQueryClient();
  const [contributionStartDate, setContributionStartDate] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  const { data: weekData } = useQuery({
    queryKey: ['settings', 'current-week'],
    queryFn: () => settingsApi.getCurrentWeek(),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => settingsApi.update(data),
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries(['settings']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Update failed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    updateMutation.mutate({
      contribution_start_date: formData.get('contribution_start_date'),
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const currentStartDate = settings?.contribution_start_date?.value || weekData?.start_date || '';

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="bg-white shadow rounded-lg p-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contribution Settings</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contribution Start Date
            </label>
            <input
              type="date"
              name="contribution_start_date"
              defaultValue={currentStartDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              This date is used to calculate contribution weeks. The system will automatically count weeks from this date.
            </p>
          </div>

          {weekData && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Current Status</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>Start Date:</strong> {weekData.start_date ? new Date(weekData.start_date).toLocaleDateString() : 'Not set'}</p>
                <p><strong>Current Week:</strong> Week {weekData.current_week}</p>
                <p><strong>Today:</strong> {new Date(weekData.today).toLocaleDateString()} ({new Date(weekData.today).toLocaleDateString('en-US', { weekday: 'long' })})</p>
                <p><strong>Timezone:</strong> Africa/Nairobi (EAT)</p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg p-6 max-w-2xl mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>Timezone:</strong> Africa/Nairobi (EAT - UTC+3)</p>
          <p><strong>Current Date/Time:</strong> {new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi', dateStyle: 'full', timeStyle: 'long' })}</p>
        </div>
      </div>
    </div>
  );
}

