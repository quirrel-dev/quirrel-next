import { NextApiRequest, NextApiResponse } from "next";
import { createJob } from "./api";
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

interface EnqueueMeta {
  // milliseconds to delay
  delay: number;
}

type Enqueue<Payload> = (payload: Payload, meta?: EnqueueMeta) => Promise<void>;
type QueueResult<Payload> = { enqueue: Enqueue<Payload> };

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

  nextApiHandler.enqueue = async (payload: Payload, meta?: EnqueueMeta) => {
    let runAt = undefined;
    if (meta) {
      runAt = new Date(Date.now() + meta.delay);
    }

    await createJob(baseUrl + path, runAt, { body: payload });

    if (runAt) {
      console.log(`Created job for ${path} to run at ${runAt.toISOString()}.`);
    } else {
      console.log(`Created job for ${path} to run now.`);
    }
  };

  return nextApiHandler;
}
