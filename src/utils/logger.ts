// Create Winston logger for both environments - development uses colorized console, production uses JSON
import fs from "fs-extra";
import winston from "winston";

// Ensure logs directory exists
fs.ensureDirSync("logs");

const logLevel =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

const transports: winston.transport[] = [
  // File transport - always write to file
  new winston.transports.File({
    filename: "logs/combined.log",
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
      })
    ),
  }),
];

transports.push(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: "HH:mm:ss.l" }),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        return `${timestamp} ${level}: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta) : ""
        }`;
      })
    ),
  })
);

export const logger = winston.createLogger({
  level: logLevel,
  transports,
});

// Export logger methods for convenience
export const log = {
  info: (message: string, ...args: any[]) =>
    logger.info(message, args.length > 0 ? args[0] : {}),
  warn: (message: string, ...args: any[]) =>
    logger.warn(message, args.length > 0 ? args[0] : {}),
  error: (message: string, error?: Error | any) =>
    logger.error(message, error ? { error: error.message || error } : {}),
  debug: (message: string, ...args: any[]) =>
    logger.debug(message, args.length > 0 ? args[0] : {}),
};
