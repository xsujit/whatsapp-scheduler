// server/src/services/whatsapp.service.js

import makeWASocket, { DisconnectReason, useMultiFileAuthState } from 'baileys';
import NodeCache from 'node-cache';
import qrcode from 'qrcode-terminal';

import { CONFIG } from '#config';
import { logger } from '#lib/logger';
import { groupService } from '#services/group.service';

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
        console.log('[WA] Initializing...');
        const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_PATH);

        waSocket = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: logger,
            browser: ['WhatsApp Scheduler', 'Chrome', '1.0.0'],

            // 1. Don't mark as online immediately (stops phone notifications)
            markOnlineOnConnect: false,

            // 2. Cache Group Metadata to prevent rate-limits/bans
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
                console.log('\n------------------------------------------------------');
                console.log('[WA] Action Required: Scan QR Code');
                qrcode.generate(qr, { small: true });
                console.log('------------------------------------------------------\n');
            }

            if (connection === 'close') {
                isReady = false;
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.error('[WA] Connection closed. Reconnecting...', shouldReconnect);

                if (shouldReconnect) {
                    setTimeout(() => this.initialize(), 5000);
                }
            } else if (connection === 'open') {
                isReady = true;
                console.log('[WA] Client Connected and Ready.');
                this.syncGroups();
            }
        });
    },

    /**
     * Send a text message to a specific JID
     * @param {string} jid - The WhatsApp ID
     * @param {string} content - The message text
     */
    async sendMessage(jid, content) {
        if (!isReady || !waSocket) {
            console.warn('[WA] Message skipped. Client not ready.');
            return false;
        }

        try {
            // Add a random tiny delay (100-500ms) here for extra safety at the socket level
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 400) + 100));
            // await waSocket.sendMessage(jid, { text: content });
            console.log('sendMessage', content, jid);
            return true;
        } catch (error) {
            logger.error(`[WA] Failed to send to ${jid}`, error);
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
            console.log('[WA] Fetching groups to sync...');
            const allMetadata = await waSocket.groupFetchAllParticipating();

            // Also populate cache immediately on startup
            Object.keys(allMetadata).forEach(jid => {
                groupCache.set(jid, allMetadata[jid]);
            });

            const count = await groupService.syncGroups(allMetadata);
            console.log(`[WA] Group Sync Complete. ${count} groups up to date in DB.`);
        } catch (e) {
            console.error('[WA] Group sync failed', e);
        }
    }
};