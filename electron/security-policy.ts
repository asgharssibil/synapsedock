export const SECURE_WEB_PREFERENCES = Object.freeze({
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
});

export function isNavigationAllowed(target: string, developmentMode: boolean): boolean {
  try {
    const url = new URL(target);
    if (!developmentMode) return url.protocol === 'file:';
    return url.protocol === 'http:' && url.hostname === 'localhost' && url.port === '5173';
  } catch {
    return false;
  }
}
