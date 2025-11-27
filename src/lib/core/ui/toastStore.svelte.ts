import { toast } from 'svelte-sonner';

/**
 * @file toastStore.svelte.ts
 * @description
 * A centralized store for managing application notifications.
 * Wraps the `svelte-sonner` library to provide a consistent API and
 * decouple the application from the specific toast implementation.
 */

class ToastStore {
  /**
   * Show a success notification.
   * @param message The message to display.
   */
  success(message: string) {
    toast.success(message);
  }

  /**
   * Show an error notification.
   * @param message The message to display.
   */
  error(message: string) {
    toast.error(message);
  }

  /**
   * Show a generic information notification.
   * @param message The message to display.
   */
  info(message: string) {
    toast.message(message);
  }

  /**
   * Show a warning notification.
   * @param message The message to display.
   */
  warning(message: string) {
    // Sonner doesn't have a specific 'warning' type by default, so we style it or use message
    toast.message(message, {
      description: 'Warning',
      // You could add custom styling classes here if needed via toast options
    });
  }

  /**
   * Show a loading notification that can be updated later.
   * @param message The initial loading message.
   * @returns A promise that resolves to the toast ID, which can be used to dismiss or update it.
   */
  loading(message: string): string | number {
    return toast.loading(message);
  }

  /**
   * Dismiss a specific toast or all toasts.
   * @param id Optional ID of the toast to dismiss.
   */
  dismiss(id?: string | number) {
    toast.dismiss(id);
  }
}

export const toastStore = new ToastStore();
