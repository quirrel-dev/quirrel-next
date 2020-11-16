import { NextApiRequest, NextApiResponse } from "next";
import {
  QuirrelClient,
  EnqueueJobOpts,
  Job,
  DefaultJobOptions,
} from "@quirrel/client";

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

const encryptionSecret = process.env.QUIRREL_ENCRYPTION_SECRET;
if (process.env.NODE_ENV === "production") {
  if (!encryptionSecret) {
    throw new Error("Please specify `QUIRREL_ENCRYPTION_SECRET`.");
  }

  if (encryptionSecret.length !== 32) {
    throw new Error("`QUIRREL_ENCRYPTION_SECRET` must have length 32.");
  }
}

type Enqueue<Payload> = (
  payload: Payload,
  meta?: Omit<EnqueueJobOpts, "body">
) => Promise<Job>;
interface QueueResult<Payload> {
  get(): AsyncIterator<Job[]>;
  getById(id: string): Promise<Job | null>;
  delete(id: string): Promise<boolean>;
  invoke(id: string): Promise<boolean>;
  enqueue: Enqueue<Payload>;
}

export function Queue<Payload>(
  path: string,
  handler: (payload: Payload) => Promise<void>,
  defaultJobOptions?: DefaultJobOptions
): QueueResult<Payload> {
  const endpoint = baseUrl + path;

  const quirrel = new QuirrelClient({
    encryptionSecret,
    defaultJobOptions,
  });

  async function nextApiHandler(req: NextApiRequest, res: NextApiResponse) {
    const { isValid, body } = quirrel.verifyRequestSignature<{
      body: Payload;
    }>(req.headers as any, req.body);
    if (!isValid) {
      return res.status(401).end();
    }

    const { body: payload } = body!;

    console.log(`Received job to ${path}: `, payload);
    try {
      await handler(payload);
      res.status(200).end();
    } catch (error) {
      res.status(500).json(error);
      throw error;
    }
  }

  nextApiHandler.enqueue = async (
    payload: Payload,
    meta?: Omit<EnqueueJobOpts, "body">
  ) =>
    quirrel.enqueue(endpoint, {
      body: { body: payload },
      ...meta,
    });

  nextApiHandler.delete = (jobId: string) => quirrel.delete(endpoint, jobId);

  nextApiHandler.invoke = (jobId: string) => quirrel.invoke(endpoint, jobId);

  nextApiHandler.get = () => quirrel.get(endpoint);

  nextApiHandler.getById = (jobId: string) => quirrel.getById(endpoint, jobId);

  return nextApiHandler;
}
