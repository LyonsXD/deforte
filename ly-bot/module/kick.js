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
        GROUP_ONLY: '❌ Fitur ini hanya bisa digunakan di dalam grup!',
        ADMIN_ONLY: '❌ Fitur ini hanya untuk admin grup!',
        BOT_ADMIN: '❌ Bot harus menjadi admin untuk menggunakan fitur ini!',
        NO_QUOTED: '❌ Reply pesan member yang ingin di kick!',
        CANNOT_KICK_ADMIN: '❌ Tidak bisa mengkick admin!',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan',
        FAILED: '❌ Gagal mengkick member:\n{error}'
    },
    SUCCESS: {
        KICK: '✅ Sukses mengkick member!'
    }
};

class KickCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['kick'];
        this.description = 'Kick member dari grup';
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

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        if (!isGroup) {
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(from, MESSAGES.ERROR.GROUP_ONLY, settings.botName);
            return;
        }

        try {
            const groupMetadata = await this.sock.groupMetadata(from);
            const participants = groupMetadata.participants;
            const isAdmin = participants.find(p => p.id === messageAuthor)?.admin;
            const botNumber = this.sock.user.id.split(':')[0] + "@s.whatsapp.net";
            const isBotAdmin = participants.find(p => p.id === botNumber)?.admin;
            
            if (!isAdmin) {
                await this.sendReaction(msg, REACTIONS.ERROR);
                await this.sendWithThumb(from, MESSAGES.ERROR.ADMIN_ONLY, settings.botName);
                return;
            }

            if (!isBotAdmin) {
                await this.sendReaction(msg, REACTIONS.ERROR);
                await this.sendWithThumb(from, MESSAGES.ERROR.BOT_ADMIN, settings.botName);
                return;
            }

            if (!msg.message.extendedTextMessage?.contextInfo) {
                await this.sendReaction(msg, REACTIONS.ERROR);
                await this.sendWithThumb(from, MESSAGES.ERROR.NO_QUOTED, settings.botName);
                return;
            }

            const target = msg.message.extendedTextMessage.contextInfo.participant;
            const targetAdmin = groupMetadata.participants.find(p => p.id === target)?.admin;

            if (targetAdmin) {
                await this.sendReaction(msg, REACTIONS.ERROR);
                await this.sendWithThumb(from, MESSAGES.ERROR.CANNOT_KICK_ADMIN, settings.botName);
                return;
            }

            await this.sock.groupParticipantsUpdate(from, [target], "remove");
            await this.sendReaction(msg, REACTIONS.SUCCESS);
            await this.sendWithThumb(from, MESSAGES.SUCCESS.KICK, settings.botName);

        } catch (error) {
            console.error('Error kick:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
        }
    }
}

module.exports = KickCommand;
