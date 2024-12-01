const path = require('path');
const fs = require('fs');
const settings = require('../settings/config.js');

// Konstanta Reaksi
const REACTIONS = {
    PROCESS: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'],
    ERROR: '❌',
    SUCCESS: '✅'
};

// Konstanta Pesan
const MESSAGES = {
    ERROR: {
        DEFAULT: '❌ Maaf, terjadi kesalahan pada sistem',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan',
        GROUP_ONLY: '❌ Fitur ini hanya bisa digunakan di dalam grup!',
        BOT_NOT_ADMIN: '❌ Bot bukan admin grup!',
        FAILED: '❌ Gagal mereset link grup:\n{error}'
    },
    RESETLINK: {
        SUCCESS: '✅ Sukses mereset link grup!\n\nLink Baru: https://chat.whatsapp.com/{code}'
    }
};

class ResetLinkCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['resetlink', 'revoke','resetlinkgc'];
        this.description = 'Reset link grup';
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
    }

    async sendReaction(msg, emoji) {
        try {
            await this.sock.sendMessage(msg.key.remoteJid, {
                react: {
                    text: Array.isArray(emoji) ? emoji[Math.floor(Math.random() * emoji.length)] : emoji,
                    key: msg.key
                }
            });
        } catch (error) {
            console.error('Error sending reaction:', error);
        }
    }

    async sendWithThumb(from, text, title, body = '') {
        await this.sock.sendMessage(from, {
            text: text,
            contextInfo: {
                forwardingScore: settings.features.msgForwarded.enabled ? settings.features.msgForwarded.score : 0,
                isForwarded: settings.features.msgForwarded.enabled,
                externalAdReply: {
                    title: title,
                    body: body || settings.footer,
                    mediaType: 1,
                    thumbnail: fs.readFileSync(this.defaultThumb),
                    renderLargerThumbnail: false,
                    showAdAttribution: true
                }
            }
        });
    }

    async execute(from, args, isGroup, msg, commandName) {
        const messageAuthor = msg.key.participant || msg.key.remoteJid;
        const senderNumber = messageAuthor.split('@')[0];
        
        if (!settings.publicMode && 
            !settings.owner.includes(senderNumber) && 
            !settings.superOwner.includes(senderNumber)) {
            return;
        }

        if (settings.commands.superowner.includes(commandName)) {
            if (!settings.superOwner.includes(senderNumber)) {
                await this.sendWithThumb(from, MESSAGES.ERROR.SUPER_ACCESS_DENIED, settings.botName);
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }
        } else if (settings.commands.owner.includes(commandName)) {
            if (!settings.owner.includes(senderNumber) && !settings.superOwner.includes(senderNumber)) {
                await this.sendWithThumb(from, MESSAGES.ERROR.ACCESS_DENIED, settings.botName);
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }
        }

        if (!isGroup) {
            await this.sendWithThumb(from, MESSAGES.ERROR.GROUP_ONLY, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        try {
            const groupMetadata = await this.sock.groupMetadata(from);
            const participants = groupMetadata.participants;
            const botNumber = this.sock.user.id.split(':')[0] + "@s.whatsapp.net";
            const isBotAdmin = participants.find(p => p.id === botNumber)?.admin;

            if (!isBotAdmin) {
                await this.sendWithThumb(from, MESSAGES.ERROR.BOT_NOT_ADMIN, settings.botName);
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }

            await this.sock.groupRevokeInvite(from);
            const newCode = await this.sock.groupInviteCode(from);
            
            await this.sendWithThumb(
                from,
                MESSAGES.RESETLINK.SUCCESS.replace('{code}', newCode),
                settings.botName,
                "Link Reset Success"
            );

            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error in resetlink:', error);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
            await this.sendReaction(msg, REACTIONS.ERROR);
        }
    }
}

module.exports = ResetLinkCommand;
