let baseUrl = process.env.QUIRREL_URL;

if (!baseUrl) {
  if (process.env.NODE_ENV === "production") {
    baseUrl = "https://api.quirrel.dev"
  } else {
    baseUrl = "http://localhost:9181"
  }
}

const token = process.env.QUIRREL_TOKEN;

if (process.env.NODE_ENV === "production" && !token) {
  throw new Error("Make sure to provide QUIRREL_TOKEN env var.");
}

export async function createJob(
  endpoint: string,
  runAt: Date | undefined,
  body: any
) {
  await fetch(baseUrl + "/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint,
      body,
      runAt: runAt?.toISOString(),
    }),
  });
}
