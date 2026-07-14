import { Hono } from "hono";

export const createApp = () => {
  const app = new Hono();

  app.get("/health", (c) =>
    c.json({
      service: "api",
      status: "ok",
    }),
  );

  return app;
};

export const app = createApp();
