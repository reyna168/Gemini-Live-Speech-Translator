
import React from 'react';

interface StatusIndicatorProps {
  isRecording: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isRecording }) => {
  if (!isRecording) {
    return <div className="text-gray-400">Not Recording</div>;
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
      </span>
      <span className="text-red-400">Recording...</span>
    </div>
  );
};

export default StatusIndicator;
