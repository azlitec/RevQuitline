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
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-blue-900">Recent Activities</h3>
        <Link
          href="/provider/appointments"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          View all
        </Link>
      </div>
      
      <div className="space-y-4">
        {recentAppointments.length > 0 ? (
          recentAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex items-center justify-between p-4 rounded-xl border border-blue-100 bg-blue-50/30 hover:bg-blue-50 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm font-medium">📅</span>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">{appointment.patientName}</h4>
                  <p className="text-sm text-blue-600">
                    {formatDate(appointment.date)} • {appointment.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)} shadow-sm`}>
                  {appointment.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="text-blue-200 text-6xl mb-4">📅</div>
            <p className="text-blue-600 text-sm">No recent appointments</p>
            <p className="text-blue-400 text-xs">Schedule appointments to see them here</p>
          </div>
        )}
      </div>
    </div>
  );
}