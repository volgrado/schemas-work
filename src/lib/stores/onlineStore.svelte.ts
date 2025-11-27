import { browser } from '$app/environment';

class OnlineState {
  isOnline = $state(true);

  constructor() {
    if (browser) {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', this.updateStatus);
      window.addEventListener('offline', this.updateStatus);
    }
  }

  updateStatus = () => {
    this.isOnline = navigator.onLine;
    console.log(`[Network] Status changed to: ${this.isOnline ? 'Online' : 'Offline'}`);
  };

  cleanup() {
    if (browser) {
      window.removeEventListener('online', this.updateStatus);
      window.removeEventListener('offline', this.updateStatus);
    }
  }
}

export const onlineState = new OnlineState();
