const NETWORK_RETRY_DELAY_MS = 5000;

export const waitForNetwork = async (shouldStop: () => boolean): Promise<boolean> => {
  if (typeof window === "undefined") {
    return true;
  }

  if (navigator.onLine) {
    return true;
  }

  return new Promise((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      window.removeEventListener("online", handleOnline);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const checkNetwork = () => {
      if (shouldStop()) {
        cleanup();
        resolve(false);
        return;
      }

      if (navigator.onLine) {
        cleanup();
        resolve(true);
        return;
      }

      timeoutId = setTimeout(checkNetwork, NETWORK_RETRY_DELAY_MS);
    };

    const handleOnline = () => {
      cleanup();
      resolve(true);
    };

    window.addEventListener("online", handleOnline);
    checkNetwork();
  });
};
