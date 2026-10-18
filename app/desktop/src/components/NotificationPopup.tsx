import { useEffect } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import '../styles/notification-popup.css';

export function NotificationPopup() {
  const notification = useWorkspaceStore((state) => state.notification);
  const dismiss = useWorkspaceStore((state) => state.dismissNotification);

  useEffect(() => {
    if (!notification) return;
    const timeout = window.setTimeout(dismiss, notification.kind === 'error' ? 8000 : 5000);
    return () => window.clearTimeout(timeout);
  }, [notification, dismiss]);

  if (!notification) return null;
  return (
    <div
      key={notification.id}
      className={`notification-popup ${notification.kind}`}
      role={notification.kind === 'error' ? 'alert' : 'status'}
      aria-live={notification.kind === 'error' ? 'assertive' : 'polite'}
    >
      <span>{notification.message}</span>
      <button type="button" aria-label="Dismiss notification" onClick={dismiss}>
        ×
      </button>
    </div>
  );
}
