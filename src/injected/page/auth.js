import { debugLog } from './utils.js';

const authState = {
  authorization: null,
  csrf: null,
};

const KNOWN_BEARER = 'Bearer AAAAAAAAAAAAAAAAAAAAAANRILgAAAAAAtJc1Zixvp5Fo5xFFtci9P%2F1JHEw%3D9P3sJ8xx9G8%2F2zSS9Q7iY%2BXw%2FvAXXNz';

export function updateAuthFromHeaders(headers) {
  if (!headers) {
    return;
  }
  try {
    const auth = headers.get ? headers.get('authorization') : headers.Authorization || headers.authorization;
    if (auth) {
      authState.authorization = auth;
    }
    const csrf = headers.get ? headers.get('x-csrf-token') : headers['x-csrf-token'];
    if (csrf) {
      authState.csrf = csrf;
    }
  } catch (error) {
    debugLog('failed extracting auth headers', error);
  }
}

export function getAuthHeaders() {
  const headers = new Headers();
  const csrf = authState.csrf || readCsrfFromCookie();
  headers.set('authorization', authState.authorization || decodeURIComponent(KNOWN_BEARER));
  if (csrf) {
    headers.set('x-csrf-token', csrf);
  }
  headers.set('x-twitter-active-user', 'yes');
  headers.set('x-twitter-auth-type', 'OAuth2Session');
  headers.set('x-twitter-client-language', navigator.language || 'en');
  return headers;
}

function readCsrfFromCookie() {
  const match = document.cookie.match(/(?:^|;\s*)ct0=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
