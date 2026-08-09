import { apiRequest } from "./api-request";

export function createCrudService<TEntity, TCreate, TUpdate>(endpoint: string) {
  const basePath = `/api/appwrite/${endpoint}`;

  return {
    async create(data: TCreate): Promise<TEntity> {
      return apiRequest<TEntity>(basePath, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async listByUser(
      _userEmail?: string,
    ): Promise<{ total: number; documents: TEntity[] }> {
      return apiRequest<{ total: number; documents: TEntity[] }>(basePath);
    },

    /**
     * Fetch a single document.
     *
     * Uses `?id=` rather than a `/<id>` path segment: the collection routes
     * are single-file handlers with no `[id]` segment, so the path form
     * resolved to a 404 for every collection.
     */
    async get(id: string): Promise<TEntity> {
      const response = await apiRequest<TEntity>(
        `${basePath}?id=${encodeURIComponent(id)}`,
      );

      if (!response || typeof response !== "object") {
        throw new Error(`Resource not found: ${id}`);
      }

      return response;
    },

    async update(id: string, data: TUpdate): Promise<TEntity> {
      return apiRequest<TEntity>(basePath, {
        method: "PUT",
        body: JSON.stringify({ id, ...data }),
      });
    },

    async delete(id: string): Promise<void> {
      await apiRequest(`${basePath}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };
}
