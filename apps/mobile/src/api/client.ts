const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type ClientOptions = {
  getSchoolSlug: () => string | null;
  getToken: () => string | null;
};

function buildSchoolPath(schoolSlug: string, path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}/schools/${schoolSlug}${normalizedPath}`;
}

export function createApiClient(options: ClientOptions) {
  return {
    async request(path: string, init?: RequestInit) {
      const schoolSlug = options.getSchoolSlug();

      if (!schoolSlug) {
        throw new Error('School slug missing');
      }

      const token = options.getToken();
      const headers = new Headers(init?.headers ?? {});

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return fetch(buildSchoolPath(schoolSlug, path), {
        ...init,
        headers
      });
    }
  };
}
