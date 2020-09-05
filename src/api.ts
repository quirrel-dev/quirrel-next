export async function createJob(endpoint: string, runAt: Date | undefined, body: any) {
  await fetch("https://api.quirrel.dev/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint,
      body,
      runAt: runAt?.toISOString(),
    }),
  });
}
