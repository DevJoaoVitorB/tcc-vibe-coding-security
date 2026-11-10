import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('OpenAPI', () => {
  it('expõe a especificação e todas as operações implementadas', async () => {
    const response = await request(app).get('/openapi.json').expect(200);
    expect(response.body.openapi).toBe('3.0.3');
    expect(response.body.paths['/auth/register'].post.operationId).toBe('registerUser');
    expect(response.body.paths['/auth/login'].post.operationId).toBe('authenticateUser');
    expect(response.body.paths['/auth/refresh'].post.operationId).toBe('refreshAccessToken');
    expect(response.body.paths['/auth/logout'].post.operationId).toBe('logoutAuthenticatedSession');
    expect(response.body.paths['/me'].get.operationId).toBe('getOwnProfile');
    expect(response.body.paths['/users/{id}'].get.operationId).toBe('getUserProfileIfOwner');
  });
});
