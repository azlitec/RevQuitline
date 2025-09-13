'use client';

import Link from 'next/link';

interface Appointment {
  id: string;
  patientName: string;
  date: Date;
  status: string;
  type: string;
}

interface RecentActivitiesProps {
  appointments: Appointment[];
}

export default function RecentActivities({ appointments }: RecentActivitiesProps) {
  const recentAppointments = appointments.slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Recent Activities</h3>
        <Link
          href="/provider/appointments"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View all
        </Link>
      </div>
      
      <div className="space-y-4">
        {recentAppointments.length > 0 ? (
          recentAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">📅</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">{appointment.patientName}</h4>
                  <p className="text-sm text-gray-600">
                    {formatDate(appointment.date)} • {appointment.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                  {appointment.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <p className="text-gray-500 text-sm">No recent appointments</p>
            <p className="text-gray-400 text-xs">Schedule appointments to see them here</p>
          </div>
        )}
      </div>
    </div>
  );
}