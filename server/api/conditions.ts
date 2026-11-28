import { conditionsHandler } from '../lib/handlers.js';

// GET /api/conditions?spot=olowalu
export function GET(request: Request): Promise<Response> {
  return conditionsHandler(request);
}
