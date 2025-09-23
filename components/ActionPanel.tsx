'use client';

import React, { useState } from 'react';
import { useActionPanel } from '@/contexts/ActionPanelContext';
import ActionCompletedToast from './ActionCompletedToast';

const ActionPanel: React.FC = () => {
  const { actionCount, isVisible, submitAll } = useActionPanel();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 bg-white border border-gray-300 shadow-lg rounded-full px-4 py-2">
        <span className="text-sm text-gray-700">{actionCount} action(s) pending</span>
        <button
          onClick={async () => {
            if (isSubmitting) return;
            setIsSubmitting(true);
            await submitAll();
            setShowToast(true);
            setTimeout(() => {
              window.location.reload();
            }, 1200);
          }}
          className={`px-3 py-1 text-sm text-white rounded-full ${isSubmitting ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
      <ActionCompletedToast
        isVisible={showToast}
        messages={['Actions submitted', 'Refreshing…']}
        onClose={() => setShowToast(false)}
        messageDuration={600}
      />
    </div>
  );
};

export default ActionPanel;


