// Create Pino logger for both environments - development uses pretty printing, production uses JSON
import pino from "pino";
export const logger = pino({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug"),
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss.l",
        ignore: "pid,hostname",
      },
    },
  }),
});

// Export logger methods for convenience
export const log = {
  info: (message: string, ...args: any[]) =>
    logger.info(
      args.length > 0 ? { msg: message, ...args[0] } : { msg: message }
    ),
  warn: (message: string, ...args: any[]) =>
    logger.warn(
      args.length > 0 ? { msg: message, ...args[0] } : { msg: message }
    ),
  error: (message: string, error?: Error | any) =>
    logger.error(
      error ? { msg: message, error: error.message || error } : { msg: message }
    ),
  debug: (message: string, ...args: any[]) =>
    logger.debug(
      args.length > 0 ? { msg: message, ...args[0] } : { msg: message }
    ),
};
