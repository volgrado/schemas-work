import { browser } from '$app/environment';
import { readable } from 'svelte/store';

// Create a readable store that holds the online status
export const online = readable<boolean>(true, (set) => {
  let online = true;

  // Set initial value based on the navigator
  if (browser) {
    online = navigator.onLine;
    set(online);
  }

  // Function to update the store's value
  const updateOnlineStatus = () => {
    const isOnline = navigator.onLine;
    if (isOnline !== online) {
      online = isOnline;
      set(online);
      console.log(
        `[Network] Status changed to: ${online ? 'Online' : 'Offline'}`
      );
    }
  };

  // Listen for online/offline events
  if (browser) {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Return a cleanup function to remove listeners when no longer needed
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }
});
