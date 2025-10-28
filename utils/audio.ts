
import type { Blob } from '@google/genai';

/**
 * Encodes an array of bytes into a Base64 string.
 * @param bytes The byte array to encode.
 * @returns The Base64 encoded string.
 */
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Creates a Gemini API Blob object from raw audio data.
 * This function converts 32-bit floating-point PCM data to 16-bit integers
 * and then Base64 encodes it.
 * @param data The raw audio data (Float32Array).
 * @returns A Blob object for the Gemini API.
 */
export function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    // Convert float32 to int16
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] < 0 ? data[i] * 32768 : data[i] * 32767;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}
