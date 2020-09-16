import { NextApiRequest, NextApiResponse } from "next";
import { createJob, CreateJobPayload, CreateJobResult, deleteJob } from "./api";
import { verify } from "secure-webhooks";
import { token } from "./env";

let baseUrl: string | undefined = undefined;

if (process.env.VERCEL_URL) {
  baseUrl = `https://${process.env.VERCEL_URL}/api/`;
}

if (process.env.QUIRREL_BASE_URL) {
  baseUrl = `${process.env.QUIRREL_BASE_URL}/api/`;
}

if (!baseUrl) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Please specify QUIRREL_BASE_URL.");
  } else {
    baseUrl = "http://localhost:3000/api/";
  }
}

type Enqueue<Payload> = (
  payload: Payload,
  meta?: Omit<CreateJobPayload, "body" | "endpoint">
) => Promise<CreateJobResult>;
interface QueueResult<Payload> {
  enqueue: Enqueue<Payload>;
  delete: (jobId: string) => Promise<boolean>;
}

export function Queue<Payload>(
  path: string,
  handler: (payload: Payload) => Promise<void>
): QueueResult<Payload> {
  async function nextApiHandler(req: NextApiRequest, res: NextApiResponse) {
    if (process.env.NODE_ENV === "production") {
      const signature = req.headers["x-quirrel-signature"] as
        | string
        | undefined;
      if (!signature) {
        return res.status(401).end();
      }

      const isTrustWorthy = verify(req.body, token!, signature);
      if (!isTrustWorthy) {
        return res.status(401).end();
      }
    }

    const { body } = JSON.parse(req.body) as { body: Payload };
    console.log(`Received job to ${path}: `, body);
    try {
      await handler(body);
      res.status(200).end();
    } catch (error) {
      res.status(500).json(error);
      throw error;
    }
  }

  nextApiHandler.enqueue = async (
    payload: Payload,
    meta?: Omit<CreateJobPayload, "body" | "endpoint">
  ) => {
    const job = await createJob({
      endpoint: baseUrl + path,
      body: payload,
      ...meta,
    });

    console.log(`Created job for ${path}.`);

    return job;
  };

  nextApiHandler.delete = async (jobId: string) => {
    const success = await deleteJob(jobId);

    console.log(`Deleted job ${jobId}.`);

    return success;
  };

  return nextApiHandler;
}
