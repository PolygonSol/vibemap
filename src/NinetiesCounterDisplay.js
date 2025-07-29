import React from 'react';
import './NinetiesCounterDisplay.css';

// 1990s-style counter display component
const NinetiesCounterDisplay = ({ count, title = "Counting like it's Y2K all over again" }) => {
  // Convert count to individual digits (like 1990s digit.gif files)
  const digits = count.toString().split('');
  
  // Pad with zeros to make it look more 1990s (like 6-digit counters)
  const paddedDigits = digits.join('').padStart(6, '0').split('');

  return (
    <div className="nineties-counter">
      <div className="nineties-counter-container">
        <div className="nineties-counter-title">
          {title}
        </div>
        <div className="nineties-counter-digits">
          {paddedDigits.map((digit, index) => (
            <div key={index} className="nineties-digit">
              {digit}
            </div>
          ))}
        </div>
        <div className="nineties-counter-decoration">
          <span className="nineties-star">★</span>
          <span className="nineties-text">Best viewed with Netscape Navigator</span>
          <span className="nineties-star">★</span>
        </div>
      </div>
    </div>
  );
};

export default NinetiesCounterDisplay; 