const axios = require('axios');
const fs = require('fs');
const path = require('path');
const settings = require('../settings/config.js');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

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
        WRONG_FORMAT: '❌ Format Salah!\n\nCara Penggunaan:\nReply/Kirim gambar dengan caption .imgbb',
        MEDIA_ONLY: '❌ Hanya bisa mengupload gambar!',
        FAILED: '❌ Gagal mengupload gambar:\n{error}',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan'
    },
    SUCCESS: {
        UPLOAD: '✅ Upload Berhasil!\n\nURL: {url}\n\nDelete URL: {delete_url}'
    }
};

class ImgBBCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['imgbb', 'imgtourl', 'tourl'];
        this.description = 'Upload gambar ke ImgBB';
        this.IMGBB_API_KEY = '3afbfd582f3fb302ef118f3d0bf959eb';
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

        try {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const isMedia = msg.message?.imageMessage;
            
            if (!quoted && !isMedia) {
                await this.sendReaction(msg, REACTIONS.ERROR);
                await this.sendWithThumb(from, MESSAGES.ERROR.WRONG_FORMAT, settings.botName);
                return;
            }

            let buffer;
            if (quoted) {
                const type = Object.keys(quoted)[0];
                const isQuotedImage = type === 'imageMessage';
                
                if (!isQuotedImage) {
                    await this.sendReaction(msg, REACTIONS.ERROR);
                    await this.sendWithThumb(from, MESSAGES.ERROR.MEDIA_ONLY, settings.botName);
                    return;
                }
                
                const quotedMsg = { message: quoted };
                buffer = await downloadMediaMessage(quotedMsg, 'buffer', {});
            } else {
                buffer = await downloadMediaMessage(msg, 'buffer', {});
            }

            const base64Image = buffer.toString('base64');
            const formData = new URLSearchParams();
            formData.append('key', this.IMGBB_API_KEY);
            formData.append('image', base64Image);

            const response = await axios.post('https://api.imgbb.com/1/upload', formData);

            if (response.data.success) {
                const result = response.data.data;
                await this.sendWithThumb(
                    from,
                    MESSAGES.SUCCESS.UPLOAD
                        .replace('{url}', result.url)
                        .replace('{delete_url}', result.delete_url),
                    settings.botName
                );
                await this.sendReaction(msg, REACTIONS.SUCCESS);
            } else {
                throw new Error('Upload failed');
            }

        } catch (error) {
            console.error('Error uploading image:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
        }
    }
}

module.exports = ImgBBCommand;
