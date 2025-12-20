// server/src/services/scheduler.service.js

import { queueFacade } from '#queues/whatsapp.queue';
import { CONFIG } from '#config';
import { DateTime } from 'luxon';
import { logger } from '#lib/logger';

/**
 * @typedef {Object} ScheduleHeader
 * @property {string} id - The ID of the schedule header.
 * @property {string} content - The message content to be sent.
 * @property {DateTime} scheduled_at - The target time for the job start (Luxon DateTime object).
 */

/**
 * @typedef {Object} ScheduleItem
 * @property {string} id - The unique ID of the individual message item.
 * @property {string} group_jid - The JID (Jabber ID) of the target group.
 */

export const schedulerService = {
    /**
     * Queues a batch of messages for a One-Time Job.
     * Calculates the precise delay for each item to space them out.
     * @param {ScheduleHeader} scheduleHeader - { id, content, scheduled_at }
     * @param {ScheduleItem[]} items - Array of { id, group_jid }
     */
    async scheduleOneTimeJobBatch(scheduleHeader, items) {
        const { id: scheduleId, scheduled_at: targetTime } = scheduleHeader;

        // 1. Calculate Base Start Time
        const now = DateTime.now().setZone(CONFIG.TIMEZONE);

        // If target is in past, start "now" (plus small buffer)
        let baseDelayMs = targetTime.diff(now).toObject().milliseconds || 0;
        if (baseDelayMs < 0) baseDelayMs = 0;

        logger.info({ 
            scheduleId, 
            itemCount: items.length, 
            delayMs: baseDelayMs 
        }, '[Scheduler] Queueing One-Time Job Batch');

        // 2. Queue each item with an incremental delay
        // Spacing: 10 seconds min, 25 seconds max (Randomized)
        let accumulatedDelay = baseDelayMs;

        for (const item of items) {
            // Random spacing to look human
            const spacing = Math.floor(Math.random() * (25000 - 10000 + 1) + 10000);

            await queueFacade.addMessageJob(
                `msg_item_${item.id}`, // Unique Job ID
                {
                    itemId: item.id,
                    groupJid: item.group_jid,
                    content: scheduleHeader.content,
                    scheduleId: scheduleId
                },
                accumulatedDelay
            );

            accumulatedDelay += spacing;
        }
    },

    /**
     * Upserts a Recurring Rule using BullMQ Job Schedulers
     */
    async scheduleRecurringRule(definition) {
        const { id, hour, minute } = definition;
        const cronExpression = `${minute} ${hour} * * *`;

        await queueFacade.upsertRecurringRule(id, cronExpression, {
            originalTime: `${hour}:${minute}`
        });

        logger.info({ 
            ruleId: id, 
            cron: cronExpression 
        }, '[Scheduler] Recurring Rule synced to BullMQ');
    },

    /**
     * Cancels a One-Time Job.
     * Removes specific pending items from Queue, then updates DB.
     */
    async cancelOneTimeJob(schedule) {
        if (!schedule) {
            logger.warn('[Scheduler] Attempted to cancel a non-existent or deleted schedule');
            return;
        }

        const scheduleId = schedule.id;

        logger.info({ 
            scheduleId, 
            pendingItems: schedule.items.length 
        }, '[Scheduler] Cancelling One-Time Job');

        // 2. Remove each pending item from BullMQ
        // We execute this in parallel for speed
        const removalPromises = schedule.items.map(item =>
            queueFacade.removeJob(`msg_item_${item.id}`)
        );

        await Promise.all(removalPromises);

        logger.info({ scheduleId }, '[Scheduler] One-Time Job cancelled successfully');
    },

    /**
     * Cancels a Recurring Rule.
     * Removes the Scheduler from BullMQ, then updates DB.
     */
    async cancelRecurringRule(ruleId) {
        await queueFacade.removeRecurringRule(ruleId);

        logger.info({ ruleId }, '[Scheduler] Recurring Rule cancelled successfully');
    }
};