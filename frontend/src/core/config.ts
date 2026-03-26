const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const backendParam = urlParams.get('backend');
    if (backendParam) {
      localStorage.setItem('backend_url', backendParam);
      return backendParam;
    }
    const saved = localStorage.getItem('backend_url');
    if (saved) return saved;
    return import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
};
export const BACKEND_URL = getBackendUrl();
