import { NextApiRequest, NextApiResponse } from "next";
import { verify } from "secure-webhooks";
import { QuirrelClient, EnqueueJobOpts, Job } from "@quirrel/client";

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
  meta?: Omit<EnqueueJobOpts, "body">
) => Promise<Job>;
interface QueueResult<Payload> {
  get(): AsyncIterator<Job[]>;
  getById(id: string): Promise<Job | null>;
  delete(id: string): Promise<Job | null>;
  enqueue: Enqueue<Payload>;
}

export function Queue<Payload>(
  path: string,
  handler: (payload: Payload) => Promise<void>
): QueueResult<Payload> {
  const endpoint = baseUrl + path;

  const quirrel = new QuirrelClient(async (req) => {
    const res = await fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });

    return {
      status: res.status,
      body: await res.text(),
      headers: (res.headers as unknown) as Record<string, string>,
    };
  });

  async function nextApiHandler(req: NextApiRequest, res: NextApiResponse) {
    if (process.env.NODE_ENV === "production") {
      const signature = req.headers["x-quirrel-signature"] as
        | string
        | undefined;
      if (!signature) {
        return res.status(401).end();
      }

      const isTrustWorthy = verify(req.body, quirrel.token!, signature);
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
    meta?: Omit<EnqueueJobOpts, "body">
  ) => {
    const job = await quirrel.enqueue(endpoint, {
      body: { body: payload },
      ...meta,
    });

    return job;
  };

  nextApiHandler.delete = async (jobId: string) => {
    const success = await quirrel.delete(endpoint, jobId);

    console.log(`Deleted job ${jobId}.`);

    return success;
  };

  nextApiHandler.get = () => quirrel.get(endpoint);

  nextApiHandler.getById = (jobId: string) => quirrel.getById(endpoint, jobId);

  return nextApiHandler;
}
