const axios = require('axios');
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
        NO_PROMPT: '❌ Format Salah!\n\nSilahkan masukkan pertanyaan untuk',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        API_ERROR: '❌ Gagal memproses permintaan:\n{message}',
        NO_RESPONSE: '❌ Tidak ada respon dari server',
        EMPTY_MESSAGE: '❌ Pesan tidak boleh kosong',
        SELF_MODE: '❌ Mode Self! Fitur ini hanya bisa digunakan oleh owner dan super owner'
    },
    FORMAT: {
        USAGE: `*Cara Penggunaan:*
• .{command} <pertanyaan>

*Contoh:*
• .{command} apa itu kucing?

*Model AI Lainnya:*
• GPT-4 OpenAI (.gpt4o)
• Claude 3.5 Sonnet (.claude) 
• Gemini Pro (.gemini)
• BlackBox AI (.blackbox)`,
        RESPONSE: `*AI Response*
*Model:* {model}
*Q:* {question}

*A:* {answer}`
    }
};

class AIChatCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['claude', 'gpt4o', 'gemini', 'blackbox'];
        this.description = 'Chat dengan AI';
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
        
        this.modelNames = {
            'gpt4o': 'GPT-4 OpenAI',
            'claude': 'Claude 3.5 Sonnet',
            'gemini': 'Gemini Pro',
            'blackbox': 'BlackBox AI'
        };
        
        this.modelOptions = {
            'gpt4o': 'gpt-4o',
            'claude': 'claude-3.5-sonnet',
            'gemini': 'gemini-pro',
            'blackbox': 'blackboxai'
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
            const usage = MESSAGES.FORMAT.USAGE.replace(/{command}/g, commandName);
            await this.sendWithThumb(from, usage, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        try {
            const chatInput = Array.isArray(args) ? args.join(' ') : args;
            if (!chatInput?.trim()) {
                throw new Error(MESSAGES.ERROR.EMPTY_MESSAGE);
            }

            const response = await axios.get('https://api.ryzendesu.vip/api/ai/blackbox', {
                params: {
                    chat: chatInput,
                    options: this.modelOptions[commandName]
                },
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            });

            if (response.data?.response) {
                const formattedResponse = MESSAGES.FORMAT.RESPONSE
                    .replace('{model}', this.modelNames[commandName])
                    .replace('{question}', chatInput)
                    .replace('{answer}', response.data.response);

                await this.sendWithThumb(from, formattedResponse, settings.botName);
                await this.sendReaction(msg, REACTIONS.SUCCESS);
            } else {
                throw new Error(MESSAGES.ERROR.NO_RESPONSE);
            }

        } catch (error) {
            console.error('Error AI chat:', error);
            const errorMsg = error.response 
                ? MESSAGES.ERROR.API_ERROR.replace('{message}', error.response.data?.error || error.message)
                : error.message;
                
            await this.sendWithThumb(from, errorMsg, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
        }
    }
}

module.exports = AIChatCommand;
