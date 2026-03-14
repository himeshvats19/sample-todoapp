import React from 'react';
import useFeatureFlag from '../hooks/useFeatureFlag';

const GeneratedFeature: React.FC = () => {
  const isFeatureEnabled = useFeatureFlag('display-user-email-in-header');

  // Mock user data, replace with actual user data context
  const userEmail = 'user@example.com';

  if (!isFeatureEnabled) return null;

  const handleEmailClick = () => {
    // Logic to navigate to profile settings page
    window.location.href = '/profile-settings';
  };

  return (
    <header style={headerStyle}>
      <h1 style={titleStyle}>Welcome to the Application</h1>
      <div style={emailContainerStyle}>
        <span style={emailStyle} onClick={handleEmailClick}>
          {userEmail}
        </span>
      </div>
    </header>
  );
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px',
  backgroundColor: '#f8f9fa',
  borderBottom: '1px solid #dee2e6',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  color: '#343a40',
};

const emailContainerStyle: React.CSSProperties = {
  cursor: 'pointer',
};

const emailStyle: React.CSSProperties = {
  color: '#007bff',
  textDecoration: 'underline',
};

export default GeneratedFeature;