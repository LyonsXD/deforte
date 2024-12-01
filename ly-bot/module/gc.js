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
        ADMIN_ONLY: '❌ Anda bukan admin grup!',
        BOT_ADMIN: '❌ Bot bukan admin grup!',
        WRONG_FORMAT: '❌ Format Salah!\n\nCara Penggunaan:\n.gc open/close',
        ALREADY_OPEN: '❌ Grup sudah terbuka!',
        ALREADY_CLOSED: '❌ Grup sudah tertutup!',
        INVALID_PARAM: '❌ Parameter tidak valid!\n\nGunakan: open/close',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan'
    },
    SUCCESS: {
        OPEN: '✅ Sukses membuka grup!\n\nSemua member bisa mengirim pesan',
        CLOSE: '✅ Sukses menutup grup!\n\nHanya admin yang bisa mengirim pesan'
    }
};

class GroupSettingCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['gc'];
        this.description = 'Pengaturan buka/tutup grup';
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
        
        // Langsung return tanpa respon jika mode self dan bukan owner
        if (!settings.publicMode && 
            !settings.owner.includes(senderNumber) && 
            !settings.superOwner.includes(senderNumber)) {
            return;
        }

        // Cek level command
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

        await this.sendReaction(msg, REACTIONS.PROCESS);

        if (!isGroup) {
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(from, MESSAGES.ERROR.GROUP_ONLY, settings.botName);
            return;
        }

        try {
            const groupMetadata = await this.sock.groupMetadata(from);
            const participants = groupMetadata.participants;
            const sender = msg.key.participant || msg.key.remoteJid;
            const isAdmin = participants.find(p => p.id === sender)?.admin;
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

            if (!args) {
                await this.sendReaction(msg, REACTIONS.ERROR);
                await this.sendWithThumb(from, MESSAGES.ERROR.WRONG_FORMAT, settings.botName);
                return;
            }

            const isAnnounce = groupMetadata.announce;
            const action = args.toLowerCase();

            if (action === 'open') {
                if (!isAnnounce) {
                    await this.sendReaction(msg, REACTIONS.ERROR);
                    await this.sendWithThumb(from, MESSAGES.ERROR.ALREADY_OPEN, settings.botName);
                    return;
                }

                await this.sock.groupSettingUpdate(from, 'not_announcement');
                await this.sendReaction(msg, REACTIONS.SUCCESS);
                await this.sendWithThumb(from, MESSAGES.SUCCESS.OPEN, settings.botName);

            } else if (action === 'close') {
                if (isAnnounce) {
                    await this.sendReaction(msg, REACTIONS.ERROR);
                    await this.sendWithThumb(from, MESSAGES.ERROR.ALREADY_CLOSED, settings.botName);
                    return;
                }

                await this.sock.groupSettingUpdate(from, 'announcement');
                await this.sendReaction(msg, REACTIONS.SUCCESS);
                await this.sendWithThumb(from, MESSAGES.SUCCESS.CLOSE, settings.botName);

            } else {
                await this.sendReaction(msg, REACTIONS.ERROR);
                await this.sendWithThumb(from, MESSAGES.ERROR.INVALID_PARAM, settings.botName);
            }

        } catch (error) {
            console.error('Error:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                `${MESSAGES.ERROR.DEFAULT}\n${error.message}`,
                settings.botName
            );
        }
    }
}

module.exports = GroupSettingCommand;
