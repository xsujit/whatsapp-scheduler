// server/src/services/schedule.service.js

import { scheduleDAO } from '#db/schedule.dao';
import { collectionService } from '#services/collection.service';
import { schedulerService } from '#services/scheduler.service';
import { whatsappService } from '#services/whatsapp.service';
import { getTargetTime } from '#lib/date-utils';
import { APIError } from 'better-auth/api';
import { DateTime } from 'luxon';
import { CONFIG } from '#config';
import { MESSAGE_STATUS } from '#types/enums';

// --- RATE LIMITING CONSTANTS ---
const MIN_DELAY_MS = 5000;
const MAX_DELAY_MS = 10000;

const getRandomDelay = () => Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1) + MIN_DELAY_MS);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- PRIVATE EXECUTOR ---
/**
 * Pure execution logic. 
 * Iterates over items, sends messages, handles errors, and enforces delays.
 */
const executeBatch = async (header, items) => {
    console.log(`[Executor] Processing Job #${header.id} with ${items.length} items.`);

    for (const [index, item] of items.entries()) {
        const { id: itemId, group_jid } = item;
        try {
            // Check connection status before every message to be safe
            const { connected } = whatsappService.getStatus();
            if (!connected) throw new Error('WhatsApp Client disconnected');

            await whatsappService.sendMessage(group_jid, header.content);
            await scheduleDAO.updateItemStatus(itemId, MESSAGE_STATUS.SENT);

        } catch (err) {
            console.error(`[Executor] Failed item ${itemId}:`, err.message);
            await scheduleDAO.updateItemStatus(itemId, MESSAGE_STATUS.FAILED, err.message);
        }

        // Anti-Ban Delay Logic: Wait if there are more items to process
        if (index < items.length - 1) {
            const delay = getRandomDelay();
            console.log(`[Executor] Waiting ${delay}ms before next message...`);
            await wait(delay);
        }
    }
    console.log(`[Executor] Job #${header.id} finished.`);
};

export const scheduleService = {

    /**
     * CORE ORCHESTRATOR
     * Resolves data and hands it off to the private executeBatch runner.
     * * @param {string|number} scheduleId - The ID of the schedule to run.
     * @param {Array|null} preloadedItems - (Optional) Optimization for immediate jobs.
     * @param {string|null} preloadedContent - (Optional) Content if known.
     */
    async executeJob(scheduleId, preloadedItems = null, preloadedContent = null) {
        let items = preloadedItems;
        let content = preloadedContent;

        // 1. Data Resolution (JIT Fetch)
        // If we were passed only an ID (Future Job), we must fetch data NOW to ensure freshness.
        if (!items || !content) {
            console.log(`[Service] JIT Fetching data for Job #${scheduleId}`);

            // This calls the NEW DAO method implemented above
            const fullContext = await scheduleDAO.getScheduleWithPendingItems(scheduleId);

            if (!fullContext) {
                console.error(`[Service] Job #${scheduleId} not found or deleted.`);
                return;
            }

            items = fullContext.items;
            content = fullContext.content;
        }

        // 2. Validation
        if (!items || items.length === 0) {
            console.log(`[Service] Job #${scheduleId} has no pending items.`);
            return;
        }

        // 3. Execution
        // Pass to the private runner (which handles the delays)
        await executeBatch({ id: scheduleId, content }, items);
    },

    /**
     * Creates a ONE-TIME schedule.
     */
    async createOneTimeSchedule(userId, { collectionId, content, hour, minute }) {
        const groupJids = await collectionService.getGroupJids(collectionId);
        if (groupJids.length === 0) {
            throw new APIError("BAD_REQUEST", { message: "The selected collection is empty." });
        }

        const targetDateTime = getTargetTime(hour, minute);

        // 1. Create Data (Header + Items returned immediately)
        const newSchedule = await scheduleDAO.createScheduleWithItems(
            content,
            targetDateTime,
            userId,
            groupJids,
            null // No definition ID for one-off
        );

        // 2. Schedule execution
        schedulerService.scheduleOneTimeJob(
            newSchedule.id,
            targetDateTime,
            async () => {
                // If the job is scheduled for very soon (e.g., < 1 min), we could pass newSchedule.items.
                // However, to satisfy "Best Options" requirements:
                // We pass only ID to ensure that if the user edits the schedule between now 
                // and execution, executeJob fetches the TRUTH.
                await this.executeJob(newSchedule.id);
            }
        );

        return newSchedule;
    },

    /**
     * Creates a RECURRING Rule.
     */
    async createRecurringSchedule(userId, { collectionId, content, hour, minute }) {
        const groupJids = await collectionService.getGroupJids(collectionId);
        if (groupJids.length === 0) {
            throw new APIError("BAD_REQUEST", { message: "The selected collection is empty." });
        }

        const definition = await scheduleDAO.createDefinition({
            content, userId, collectionId, hour, minute
        });

        // 3. Register Rule
        // We pass a callback that bridges the Scheduler to this Service
        schedulerService.scheduleRecurringRule(definition, () => {
            this.instantiateRecurringJob(definition);
        });

        return definition;
    },

    /**
     * Instantiates a child job from a rule.
     * This runs Immediately when triggered by the Scheduler.
     */
    async instantiateRecurringJob(definition) {
        console.log(`[Service] Instantiating Recurring Job for Rule #${definition.id}`);
        try {
            // 1. Resolve current collection members (Snapshotting)
            const groupJids = await collectionService.getGroupJids(definition.collection_id);

            if (groupJids.length === 0) {
                console.warn(`[Service] Rule #${definition.id} skipped: Collection empty.`);
                return;
            }

            const scheduledDateTime = DateTime.now().setZone(CONFIG.TIMEZONE);

            // 2. Write to DB
            const childSchedule = await scheduleDAO.createScheduleWithItems(
                definition.content,
                scheduledDateTime,
                definition.user_id,
                groupJids,
                definition.id
            );

            // 3. Execute Immediately
            // OPTIMIZATION: Because we *just* created this snapshot milliseconds ago,
            // we pass the data directly to executeJob to skip the "JIT Fetch" step.
            await this.executeJob(childSchedule.id, childSchedule.items, childSchedule.content);

        } catch (error) {
            console.error(`[Service] Failed to instantiate rule #${definition.id}:`, error);
        }
    },

    /**
     * System Restore on Restart
     */
    async restoreSchedules() {
        // Restore One-Time Jobs
        const activeSchedules = await scheduleDAO.getSchedulesWithPendingItems();
        for (const item of activeSchedules) {
            schedulerService.scheduleOneTimeJob(
                item.id,
                item.scheduled_at,
                () => this.executeJob(item.id) // Bind ID, fetch data later
            );
        }

        // Restore Recurring Rules
        const definitions = await scheduleDAO.getDefinitions();
        for (const def of definitions) {
            if (def.is_active) {
                schedulerService.scheduleRecurringRule(def, () => {
                    this.instantiateRecurringJob(def);
                });
            }
        }
        console.log(`[Service] Restored ${activeSchedules.length} One-Time & ${definitions.length} Recurring jobs.`);
    }
};