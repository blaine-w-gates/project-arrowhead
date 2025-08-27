import React, { useState } from 'react';
import './LeadMagnetForm.css';

interface LeadMagnetFormProps {
  onSuccess?: (email: string) => void;
  className?: string;
}

type FormState = 'default' | 'submitting' | 'success' | 'error';

const LeadMagnetForm: React.FC<LeadMagnetFormProps> = ({ onSuccess, className = '' }) => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('default');
  const [errorMessage, setErrorMessage] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setErrorMessage('');
    
    // Validate email
    if (!email.trim()) {
      setErrorMessage('Email address is required');
      setState('error');
      return;
    }
    
    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address');
      setState('error');
      return;
    }

    setState('submitting');

    try {
      // TODO: Replace with actual endpoint once Webmaster provides it
      const response = await fetch('/api/lead-magnet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as any));
        const serverMsg = (errorData && (errorData.error || errorData.message)) || "";
        const friendly =
          serverMsg ||
          (response.status === 403
            ? "Submission not allowed from this origin. Please use the official site."
            : response.status === 415
            ? "Unsupported content type. Please try again."
            : response.status === 413
            ? "That request was too large. Please try again."
            : response.status === 400
            ? "Invalid input. Please check your email and try again."
            : `Server error: ${response.status}`);
        throw new Error(friendly);
      }

      setState('success');
      onSuccess?.(email);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setEmail('');
        setState('default');
      }, 3000);

    } catch (error) {
      console.error('Lead magnet submission error:', error);
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'Something went wrong. Please try again.'
      );
      setState('error');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error state when user starts typing
    if (state === 'error') {
      setState('default');
      setErrorMessage('');
    }
  };

  if (state === 'success') {
    return (
      <div className={`lead-magnet-form ${className}`}>
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h3>Thank you!</h3>
          <p>We've received your email and will be in touch soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`lead-magnet-form ${className}`}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="Enter your email address"
            className={`form-input ${state === 'error' ? 'error' : ''}`}
            disabled={state === 'submitting'}
            required
            aria-describedby={errorMessage ? 'email-error' : undefined}
          />
          {errorMessage && (
            <div id="email-error" className="error-message" role="alert">
              {errorMessage}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={state === 'submitting'}
          className={`submit-button ${state === 'submitting' ? 'submitting' : ''}`}
        >
          {state === 'submitting' ? (
            <>
              <span className="spinner" aria-hidden="true"></span>
              Submitting...
            </>
          ) : (
            'Get Free Access'
          )}
        </button>
      </form>
    </div>
  );
};

export default LeadMagnetForm;
