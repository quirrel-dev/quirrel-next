# @quirrel/next

Quirrel is the Task Queueing Solution for Next.js X Vercel.

## Getting Started

> ‼ Quirrel is currently in development and not meant for production usage. Here be dragons. ‼

1. `npm install @quirrel/next`
2. Create a new API Route and export a Quirrel Queue:

```js
// pages/api/emailQueue.js
import { Queue } from "@quirrel/next"

export default Queue("emailQueue", async (job) => {
  await dispatchEmail(job.recipient, job.subject, ...);
})
```

3. Import & use from another file to enqueue jobs:

```js
// pages/api/signup.js
...
import emailQueue from "./emailQueue"

export default async (req, res) => {
  // create user ...
  await emailQueue.enqueue({
    recipient: user.email,
    subject: "Welcome to Quirrel!",
    ...
  })
}
```

## How does it work?

When calling `.enqueue`, a request to [api.quirrel.dev](https://api.quirrel.dev) is made. It contains an endpoint to call (in the example above, that'd be `/api/emailQueue`) and a timestamp of when it should be called.
The Quirrel API will then call the corresponding endpoint on time.

## In Development

Quirrel is currently in development. I will post updates [on Twitter](https://twitter.com/skn0tt).

