const fs = require('fs');
const path = require('path');
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
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan',
        WRONG_FORMAT: '❌ Silahkan tag/reply pesan member yang ingin di{action}!',
        MEMBER_NOT_FOUND: '❌ Member tidak ditemukan!',
        ALREADY_ADMIN: '❌ Member sudah menjadi admin!',
        NOT_ADMIN: '❌ Member bukan admin!',
        SUPER_ADMIN: '❌ Tidak bisa menurunkan jabatan admin utama!',
        FAILED: '❌ Gagal {action} member:\n{error}'
    },
    SUCCESS: '✅ Sukses {action} jabatan @{number} {status}'
};

class PromoteDemoteCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['promote', 'demote'];
        this.description = 'Menaikkan/menurunkan jabatan admin grup';
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

        try {
            if (!isGroup) {
                await this.sendReaction(msg, REACTIONS.ERROR);
                await this.sendWithThumb(from, MESSAGES.ERROR.GROUP_ONLY, settings.botName);
                return;
            }

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

            if (!msg.message?.extendedTextMessage?.contextInfo?.participant) {
                await this.sendReaction(msg, REACTIONS.ERROR);
                await this.sendWithThumb(
                    from,
                    MESSAGES.ERROR.WRONG_FORMAT.replace('{action}', commandName === 'promote' ? 'promote' : 'demote'),
                    settings.botName
                );
                return;
            }

            const targetId = msg.message.extendedTextMessage.contextInfo.participant;
            const targetUser = participants.find(p => p.id === targetId);

            if (!targetUser) {
                await this.sendReaction(msg, REACTIONS.ERROR);
                await this.sendWithThumb(from, MESSAGES.ERROR.MEMBER_NOT_FOUND, settings.botName);
                return;
            }

            if (commandName === 'promote' && targetUser.admin) {
                await this.sendReaction(msg, REACTIONS.ERROR);
                await this.sendWithThumb(from, MESSAGES.ERROR.ALREADY_ADMIN, settings.botName);
                return;
            }

            if (commandName === 'demote') {
                if (!targetUser.admin) {
                    await this.sendReaction(msg, REACTIONS.ERROR);
                    await this.sendWithThumb(from, MESSAGES.ERROR.NOT_ADMIN, settings.botName);
                    return;
                }

                if (targetUser.admin === 'superadmin') {
                    await this.sendReaction(msg, REACTIONS.ERROR);
                    await this.sendWithThumb(from, MESSAGES.ERROR.SUPER_ADMIN, settings.botName);
                    return;
                }
            }

            await this.sock.groupParticipantsUpdate(
                from,
                [targetId],
                commandName === 'promote' ? 'promote' : 'demote'
            );

            const successMessage = MESSAGES.SUCCESS
                .replace('{action}', commandName === 'promote' ? 'menaikkan' : 'menurunkan')
                .replace('{number}', targetId.split('@')[0])
                .replace('{status}', commandName === 'promote' ? 'menjadi admin' : 'dari admin');

            await this.sendWithThumb(from, successMessage, settings.botName);
            await this.sendReaction(msg, REACTIONS.SUCCESS);

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

module.exports = PromoteDemoteCommand;
