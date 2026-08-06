import React from 'react';

const Header = () => {
  return (
    <header className="header">
      <div className="header-logo">
        <img src="/static/ihublogo.svg" alt="iHub" className="ihub-logo" />
        <span className="header-title">Wheelchair Nav</span>
      </div>
    </header>
  );
};

export default Header;
