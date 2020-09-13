export const baseUrl = process.env.QUIRREL_URL || "https://api.quirrel.dev";

export const token = process.env.QUIRREL_TOKEN;

if (process.env.NODE_ENV === "production" && !token) {
  throw new Error("Make sure to provide QUIRREL_TOKEN env var.");
}