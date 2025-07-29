// Simple visitor counter without external dependencies
// Uses localStorage with fallback to a public JSON file

const COUNTER_KEY = 'vibemap_visitor_count';
const FALLBACK_URL = 'https://api.jsonbin.io/v3/b/your-jsonbin-id'; // Optional: JSONBin.io for backup

// Get visitor count from localStorage
export const getLocalVisitorCount = () => {
  try {
    const count = localStorage.getItem(COUNTER_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    console.error('Error reading local visitor count:', error);
    return 0;
  }
};

// Set visitor count in localStorage
export const setLocalVisitorCount = (count) => {
  try {
    localStorage.setItem(COUNTER_KEY, count.toString());
    return true;
  } catch (error) {
    console.error('Error setting local visitor count:', error);
    return false;
  }
};

// Increment visitor count
export const incrementLocalVisitorCount = () => {
  try {
    const currentCount = getLocalVisitorCount();
    const newCount = currentCount + 1;
    setLocalVisitorCount(newCount);
    return newCount;
  } catch (error) {
    console.error('Error incrementing local visitor count:', error);
    return 1;
  }
};

// Simple global counter using a public JSON file (optional)
export const getGlobalVisitorCount = async () => {
  try {
    // For now, just return local count
    // You can implement a simple global counter using:
    // 1. JSONBin.io (free)
    // 2. GitHub Gist API
    // 3. Netlify Functions
    return getLocalVisitorCount();
  } catch (error) {
    console.error('Error getting global visitor count:', error);
    return getLocalVisitorCount();
  }
};

// Main function to handle visitor counting
export const handleVisitorCount = async () => {
  try {
    // Check if this is a new visit (not in current session)
    const sessionKey = 'vibemap_session_' + Date.now();
    const hasVisited = sessionStorage.getItem('vibemap_visited');
    
    if (!hasVisited) {
      // First visit in this session
      sessionStorage.setItem('vibemap_visited', 'true');
      
      // Increment local counter
      const newCount = incrementLocalVisitorCount();
      
      // Try to update global counter (optional)
      try {
        // You can implement global counter here
        console.log('Visitor count incremented to:', newCount);
      } catch (globalError) {
        console.log('Using local counter only:', newCount);
      }
      
      return newCount;
    } else {
      // Already visited in this session
      return getLocalVisitorCount();
    }
  } catch (error) {
    console.error('Error handling visitor count:', error);
    return 1;
  }
};

// Reset counter (for testing)
export const resetVisitorCount = () => {
  try {
    localStorage.removeItem(COUNTER_KEY);
    sessionStorage.removeItem('vibemap_visited');
    return true;
  } catch (error) {
    console.error('Error resetting visitor count:', error);
    return false;
  }
}; 