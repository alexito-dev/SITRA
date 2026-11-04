import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'normal' | 'large';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  size = 'normal',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="react-modal-overlay" onClick={onClose}>
      <div
        className={`react-modal-container ${
          size === 'large' ? 'react-modal-container--large' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="react-modal-header">
          <div className="react-modal-title">
            {icon}
            <span>{title}</span>
          </div>
          <button className="react-modal-close" onClick={onClose} title="Cerrar ventana">
            <X size={20} />
          </button>
        </div>
        <div className="react-modal-body">{children}</div>
        {footer && <div className="react-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
