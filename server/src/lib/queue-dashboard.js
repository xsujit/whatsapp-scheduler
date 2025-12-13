// server/src/lib/queue-dashboard.js

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { whatsappQueue } from '#queues/whatsapp.queue';

export const setupBullDashboard = () => {
  const serverAdapter = new ExpressAdapter();

  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      new BullMQAdapter(whatsappQueue)
    ],
    serverAdapter: serverAdapter,
  });

  return serverAdapter;
};