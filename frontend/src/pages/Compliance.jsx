import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getKycProfile, updateKycProfile, uploadKycDocument, enableMfa, disableMfa } from '../api/kyc'

export default function Compliance() {
  const queryClient = useQueryClient()
  const [profile, setProfile] = useState({ national_id: '', phone: '', address: '', date_of_birth: '' })
  const [documentFile, setDocumentFile] = useState(null)

  const { data: profileData } = useQuery({
    queryKey: ['kyc-profile'],
    queryFn: getKycProfile,
  })

  useEffect(() => {
    if (profileData) {
      setProfile({
        national_id: profileData.national_id || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        date_of_birth: profileData.date_of_birth || '',
      })
    }
  }, [profileData])

  const updateProfileMutation = useMutation({
    mutationFn: updateKycProfile,
    onSuccess: () => queryClient.invalidateQueries(['kyc-profile']),
  })

  const uploadDocumentMutation = useMutation({
    mutationFn: uploadKycDocument,
    onSuccess: () => {
      queryClient.invalidateQueries(['kyc-profile'])
      setDocumentFile(null)
      alert('Document uploaded')
    },
  })

  const enableMfaMutation = useMutation(enableMfa, {
    onSuccess: () => alert('MFA enabled'),
  })
  const disableMfaMutation = useMutation(disableMfa, {
    onSuccess: () => alert('MFA disabled'),
  })

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    updateProfileMutation.mutate(profile)
  }

  const handleDocumentUpload = (e) => {
    e.preventDefault()
    if (!documentFile) return
    const formData = new FormData()
    formData.append('document', documentFile)
    uploadDocumentMutation.mutate(formData)
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Center</h1>
          <p className="text-gray-600">Complete KYC steps and manage MFA.</p>
        </div>
      </div>

      <form onSubmit={handleProfileSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">KYC Details</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {['national_id', 'phone', 'address', 'date_of_birth'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 capitalize">{field.replace('_', ' ')}</label>
              <input
                type={field === 'date_of_birth' ? 'date' : 'text'}
                value={profile[field]}
                onChange={(e) => setProfile((prev) => ({ ...prev, [field]: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
          >
            {updateProfileMutation.isLoading ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </form>

      <form onSubmit={handleDocumentUpload} className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Document Upload</h2>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setDocumentFile(e.target.files[0])}
          className="block w-full text-sm text-gray-600"
        />
        <button
          type="submit"
          disabled={!documentFile}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 disabled:opacity-60"
        >
          {uploadDocumentMutation.isLoading ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Multi-factor authentication</h2>
        <p className="text-sm text-gray-600">Protect your account with one-time codes.</p>
        <div className="flex gap-4">
          <button
            onClick={() => enableMfaMutation.mutate({ code: prompt('Enter OTP to enable MFA') })}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700"
          >
            Enable MFA
          </button>
          <button
            onClick={() => disableMfaMutation.mutate()}
            className="inline-flex items-center px-4 py-2 bg-rose-600 text-white rounded-md shadow hover:bg-rose-700"
          >
            Disable MFA
          </button>
        </div>
      </div>
    </div>
  )
}

