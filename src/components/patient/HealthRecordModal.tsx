'use client';

import { useState, useEffect } from 'react';

interface HealthRecord {
  id: string;
  title: string;
  description: string | null;
  type: string;
  date: string;
  vitalSigns: any;
  medications: string | null;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  attachments: string[];
  provider: {
    firstName: string;
    lastName: string;
    specialty: string | null;
    licenseNumber: string | null;
  };
  patient: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    dateOfBirth: string | null;
  };
}

interface HealthRecordModalProps {
  recordId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function HealthRecordModal({ recordId, isOpen, onClose }: HealthRecordModalProps) {
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recordId && isOpen) {
      fetchRecordDetails();
    }
  }, [recordId, isOpen]);

  const fetchRecordDetails = async () => {
    if (!recordId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/patient/health-records/${recordId}`);
      if (response.ok) {
        const data = await response.json();
        setRecord(data);
      } else {
        setError('Failed to load record details');
      }
    } catch (err) {
      console.error('Error fetching record details:', err);
      setError('Failed to load record details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (recordId) {
      window.open(`/api/patient/health-records/${recordId}/download`, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold gradient-text">
              {loading ? 'Loading...' : record?.title || 'Health Record Details'}
            </h2>
            {record && (
              <p className="text-gray-600 mt-1">
                {new Date(record.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {record && (
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 font-medium"
              >
                Download PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading record details...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg">
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          )}

          {record && (
            <div className="space-y-6">
              {/* Record Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Record Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium text-gray-800">{record.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-800">
                      {new Date(record.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Provider Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Provider Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium text-gray-800">
                      {record.provider.firstName} {record.provider.lastName}
                    </p>
                  </div>
                  {record.provider.specialty && (
                    <div>
                      <p className="text-sm text-gray-500">Specialty</p>
                      <p className="font-medium text-gray-800">{record.provider.specialty}</p>
                    </div>
                  )}
                  {record.provider.licenseNumber && (
                    <div>
                      <p className="text-sm text-gray-500">License Number</p>
                      <p className="font-medium text-gray-800">{record.provider.licenseNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {record.description && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{record.description}</p>
                </div>
              )}

              {/* Vital Signs */}
              {record.vitalSigns && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Vital Signs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(() => {
                      const vitals = typeof record.vitalSigns === 'object' ? record.vitalSigns : JSON.parse(record.vitalSigns);
                      return Object.entries(vitals).map(([key, value]) => {
                        if (!value) return null;
                        const labels: { [key: string]: string } = {
                          bloodPressure: 'Blood Pressure',
                          heartRate: 'Heart Rate (bpm)',
                          temperature: 'Temperature (°F)',
                          oxygenSaturation: 'Oxygen Saturation (%)',
                          respiratoryRate: 'Respiratory Rate (breaths/min)'
                        };
                        return (
                          <div key={key}>
                            <p className="text-sm text-gray-500">{labels[key] || key}</p>
                            <p className="font-medium text-gray-800">{value as string}</p>
                          </div>
                        );
                      }).filter(Boolean);
                    })()}
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              {record.diagnosis && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Diagnosis</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{record.diagnosis}</p>
                </div>
              )}

              {/* Treatment */}
              {record.treatment && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Treatment</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{record.treatment}</p>
                </div>
              )}

              {/* Medications */}
              {record.medications && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Medications</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{record.medications}</p>
                </div>
              )}

              {/* Notes */}
              {record.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Notes</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{record.notes}</p>
                </div>
              )}

              {/* Attachments */}
              {record.attachments && record.attachments.length > 0 && (
                <div className="bg-indigo-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Attachments</h3>
                  <div className="space-y-2">
                    {record.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                          {attachment.split('/').pop() || `Attachment ${index + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}