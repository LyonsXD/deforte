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
        NO_PROMPT: '❌ Format Salah!\n\nSilahkan masukkan prompt untuk',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!'
    },
    FORMAT: {
        AI_RESPONSE: '*Model:* {model}\n*Prompt:* {prompt}\n\n{response}',
        IMAGE_GEN: '*Generate Image*\n\n• *Model:* {model}\n• *Prompt:* {prompt}\n\n_Mohon tunggu sebentar..._'
    }
};

class AICommands {
    constructor(sock) {
        this.sock = sock;
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
        
        this.aiModels = {
            'gpt4o': 'GPT-4 OpenAI',
            'claude': 'Claude 3.5 Sonnet', 
            'gemini': 'Gemini Pro',
            'blackbox': 'BlackBox AI'
        };

        this.imageEndpoints = {
            'text2img': 'Text to Image',
            'waifu': 'Waifu Diffusion',
            'flux': 'Flux Diffusion',
            'schnell': 'Flux Schnell'
        };
    }

    async sendReaction(msg, emoji) {
        await this.sock.sendMessage(msg.key.remoteJid, {
            react: {
                text: emoji,
                key: msg.key
            }
        });
    }

    async handleCommand(command, from, args, isGroup, msg) {
        const sender = msg.key.participant || msg.key.remoteJid;
        const senderNumber = sender.split('@')[0];
        
        if (!settings.publicMode && !settings.owner.includes(senderNumber)) {
            await this.sendWithThumb(from, MESSAGES.ERROR.ACCESS_DENIED, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return true;
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);
        
        try {
            let result = false;
            
            if (this.aiModels[command]) {
                result = await this.handleAIChat(command, from, args.join(' '), msg);
            } else if (this.imageEndpoints[command]) {
                result = await this.handleAIImage(command, from, args.join(' '), msg);
            }

            if (result) await this.sendReaction(msg, REACTIONS.SUCCESS);
            return result;

        } catch (error) {
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendErrorMessage(from, error);
            return true;
        }
    }

    async handleAIChat(model, from, prompt, msg) {
        if (!prompt) {
            await this.sock.sendMessage(from, {
                text: `${MESSAGES.ERROR.NO_PROMPT} ${this.aiModels[model]}`
            });
            return true;
        }

        await this.sock.sendMessage(from, {
            text: `*${this.aiModels[model]}*\n\n*ǫ:* ${prompt}\n\n*ᴀ:* [ᴍᴇɴᴜɴɢɢᴜ ʀᴇꜱᴘᴏɴꜱᴇ...]`,
            contextInfo: {
                externalAdReply: {
                    title: settings.botName,
                    body: "ᴀɪ ᴄʜᴀᴛ",
                    mediaType: 1,
                    thumbnail: fs.readFileSync(this.defaultThumb),
                    renderLargerThumbnail: false,
                    showAdAttribution: true
                }
            }
        });
        
        return true;
    }

    async handleAIImage(endpoint, from, prompt, msg) {
        if (!prompt) {
            await this.sock.sendMessage(from, {
                text: `${MESSAGES.ERROR.NO_PROMPT} ɢᴇɴᴇʀᴀᴛᴇ ɢᴀᴍʙᴀʀ`
            });
            return true;
        }

        await this.sock.sendMessage(from, {
            text: `*ɢᴇɴᴇʀᴀᴛɪɴɢ ɪᴍᴀɢᴇ*\n\n• *ᴍᴏᴅᴇʟ:* ${this.imageEndpoints[endpoint]}\n• *ᴘʀᴏᴍᴘᴛ:* ${prompt}\n\n_ᴍᴏʜᴏɴ ᴛᴜɴɢɢᴜ..._`,
            contextInfo: {
                externalAdReply: {
                    title: settings.botName, 
                    body: "ᴀɪ ɪᴍᴀɢᴇ",
                    mediaType: 1,
                    thumbnail: fs.readFileSync(this.defaultThumb),
                    renderLargerThumbnail: false,
                    showAdAttribution: true
                }
            }
        });

        return true;
    }

    async sendErrorMessage(from, error) {
        await this.sock.sendMessage(from, {
            text: `${MESSAGES.ERROR.DEFAULT}${error.message}`,
            contextInfo: {
                externalAdReply: {
                    title: settings.botName,
                    body: "ᴇʀʀᴏʀ ᴏᴄᴄᴜʀʀᴇᴅ",
                    mediaType: 1,
                    thumbnail: fs.readFileSync(this.defaultThumb),
                    renderLargerThumbnail: false,
                    showAdAttribution: true
                }
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
}

module.exports = AICommands;