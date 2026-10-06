export function mockRequest(method: string, url: string, body?: any) {
  return {
    method,
    url: `http://localhost${url}`,
    json: async () => body,
    headers: {
      get: (name: string) => null
    }
  } as unknown as Request;
}
