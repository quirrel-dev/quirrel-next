let baseUrl = process.env.QUIRREL_URL;

if (!baseUrl) {
  if (process.env.NODE_ENV === "production") {
    baseUrl = "https://api.quirrel.dev";
  } else {
    baseUrl = "http://localhost:9181";
  }
}

const token = process.env.QUIRREL_TOKEN;

if (process.env.NODE_ENV === "production" && !token) {
  throw new Error("Make sure to provide QUIRREL_TOKEN env var.");
}

export interface CreateJobPayload {
  endpoint: string;
  body?: any;
  runAt?: Date;
  delay?: number;
  jobId?: string;
}

export interface CreateJobResult {
  jobId: string;
}

export async function createJob(payload: CreateJobPayload) {
  const res = await fetch(baseUrl + "/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...payload,
      runAt: payload.runAt?.toISOString(),
    }),
  });

  const job: CreateJobResult = await res.json();

  return job;
}

export async function deleteJob(jobId: string) {
  const res = await fetch(baseUrl + "/jobs/" + jobId, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.status === 204;
}
