const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const settings = require('../settings/config.js');
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const ffmpegPath = require('ffmpeg-static');

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
        NO_TEXT: '❌ Format Salah!\n\nCara Penggunaan:\n.brat <teks>',
        FAILED: '❌ Gagal membuat stiker brat:\n{message}',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan'
    }
};

class BratCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['brat'];
        this.description = 'Membuat stiker brat dari teks';
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
    }

    async sendReaction(msg, emoji) {
        await this.sock.sendMessage(msg.key.remoteJid, {
            react: {
                text: emoji,
                key: msg.key
            }
        });
    }

    async sendWithThumb(from, text, title) {
        await this.sock.sendMessage(from, {
            text: text,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: settings.footer,
                    mediaType: 1,
                    thumbnail: fs.readFileSync(this.defaultThumb),
                    renderLargerThumbnail: false,
                    showAdAttribution: true
                }
            }
        });
    }

    async execute(from, args, isGroup, msg, commandName) {
        const sender = msg.key.participant || msg.key.remoteJid;
        const senderNumber = sender.split('@')[0];
        
        if (!settings.publicMode && 
            !settings.owner.includes(senderNumber) && 
            !settings.superOwner.includes(senderNumber)) {
            await this.sendWithThumb(from, MESSAGES.ERROR.SELF_MODE, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
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

        if (!args) {
            await this.sendWithThumb(from, MESSAGES.ERROR.NO_TEXT, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        try {
            const text = Array.isArray(args) ? args.join(' ') : args;
            const apiUrl = `https://api.ryzendesu.vip/api/sticker/brat?text=${encodeURIComponent(text)}`;

            const response = await axios.get(apiUrl, { 
                responseType: 'arraybuffer',
                timeout: 60000
            });

            const sticker = new Sticker(response.data, {
                pack: settings.sticker?.packname || settings.packname,
                author: settings.sticker?.author || settings.author,
                type: StickerTypes.FULL,
                quality: 70,
                background: '#FFFFFF00'
            });

            const stickerBuffer = await sticker.toBuffer();
            await this.sock.sendMessage(from, { sticker: stickerBuffer });
            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error creating brat:', error);
            const errorMsg = MESSAGES.ERROR.FAILED.replace('{message}', error.message);
            await this.sendWithThumb(from, errorMsg, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
        }
    }
}

module.exports = BratCommand;
