// 1990s Style Visitor Counter
// Mimics the classic approaches from the dotcom era

const COUNTER_KEY = 'vibemap_90s_counter';
const SESSION_KEY = 'vibemap_90s_session';

// Classic 1990s approach: Simple file-like storage
class NinetiesCounter {
  constructor() {
    this.digitImages = [
      '🔢', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'
    ];
    this.initializeCounter();
  }

  // Initialize counter (like creating counter.txt in 1990s)
  initializeCounter() {
    try {
      if (!localStorage.getItem(COUNTER_KEY)) {
        localStorage.setItem(COUNTER_KEY, '0');
        console.log('🎯 90s Counter initialized: counter.txt created');
      }
    } catch (error) {
      console.error('Error initializing 90s counter:', error);
    }
  }

  // Read counter (like reading counter.txt)
  readCounter() {
    try {
      const count = localStorage.getItem(COUNTER_KEY);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      console.error('Error reading 90s counter:', error);
      return 0;
    }
  }

  // Write counter (like writing to counter.txt)
  writeCounter(count) {
    try {
      localStorage.setItem(COUNTER_KEY, count.toString());
      return true;
    } catch (error) {
      console.error('Error writing 90s counter:', error);
      return false;
    }
  }

  // Increment counter (classic 1990s approach)
  incrementCounter() {
    try {
      const currentCount = this.readCounter();
      const newCount = currentCount + 1;
      this.writeCounter(newCount);
      
      // Classic 1990s logging
      console.log(`📊 90s Counter: ${currentCount} -> ${newCount}`);
      console.log(`🖼️  Generating digit images for: ${newCount}`);
      
      return newCount;
    } catch (error) {
      console.error('Error incrementing 90s counter:', error);
      return 1;
    }
  }

  // Generate digit images (like 1990s digit.gif files)
  generateDigitImages(count) {
    const digits = count.toString().split('');
    return digits.map(digit => {
      const digitNum = parseInt(digit, 10);
      return this.digitImages[digitNum] || '🔢';
    });
  }

  // Check if this is a new session (like 1990s session tracking)
  isNewSession() {
    try {
      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        // Generate new session ID (like 1990s session management)
        const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(SESSION_KEY, newSessionId);
        console.log(`🆔 90s Session created: ${newSessionId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking 90s session:', error);
      return true; // Assume new session if error
    }
  }

  // Main counter function (like 1990s CGI script)
  async handleVisitorCount() {
    try {
      console.log('🎯 90s Counter: Processing visitor...');
      
      // Check if new session (like 1990s session tracking)
      if (this.isNewSession()) {
        console.log('🆕 New 90s session detected, incrementing counter...');
        
        // Increment counter (like classic CGI script)
        const newCount = this.incrementCounter();
        
        // Generate digit images (like 1990s digit.gif generation)
        const digitImages = this.generateDigitImages(newCount);
        console.log('🖼️ 90s Digit images:', digitImages.join(' '));
        
        // Classic 1990s success message
        console.log('✅ 90s Counter updated successfully!');
        console.log('📈 Total visitors:', newCount);
        
        return newCount;
      } else {
        // Already visited in this session
        const currentCount = this.readCounter();
        console.log('🔄 90s Session already exists, returning current count:', currentCount);
        return currentCount;
      }
    } catch (error) {
      console.error('❌ 90s Counter error:', error);
      return 1;
    }
  }

  // Reset counter (for testing)
  resetCounter() {
    try {
      localStorage.removeItem(COUNTER_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      this.initializeCounter();
      console.log('🔄 90s Counter reset to 0');
      return true;
    } catch (error) {
      console.error('Error resetting 90s counter:', error);
      return false;
    }
  }

  // Get counter stats (like 1990s admin panel)
  getCounterStats() {
    try {
      const count = this.readCounter();
      const sessionId = sessionStorage.getItem(SESSION_KEY);
      
      return {
        totalVisitors: count,
        currentSession: sessionId,
        digitImages: this.generateDigitImages(count),
        timestamp: new Date().toISOString(),
        era: '1990s Style'
      };
    } catch (error) {
      console.error('Error getting 90s counter stats:', error);
      return null;
    }
  }
}

// Create singleton instance (like 1990s global counter)
const ninetiesCounter = new NinetiesCounter();

// Export functions (like 1990s CGI script exports)
export const getNinetiesVisitorCount = () => ninetiesCounter.readCounter();
export const incrementNinetiesVisitorCount = () => ninetiesCounter.incrementCounter();
export const handleNinetiesVisitorCount = () => ninetiesCounter.handleVisitorCount();
export const resetNinetiesCounter = () => ninetiesCounter.resetCounter();
export const getNinetiesCounterStats = () => ninetiesCounter.getCounterStats();

export default ninetiesCounter; 