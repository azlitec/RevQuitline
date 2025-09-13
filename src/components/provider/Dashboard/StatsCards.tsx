'use client';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color: string;
}

function StatsCard({ title, value, change, icon, color }: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100/50 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">{title}</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {change} from last week
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color} shadow-md`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface StatsCardsProps {
  totalPatients: number;
  todaysAppointments: number;
  pendingConsultations: number;
  completedSessions: number;
}

export default function StatsCards({
  totalPatients,
  todaysAppointments,
  pendingConsultations,
  completedSessions
}: StatsCardsProps) {
  const stats = [
    {
      title: 'Total Patients',
      value: totalPatients.toLocaleString(),
      change: '+12%',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-gradient-to-br from-blue-600 to-blue-800'
    },
    {
      title: 'Today\'s Appointments',
      value: todaysAppointments.toString(),
      change: '+3%',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-gradient-to-br from-green-600 to-green-800'
    },
    {
      title: 'Pending Consultations',
      value: pendingConsultations.toString(),
      change: '-2%',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: 'bg-gradient-to-br from-yellow-600 to-yellow-800'
    },
    {
      title: 'Completed Sessions',
      value: completedSessions.toString(),
      change: '+15%',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-gradient-to-br from-purple-600 to-purple-800'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          change={stat.change}
          icon={stat.icon}
          color={stat.color}
        />
      ))}
    </div>
  );
}