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
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan',
        WRONG_FORMAT: '❌ Format Salah!\n\nPenggunaan: .qc nama|teks\nContoh: .qc Claude|Halo saya AI',
        MISSING_TEXT: '❌ Masukkan teks setelah nama, dipisahkan dengan |',
        FAILED: '❌ Gagal membuat stiker quote:\n{error}'
    }
};

class QuotlyCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['qc', 'quotly'];
        this.description = 'Membuat stiker quote dari teks';
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
        const sender = msg.key.participant || msg.key.remoteJid;
        const senderNumber = sender.split('@')[0];
        
        // Cek mode self dan izinkan owner & super owner
        if (!settings.publicMode && 
            !settings.owner.includes(senderNumber) && 
            !settings.superOwner.includes(senderNumber)) {
            await this.sendWithThumb(from, MESSAGES.ERROR.SELF_MODE, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        // Cek jika command termasuk dalam list superowner/owner
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
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(from, MESSAGES.ERROR.WRONG_FORMAT, settings.botName);
            return;
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        try {
            const text = typeof args === 'string' ? args : args.toString();
            let [name, ...messages] = text.split("|");
            
            if (!messages || messages.length === 0) {
                await this.sendReaction(msg, REACTIONS.ERROR);
                await this.sendWithThumb(from, MESSAGES.ERROR.MISSING_TEXT, settings.botName);
                return;
            }

            let message = messages.join("|");
            let apiUrl = `https://api.ryzendesu.vip/api/sticker/quotly?text=${encodeURIComponent(message)}&name=${encodeURIComponent(name)}&avatar=https://i.ibb.co/dGskQjZ/jpg.jpg`;

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
            
            await this.sock.sendMessage(from, { 
                sticker: stickerBuffer 
            });

            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error creating quotly:', error);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
            await this.sendReaction(msg, REACTIONS.ERROR);
        }
    }
}

module.exports = QuotlyCommand;
