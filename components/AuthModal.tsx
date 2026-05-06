import { useState } from 'react';
import { useRouter } from 'next/router';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import styles from './AuthModal.module.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const router = useRouter();

  if (!isOpen) return null;

  const handleSuccess = () => {
    onClose();
    router.reload();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modal} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
          ×
        </button>

        {mode === 'login' ? (
          <LoginForm
            onSuccess={handleSuccess}
            onSwitchToRegister={() => setMode('register')}
          />
        ) : (
          <RegisterForm
            onSuccess={() => {
              setMode('login');
            }}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
}
