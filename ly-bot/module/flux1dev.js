const path = require('path');
const fs = require('fs');
const axios = require('axios');
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
        WRONG_FORMAT: '❌ Format Salah!\n\nCara Penggunaan:\n.fluxgen <prompt>',
        FAILED: '❌ Gagal membuat gambar:\n{error}',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan'
    }
};

class FluxGenCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['flux1dev', 'flux1'];
        this.description = 'Membuat gambar dari prompt menggunakan FLUX.1-dev';
        this.tmpPath = path.join(__dirname, '..', 'tmp');
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
        
        if (!fs.existsSync(this.tmpPath)) {
            fs.mkdirSync(this.tmpPath, { recursive: true });
        }
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

    async generateImage(prompt) {
        try {
            const response = await axios.post(
                "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
                { inputs: prompt },
                {
                    headers: {
                        Authorization: `Bearer ${settings.features.HFToken}`,
                        "Content-Type": "application/json",
                    },
                    responseType: 'arraybuffer'
                }
            );

            if (response.status !== 200) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const tempFile = path.join(this.tmpPath, `flux_${Date.now()}.jpg`);
            fs.writeFileSync(tempFile, response.data);

            return tempFile;

        } catch (error) {
            throw new Error(`Gagal generate gambar: ${error.message}`);
        }
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
            const prompt = Array.isArray(args) ? args.join(' ') : String(args);
            
            if (!prompt || prompt.trim() === '') {
                await this.sendWithThumb(from, MESSAGES.ERROR.WRONG_FORMAT, settings.botName);
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }

            const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
            await this.sendReaction(msg, randomProcess);

            const imageFile = await this.generateImage(prompt);

            await this.sock.sendMessage(from, {
                image: fs.readFileSync(imageFile),
                caption: `*Prompt:* ${prompt}\n\n> Generated by FLUX.1-dev`,
                contextInfo: {
                    externalAdReply: {
                        title: settings.botName,
                        body: settings.footer,
                        mediaType: 1,
                        thumbnail: fs.readFileSync(this.defaultThumb),
                        renderLargerThumbnail: false,
                        showAdAttribution: true
                    }
                }
            });

            try {
                fs.unlinkSync(imageFile);
            } catch (err) {
                console.error('Error deleting temp file:', err);
            }

            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error in fluxgen command:', error);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
            await this.sendReaction(msg, REACTIONS.ERROR);
        }
    }
}

module.exports = FluxGenCommand;
