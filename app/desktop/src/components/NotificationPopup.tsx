import { useEffect } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import '../styles/notification-popup.css';

export function NotificationPopup() {
  const notification = useWorkspaceStore((state) => state.notification);
  const dismiss = useWorkspaceStore((state) => state.dismissNotification);

  useEffect(() => {
    if (!notification) return;
    const timeout = window.setTimeout(dismiss, 8000);
    return () => window.clearTimeout(timeout);
  }, [notification, dismiss]);

  if (!notification) return null;
  return (
    <div
      key={notification.id}
      className={`notification-popup ${notification.kind}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="notification-content">
        <span className="notification-icon" aria-hidden="true">
          !
        </span>
        <div>
          <h2>Action failed</h2>
          <p>{notification.message}</p>
        </div>
      </div>
      <button
        className="notification-close"
        type="button"
        aria-label="Dismiss notification"
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  );
}
