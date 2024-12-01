const fs = require('fs');
const path = require('path');
const settings = require('../settings/config.js');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');

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
        WRONG_FORMAT: '❌ Format Salah!\n\nCara Penggunaan:\n• .welcome on/off\n• .leave on/off',
        BOT_ADMIN: '❌ Bot harus menjadi admin untuk menggunakan fitur ini!',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan',
        FAILED: '❌ Gagal mengupdate pengaturan:\n{error}'
    },
    SUCCESS: {
        UPDATE: '✅ Fitur {feature} berhasil {status}'
    }
};

class MemberCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['welcome', 'leave'];
        this.description = 'Mengatur pesan welcome & leave';
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

        const action = Array.isArray(args) ? args[0] : args;
        const feature = commandName === 'welcome' ? 'welcome' : 'leave';

        if (!action || !['on', 'off'].includes(action.toLowerCase())) {
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(from, MESSAGES.ERROR.WRONG_FORMAT, settings.botName);
            return;
        }

        try {
            settings.features[feature].enabled = action.toLowerCase() === 'on';
            fs.writeFileSync(
                path.join(__dirname, '..', 'settings', 'config.js'),
                'module.exports = ' + JSON.stringify(settings, null, 4)
            );

            const status = action.toLowerCase() === 'on' ? 'diaktifkan' : 'dinonaktifkan';
            await this.sendReaction(msg, REACTIONS.SUCCESS);
            await this.sendWithThumb(
                from,
                MESSAGES.SUCCESS.UPDATE
                    .replace('{feature}', feature.toUpperCase())
                    .replace('{status}', status),
                settings.botName
            );

        } catch (error) {
            console.error('Error updating settings:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
        }
    }

    async handleGroupEvent(update) {
        try {
            if (!update?.id || !update?.participants || !update?.action) {
                console.log('[DEBUG] Invalid update:', update);
                return;
            }

            const { id, participants, action } = update;
            
            if (action === 'promote' || action === 'demote') return;
            
            if ((action === 'add' && !settings.features.welcome.enabled) ||
                (action === 'remove' && !settings.features.leave.enabled)) {
                console.log(`[DEBUG] Fitur ${action} tidak aktif`);
                return;
            }

            const groupMetadata = await this.sock.groupMetadata(id);
            const botNumber = this.sock.user.id.split(':')[0] + "@s.whatsapp.net";
            const isBotAdmin = groupMetadata.participants.some(p => 
                p.id === botNumber && p.admin === 'admin'
            );

            if (!isBotAdmin) {
                console.log('[DEBUG] Bot bukan admin');
                return;
            }

            const bannerPath = path.join(__dirname, '..', 'media', 
                action === 'add' ? 'welcome.jpg' : 'leave.jpg'
            );
            const banner = fs.readFileSync(bannerPath);
            const participant = participants[0];
            const userName = '@' + participant.split('@')[0];
            
            let message = action === 'add' ? 
                `*ꜱᴇʟᴀᴍᴀᴛ ᴅᴀᴛᴀɴɢ ᴅɪ ɢʀᴜᴘ* 👋\n` +
                `ʜᴀʟᴏ ${userName}\n` +
                `ᴀɴᴅᴀ ᴀᴅᴀʟᴀʜ ᴍᴇᴍʙᴇʀ ᴋᴇ \`${groupMetadata.participants.length}\`\n` +
                `ꜱᴇʟᴀᴍᴀᴛ ʙᴇʀɢᴀʙᴜɴɢ! 🎉` :
                
                `*ꜱᴇʟᴀᴍᴀᴛ ᴛɪɴɢɢᴀʟ* 👋\n` +
                `${userName} ᴛᴇʟᴀʜ ᴋᴇʟᴜᴀʀ\n` +
                `ᴍᴇᴍʙᴇʀ ꜱᴇᴋᴀʀᴀɴɢ: \`${groupMetadata.participants.length}\``;

            await this.sock.sendMessage(id, {
                image: banner,
                caption: message,
                mentions: participants
            });

        } catch (error) {
            console.error('[ERROR]', error);
        }
    }
}

module.exports = MemberCommand;
