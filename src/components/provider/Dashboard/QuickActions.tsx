'use client';

import Link from 'next/link';

export default function QuickActions() {
  const actions = [
    {
      title: 'New Appointment',
      description: 'Schedule a new consultation',
      icon: '📅',
      href: '/provider/appointments/new',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Add Patient',
      description: 'Register a new patient',
      icon: '👥',
      href: '/provider/patients/new',
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Write Prescription',
      description: 'Create new medication order',
      icon: '💊',
      href: '/provider/prescriptions/new',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Generate Report',
      description: 'Create patient reports',
      icon: '📊',
      href: '/provider/reports',
      color: 'bg-orange-100 text-orange-600'
    }
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${action.color} mr-4`}>
              {action.icon}
            </div>
            <div>
              <h4 className="font-medium text-gray-800">{action.title}</h4>
              <p className="text-sm text-gray-600">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}