import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a secure 6-character verification code
 * Format: Mix of uppercase letters and numbers
 * Example: A1B2C3, X9Y8Z7
 */
export function generateVerificationCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let code = '';
  
  // Ensure we have at least 3 letters and 3 numbers
  for (let i = 0; i < 3; i++) {
    code += letters[Math.floor(Math.random() * letters.length)];
    code += numbers[Math.floor(Math.random() * numbers.length)];
  }
  
  // Shuffle the code to randomize position
  return code.split('').sort(() => Math.random() - 0.5).join('');
}