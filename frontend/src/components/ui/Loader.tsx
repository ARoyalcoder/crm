import React from 'react'

export interface LoaderProps {
  className?: string
  label?: string
}

export const Loader: React.FC<LoaderProps> = ({ className = '', label = 'Loading...' }) => {
  return (
    <div
      role="status"
      aria-label={label}
      className={`flex flex-col items-center justify-center p-4 ${className}`}
    >
      <div className="loading-wave">
        <div className="loading-bar" />
        <div className="loading-bar" />
        <div className="loading-bar" />
        <div className="loading-bar" />
      </div>
      {label && (
        <span className="sr-only">{label}</span>
      )}
    </div>
  )
}

export default Loader
