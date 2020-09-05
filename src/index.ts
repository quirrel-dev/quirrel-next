import { NextApiRequest, NextApiResponse } from "next";
import { createJob } from "./api";

const baseUrl =
  "https://" + (process.env.VERCEL_URL || "localhost:3000") + "/api/";

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
    const { body } = req.body as { body: Payload };
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
