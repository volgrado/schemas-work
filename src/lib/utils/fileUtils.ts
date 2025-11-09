/**
 * @file fileUtils.ts
 * @utility
 *
 * @description
 * Provides utility functions for handling files in the browser.
 */

/**
 * Converts a File object into a base64 encoded string.
 * @param file The File object from an input element.
 * @returns A promise that resolves to the base64 string, without the data URI prefix.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // The result is in the format "data:application/pdf;base64,JVBERi0xLjQKJ..."
      // We must strip the prefix, as the API expects only the raw base64 data.
      const encoded = reader.result as string;
      const base64Data = encoded.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
}
