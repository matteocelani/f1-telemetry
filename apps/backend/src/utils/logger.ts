export const Logger = {
  info: (message: string, ...optionalParams: unknown[]) => {
    console.info(`[INFO] ${message}`, ...optionalParams);
  },
  warn: (message: string, ...optionalParams: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...optionalParams);
  },
  error: (message: string, ...optionalParams: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...optionalParams);
  },
};
