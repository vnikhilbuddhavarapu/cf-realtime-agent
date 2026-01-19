export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: Record<string, unknown>): void {
    console.log(
      JSON.stringify({
        level: "INFO",
        context: this.context,
        message,
        timestamp: new Date().toISOString(),
        ...data,
      }),
    );
  }

  error(
    message: string,
    error?: Error | unknown,
    data?: Record<string, unknown>,
  ): void {
    console.error(
      JSON.stringify({
        level: "ERROR",
        context: this.context,
        message,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
        timestamp: new Date().toISOString(),
        ...data,
      }),
    );
  }

  warn(message: string, data?: Record<string, unknown>): void {
    console.warn(
      JSON.stringify({
        level: "WARN",
        context: this.context,
        message,
        timestamp: new Date().toISOString(),
        ...data,
      }),
    );
  }

  debug(message: string, data?: Record<string, unknown>): void {
    console.debug(
      JSON.stringify({
        level: "DEBUG",
        context: this.context,
        message,
        timestamp: new Date().toISOString(),
        ...data,
      }),
    );
  }
}
