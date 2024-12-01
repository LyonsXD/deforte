const FormData = require('form-data');
const settings = require('../settings/config.js');
const fs = require('fs');
const path = require('path');
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
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan',
        WRONG_FORMAT: '❌ Kirim/Reply gambar dengan caption .remini',
        FAILED: '❌ Gagal meningkatkan kualitas gambar:\n{error}'
    },
    REMINI: {
        SUCCESS: '✨ Hasil peningkatan kualitas gambar'
    }
};

class ReminiCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['remini'];
        this.description = 'Meningkatkan kualitas gambar';
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

    async remini(imageBuffer) {
        return new Promise(async(resolve, reject) => {
            const formData = new FormData();
            const apiUrl = 'https://inferenceengine.vyro.ai/enhance';
            
            formData.append('model_version', 1, {
                'Content-Transfer-Encoding': 'binary',
                'contentType': 'multipart/form-data; charset=uttf-8'
            });
            
            formData.append('image', imageBuffer, {
                filename: 'enhance_image_body.jpg',
                contentType: 'image/jpeg'
            });

            formData.submit({
                url: apiUrl,
                host: 'inferenceengine.vyro.ai',
                path: '/enhance',
                protocol: 'https:',
                headers: {
                    'User-Agent': 'okhttp/4.9.3',
                    'Connection': 'Keep-Alive',
                    'Accept-Encoding': 'gzip'
                }
            }, function(err, response) {
                if (err) reject(err);
                
                let chunks = [];
                response.on('data', chunk => chunks.push(chunk))
                       .on('end', () => resolve(Buffer.concat(chunks)))
                       .on('error', err => reject(err));
            });
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

        try {
            if (!msg.message.imageMessage && !msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                await this.sendReaction(msg, REACTIONS.ERROR);
                await this.sendWithThumb(from, MESSAGES.ERROR.WRONG_FORMAT, settings.botName);
                return;
            }

            const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
            await this.sendReaction(msg, randomProcess);

            const imageMessage = msg.message.imageMessage || 
                               msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
            
            const imageBuffer = await downloadMediaMessage(
                { message: { imageMessage }},
                'buffer',
                { }
            );

            const enhancedImage = await this.remini(imageBuffer);

            await this.sock.sendMessage(from, { 
                image: enhancedImage,
                caption: MESSAGES.REMINI.SUCCESS,
                contextInfo: {
                    externalAdReply: {
                        title: settings.botName,
                        body: "Remini Result",
                        mediaType: 1,
                        thumbnail: fs.readFileSync(this.defaultThumb),
                        renderLargerThumbnail: false,
                        showAdAttribution: true
                    }
                }
            });

            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error in remini:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
        }
    }
}

module.exports = ReminiCommand;
