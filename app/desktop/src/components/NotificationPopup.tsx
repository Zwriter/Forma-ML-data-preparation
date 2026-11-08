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
  const info = notification.kind === 'info';
  return (
    <div
      key={notification.id}
      className={`notification-popup ${notification.kind}`}
      role={info ? 'status' : 'alert'}
      aria-live={info ? 'polite' : 'assertive'}
    >
      <div className="notification-content">
        <span className="notification-icon" aria-hidden="true">
          {info ? 'i' : '!'}
        </span>
        <div>
          <h2>{info ? 'Notice' : 'Action failed'}</h2>
          <p>{notification.message}</p>
        </div>
      </div>
      {notification.action && (
        <button
          className="notification-action"
          type="button"
          onClick={() => {
            notification.action?.run();
            dismiss();
          }}
        >
          {notification.action.label}
        </button>
      )}
      <button
        className="notification-close"
        type="button"
        aria-label="Dismiss notification"
        title="Dismiss"
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  );
}
