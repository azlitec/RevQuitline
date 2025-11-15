'use client';

import { useState } from 'react';
import { Droplet, Moon, PersonStanding, Salad, Brain, Sun, CigaretteOff, Heart } from 'lucide-react';

interface HealthTip {
  id: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}

const healthTips: HealthTip[] = [
  {
    id: 1,
    icon: Droplet,
    title: 'Stay Hydrated',
    description: 'Drinking enough water is crucial for your health. Aim for 8 glasses a day to maintain optimal body function.',
    color: 'blue'
  },
  {
    id: 2,
    icon: Moon,
    title: 'Get Quality Sleep',
    description: 'Aim for 7-9 hours of sleep each night. Good sleep improves memory, mood, and overall health.',
    color: 'purple'
  },
  {
    id: 3,
    icon: PersonStanding,
    title: 'Stay Active',
    description: 'Regular physical activity helps maintain a healthy weight and reduces risk of chronic diseases. Aim for 30 minutes daily.',
    color: 'green'
  },
  {
    id: 4,
    icon: Salad,
    title: 'Eat Balanced Meals',
    description: 'Include fruits, vegetables, whole grains, and lean proteins in your diet for optimal nutrition.',
    color: 'orange'
  },
  {
    id: 5,
    icon: Brain,
    title: 'Manage Stress',
    description: 'Practice relaxation techniques like deep breathing, meditation, or yoga to reduce stress levels.',
    color: 'indigo'
  },
  {
    id: 6,
    icon: Sun,
    title: 'Get Sunlight',
    description: 'Spend 10-15 minutes in sunlight daily for vitamin D, which supports bone health and immune function.',
    color: 'yellow'
  },
  {
    id: 7,
    icon: CigaretteOff,
    title: 'Avoid Smoking',
    description: 'Quitting smoking is one of the best things you can do for your health. Seek support if you need help.',
    color: 'red'
  },
  {
    id: 8,
    icon: Heart,
    title: 'Regular Check-ups',
    description: 'Schedule regular health screenings and check-ups to catch potential issues early.',
    color: 'pink'
  }
];

const colorClasses = {
  blue: {
    bg: 'from-blue-50 to-blue-100',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    button: 'bg-blue-500 hover:bg-blue-600'
  },
  purple: {
    bg: 'from-purple-50 to-purple-100',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    button: 'bg-purple-500 hover:bg-purple-600'
  },
  green: {
    bg: 'from-green-50 to-green-100',
    iconBg: 'bg-green-100',
    iconText: 'text-green-600',
    button: 'bg-green-500 hover:bg-green-600'
  },
  orange: {
    bg: 'from-orange-50 to-orange-100',
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-600',
    button: 'bg-orange-500 hover:bg-orange-600'
  },
  indigo: {
    bg: 'from-indigo-50 to-indigo-100',
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-600',
    button: 'bg-indigo-500 hover:bg-indigo-600'
  },
  yellow: {
    bg: 'from-yellow-50 to-yellow-100',
    iconBg: 'bg-yellow-100',
    iconText: 'text-yellow-600',
    button: 'bg-yellow-500 hover:bg-yellow-600'
  },
  red: {
    bg: 'from-red-50 to-red-100',
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
    button: 'bg-red-500 hover:bg-red-600'
  },
  pink: {
    bg: 'from-pink-50 to-pink-100',
    iconBg: 'bg-pink-100',
    iconText: 'text-pink-600',
    button: 'bg-pink-500 hover:bg-pink-600'
  }
};

export default function HealthTipsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const currentTip = healthTips[currentIndex];
  const colors = colorClasses[currentTip.color as keyof typeof colorClasses];

  const nextTip = () => {
    setCurrentIndex((prev) => (prev + 1) % healthTips.length);
  };

  const prevTip = () => {
    setCurrentIndex((prev) => (prev - 1 + healthTips.length) % healthTips.length);
  };

  const goToTip = (index: number) => {
    setCurrentIndex(index);
  };

  // Handle touch events for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextTip();
    }
    if (isRightSwipe) {
      prevTip();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div className="card p-4 md:p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Today's Health Tip</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {healthTips.length}
          </span>
        </div>
      </div>

      {/* Carousel Container */}
      <div 
        className="relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Tip Card */}
        <div className={`bg-gradient-to-r ${colors.bg} p-4 md:p-6 rounded-xl transition-all duration-300`}>
          <div className="flex items-start space-x-3 md:space-x-4">
            <div className={`${colors.iconBg} p-2 md:p-3 rounded-lg flex-shrink-0`}>
              <currentTip.icon className={`${colors.iconText} w-6 h-6 md:w-8 md:h-8`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-800 font-semibold text-base md:text-lg mb-2">
                {currentTip.title}
              </p>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                {currentTip.description}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-4">
          {/* Previous Button */}
          <button
            onClick={prevTip}
            className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 touch-friendly"
            aria-label="Previous tip"
          >
            <IconWithFallback 
              icon="chevron_left" 
              emoji="←" 
              className="text-gray-600 text-xl" 
            />
          </button>

          {/* Dots Indicator */}
          <div className="flex space-x-2">
            {healthTips.map((_, index) => (
              <button
                key={index}
                onClick={() => goToTip(index)}
                className={`transition-all duration-300 rounded-full touch-friendly ${
                  index === currentIndex
                    ? `${colors.button} w-8 h-2`
                    : 'bg-gray-300 w-2 h-2 hover:bg-gray-400'
                }`}
                aria-label={`Go to tip ${index + 1}`}
              />
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={nextTip}
            className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 touch-friendly"
            aria-label="Next tip"
          >
            <IconWithFallback 
              icon="chevron_right" 
              emoji="→" 
              className="text-gray-600 text-xl" 
            />
          </button>
        </div>
      </div>

      {/* Swipe Hint for Mobile */}
      <div className="mt-3 text-center md:hidden">
        <p className="text-xs text-gray-400 flex items-center justify-center space-x-1">
          <IconWithFallback icon="swipe" emoji="👆" className="text-sm" />
          <span>Swipe left or right for more tips</span>
        </p>
      </div>
    </div>
  );
}
