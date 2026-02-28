// server/src/services/whatsapp.service.js

import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from 'baileys';
import NodeCache from 'node-cache';
import qrcode from 'qrcode-terminal';
import { CONFIG } from '#config';
import { logger } from '#lib/logger';
import { groupService } from '#services/group.service';

/**
 * * @typedef {import('baileys').WASocket} WASocket
 */

/**
 * Now use the aliased type from the typedef.
 * @type {WASocket | null}
 */
let waSocket = null;
let isReady = false;

// Cache for Group Metadata (TTL 5 minutes)
// This prevents fetching metadata from WA servers for every single message
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

export const whatsappService = {
    /**
     * Initialize the Baileys Socket
     */
    async initialize() {
        logger.info('[WA] Initializing WhatsApp Service...');

        const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_PATH);
        const { version } = await fetchLatestBaileysVersion();

        waSocket = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger: logger,
            browser: ['WhatsApp Scheduler', 'Chrome', '1.0.0'],

            // Don't mark as online on socket connect
            markOnlineOnConnect: false,

            // Disabling History Sync
            shouldSyncHistoryMessage: () => false,

            // Cache Group Metadata to prevent rate-limits/bans
            cachedGroupMetadata: async (jid) => {
                try {
                    let data = groupCache.get(jid);
                    if (data) return data;

                    // Fetch fresh if not cached
                    const result = await waSocket.groupMetadata(jid);
                    if (result) groupCache.set(jid, result);
                    return result;
                } catch (error) {
                    return null;
                }
            },
        });

        // Event Listeners
        waSocket.ev.on('creds.update', saveCreds);

        waSocket.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                logger.info('[WA] Action Required: Scan QR Code');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'close') {
                isReady = false;
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

                logger.warn({
                    err: lastDisconnect?.error,
                    shouldReconnect
                }, '[WA] WhatsApp Connection Closed');

                if (shouldReconnect) setTimeout(() => this.initialize(), 5000);
            } else if (connection === 'open') {
                isReady = true;
                logger.info({ jid: waSocket?.user?.id }, '[WA] WhatsApp Client Connected');
                this.syncGroups();
            }
        });
    },

    /**
     * Send a text message to a specific JID
     * Throws clear errors for the Worker to catch.
     * @param {string} jid - The WhatsApp ID
     * @param {string} content - The message text
     */
    async sendMessage(jid, content) {
        if (!isReady || !waSocket) {
            // Throw Error so the Worker can handle it
            throw new Error('[WA] Client is not connected/ready.');
        }

        try {
            // Random jitter to look human
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 400) + 100));

            await waSocket.sendMessage(jid, { text: content });
            return true;
        } catch (error) {
            logger.error({ err: error, jid }, '[WA] Failed to send WhatsApp message');
            throw error;
        }
    },

    /**
     * Get current connection status
     */
    getStatus() {
        return {
            connected: isReady,
            jid: waSocket?.user?.id || null
        };
    },

    /**
     * Fetches groups from WhatsApp and syncs them to the DB
     */
    async syncGroups() {
        if (!isReady) return;
        try {
            const allMetadata = await waSocket.groupFetchAllParticipating();
            Object.keys(allMetadata).forEach(jid => groupCache.set(jid, allMetadata[jid]));
            const count = await groupService.syncGroups(allMetadata);
            logger.info({ count }, '[WA] WhatsApp Groups synced');
        } catch (e) {
            logger.error({ err: e }, '[WA] WhatsApp Group sync failed');
        }
    }
};