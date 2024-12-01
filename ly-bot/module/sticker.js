const path = require('path');
const fs = require('fs');
const settings = require('../settings/config.js');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { fromBuffer } = require('file-type');
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const ffmpeg = require('fluent-ffmpeg');

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
        WRONG_FORMAT: '❌ Kirim/reply gambar/video dengan caption .sticker',
        MEDIA_ONLY: '❌ Hanya bisa mengubah gambar/video menjadi sticker!',
        VIDEO_TOO_LONG: '❌ Video terlalu panjang! Maksimal 15 detik\n\nDurasi video anda: {duration} detik',
        FAILED: '❌ Gagal membuat sticker: {error}'
    },
    STICKER: {
        PROCESS: '⌛ Mohon tunggu, sedang memproses sticker...'
    }
};

// Set path untuk ffmpeg dan ffprobe
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

class StickerCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['sticker', 's', 'stiker'];
        this.description = 'Membuat sticker dari gambar/video';
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
        this.tmpPath = path.join(__dirname, '..', 'tmp');
        
        if (!fs.existsSync(this.tmpPath)) {
            fs.mkdirSync(this.tmpPath, { recursive: true });
        }
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

        try {
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted && !msg.message.imageMessage && !msg.message.videoMessage) {
                await this.sendWithThumb(from, MESSAGES.ERROR.WRONG_FORMAT, settings.botName);
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }

            let buffer;
            if (quoted) {
                const context = msg.message.extendedTextMessage.contextInfo;
                if (!context.quotedMessage) {
                    throw new Error('Pesan yang di-quote tidak ditemukan');
                }
                
                buffer = await downloadMediaMessage(
                    { message: context.quotedMessage },
                    'buffer', 
                    {}
                );
            } else {
                buffer = await downloadMediaMessage(msg, 'buffer');
            }

            const { mime } = await fromBuffer(buffer);
            if (!mime.startsWith('image/') && !mime.startsWith('video/')) {
                await this.sendWithThumb(from, MESSAGES.ERROR.MEDIA_ONLY, settings.botName);
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }

            const sticker = new Sticker(buffer, {
                pack: settings.features.sticker.packname,
                author: settings.features.sticker.author,
                type: StickerTypes.FULL,
                quality: settings.features.sticker.quality
            });

            const stickerBuffer = await sticker.toBuffer();
            await this.sock.sendMessage(from, { sticker: stickerBuffer });
            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
        }
    }
}

module.exports = StickerCommand;
