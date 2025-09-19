import { useState } from 'react';
import { useLoading } from '@/contexts/LoadingContext';

interface UseActionButtonOptions {
  onSuccess?: () => void;
  onError?: (error: any) => void;
  showToast?: boolean;
  toastMessage?: string;
  toastMessages?: string[];
  loaderDuration?: number;
}

export const useActionButton = (options: UseActionButtonOptions = {}) => {
  const {
    onSuccess,
    onError,
    showToast = true,
    toastMessage = 'Action completed',
    toastMessages = ['Action success', 'Action completed'],
    loaderDuration = 2000
  } = options;

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const { showApiLoader, hideApiLoader } = useLoading();

  const executeAction = async (
    actionName: string,
    actionFunction: () => Promise<any> | any
  ) => {
    try {
      setIsActionLoading(true);
      showApiLoader(`Performing ${actionName.toLowerCase()} action...`);
      
      // Execute the action function
      await actionFunction();
      
      // Show completion message if enabled
      if (showToast) {
        setShowCompletionToast(true);
      }
      
      // Keep loader visible for specified duration, then hide it
      setTimeout(() => {
        hideApiLoader();
        setIsActionLoading(false);
      }, loaderDuration);
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error(`Error performing ${actionName}:`, error);
      hideApiLoader();
      setIsActionLoading(false);
      
      // Call error callback
      if (onError) {
        onError(error);
      }
    }
  };

  const createActionHandler = (actionName: string, actionFunction: () => Promise<any> | any) => {
    return () => executeAction(actionName, actionFunction);
  };

  const closeToast = () => {
    setShowCompletionToast(false);
  };

  return {
    isActionLoading,
    showCompletionToast,
    executeAction,
    createActionHandler,
    closeToast,
    toastMessage,
    toastMessages
  };
};

export default useActionButton;
