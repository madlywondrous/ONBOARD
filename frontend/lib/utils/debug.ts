const shouldLog = process.env.NODE_ENV !== "production"

const createLogger = (method: "log" | "warn" | "error") =>
  (...args: unknown[]) => {
    if (!shouldLog) {
      return
    }

    // eslint-disable-next-line no-console
    console[method](...args)
  }

export const debug = {
  log: createLogger("log"),
  warn: createLogger("warn"),
  error: createLogger("error"),
}
