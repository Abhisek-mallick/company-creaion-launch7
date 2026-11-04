/**
 * Launch7 frontend adapter seam.
 * Replace these functions with authenticated requests when the backend is ready.
 * The shipped demo intentionally does not call providers, AI services or APIs.
 */
export const launch7Api = {
  async listVentures() { throw new Error('Backend adapter not configured'); },
  async createVenture(payload) { throw new Error('Backend adapter not configured'); },
  async updateTask(ventureId, taskId, payload) { throw new Error('Backend adapter not configured'); },
  async submitReview(ventureId, payload) { throw new Error('Backend adapter not configured'); },
};
