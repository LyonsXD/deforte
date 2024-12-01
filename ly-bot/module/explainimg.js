const path = require('path');
const axios = require('axios');
const fs = require('fs');
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
        WRONG_FORMAT: '❌ Kirim/Reply gambar dengan caption .explainimg',
        MEDIA_ONLY: '❌ Hanya bisa menjelaskan gambar!',
        FAILED: '❌ Gagal menganalisa gambar:\n{error}',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan',
        DOWNLOAD_FAILED: '❌ Gagal mengunduh gambar: {error}'
    }
};

class ExplainImageCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['explainimg'];
        this.description = 'Menjelaskan isi gambar menggunakan AI';
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
    }

    async sendReaction(msg, emoji) {
        try {
            await this.sock.sendMessage(msg.key.remoteJid, {
                react: {
                    text: emoji,
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

    async analyzeImage(imageBuffer) {
        try {
            const response = await axios.post(
                "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
                imageBuffer,
                {
                    headers: {
                        'Authorization': `Bearer ${settings.features.HFToken}`,
                        'Content-Type': 'application/octet-stream'
                    },
                    responseType: 'json',
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity
                }
            );

            if (!response.data || !response.data[0]) {
                throw new Error('Respons API tidak valid');
            }

            return response.data[0]?.generated_text || 'Tidak dapat mengenali gambar';
        } catch (error) {
            if (error.response) {
                throw new Error(`Error API: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                throw new Error('Gagal terhubung ke server API');
            } else {
                throw new Error(error.message);
            }
        }
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

        try {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const isMedia = msg.message?.imageMessage;

            if (!quoted && !isMedia) {
                await this.sendWithThumb(from, MESSAGES.ERROR.WRONG_FORMAT, settings.botName);
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }

            const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
            await this.sendReaction(msg, randomProcess);

            let buffer;
            try {
                if (quoted) {
                    const type = Object.keys(quoted)[0];
                    if (type !== 'imageMessage') {
                        await this.sendWithThumb(from, MESSAGES.ERROR.MEDIA_ONLY, settings.botName);
                        await this.sendReaction(msg, REACTIONS.ERROR);
                        return;
                    }
                    const quotedMsg = { message: quoted };
                    buffer = await downloadMediaMessage(quotedMsg, 'buffer', {});
                } else {
                    buffer = await downloadMediaMessage(msg, 'buffer', {});
                }

                if (!buffer || buffer.length === 0) {
                    throw new Error('Gagal mengunduh gambar');
                }

            } catch (error) {
                console.error('Error downloading media:', error);
                await this.sendWithThumb(
                    from, 
                    MESSAGES.ERROR.DOWNLOAD_FAILED.replace('{error}', error.message),
                    settings.botName
                );
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }

            const result = await this.analyzeImage(buffer);
            await this.sendWithThumb(from, `*Analisa Gambar:*\n\n${result}`, settings.botName);
            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error in explain image command:', error);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
            await this.sendReaction(msg, REACTIONS.ERROR);
        }
    }
}

module.exports = ExplainImageCommand; 