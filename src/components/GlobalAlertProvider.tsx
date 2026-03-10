import React from 'react';
import { useAlertPopup } from './AlertPopup';
import { useConfirmationPopup } from './ConfirmationPopup';
import { globalAlertManager } from '../utils/globalAlertManager';
import AlertPopupComponent from './AlertPopup';
import ConfirmationPopupComponent from './ConfirmationPopup';

/**
 * Global Alert Provider
 * Registers alert handlers with the global alert manager
 * Should be placed at the root of the app
 */
export default function GlobalAlertProvider({ children }: { children: React.ReactNode }) {
  const { alertState, showAlert, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();

  // Register handlers with global manager
  React.useEffect(() => {
    globalAlertManager.registerAlertHandler((config) => {
      showAlert(config.title, config.message, config.type, config.buttons);
    });

    globalAlertManager.registerConfirmationHandler((config) => {
      showConfirmation(
        config.title,
        config.message,
        config.onConfirm,
        {
          type: config.type,
          confirmText: config.confirmText,
          cancelText: config.cancelText,
          confirmStyle: config.confirmStyle,
        }
      );
    });
  }, [showAlert, showConfirmation]);

  // Only render popup components if they are valid (avoid "Element type is invalid: got undefined")
  const AlertPopup = typeof AlertPopupComponent === 'function' ? AlertPopupComponent : null;
  const ConfirmationPopup = typeof ConfirmationPopupComponent === 'function' ? ConfirmationPopupComponent : null;

  return (
    <>
      {children}
      {AlertPopup && (
        <AlertPopup
          visible={alertState.visible}
          title={alertState.title}
          message={alertState.message}
          type={alertState.type}
          buttons={alertState.buttons}
          onClose={hideAlert}
        />
      )}
      {ConfirmationPopup && (
        <ConfirmationPopup
          visible={confirmState.visible}
          title={confirmState.title}
          message={confirmState.message}
          type={confirmState.type}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          confirmStyle={confirmState.confirmStyle}
          icon={confirmState.icon}
          onConfirm={confirmState.onConfirm}
          onCancel={hideConfirmation}
        />
      )}
    </>
  );
}

