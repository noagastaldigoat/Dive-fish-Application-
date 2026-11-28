import { spotsHandler } from '../lib/handlers.js';

export function GET(): Response {
  return spotsHandler();
}
