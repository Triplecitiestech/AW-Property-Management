import { randomInt } from 'node:crypto'

// Pure credential generators for UniFi tenant provisioning.
// No side effects or I/O → fully unit-testable.

const DEFAULT_PIN_LENGTH = 6

/** Generate a numeric door PIN (default 6 digits) as a zero-padded string. */
export function generatePin(length = DEFAULT_PIN_LENGTH): string {
  let pin = ''
  for (let i = 0; i < length; i++) pin += randomInt(0, 10).toString()
  return pin
}

/** Validate a PIN is exactly `length` digits. */
export function isValidPin(pin: string, length = DEFAULT_PIN_LENGTH): boolean {
  return new RegExp(`^\\d{${length}}$`).test(pin)
}

const WIFI_WORDS = [
  'Harbor', 'Cedar', 'Maple', 'River', 'Summit', 'Copper', 'Quartz', 'Willow',
  'Meadow', 'Falcon', 'Lunar', 'Ember', 'Delta', 'Orchard', 'Cobalt', 'Aspen',
]

/**
 * Generate a readable-but-strong WiFi password, e.g. "Cedar-Falcon-3728".
 * Readable so it can be typed from a printed welcome email or read over the phone.
 */
export function generateWifiPassword(): string {
  const word = () => WIFI_WORDS[randomInt(0, WIFI_WORDS.length)]
  return `${word()}-${word()}-${randomInt(1000, 10000)}`
}
