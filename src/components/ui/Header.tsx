import React from 'react';

interface HeaderProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ title, children, className = '' }) => {
  return (
    <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {title && (
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        )}
        {children}
      </div>
    </header>
  );
};

export default Header;