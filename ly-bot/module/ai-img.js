const fs = require('fs');
const path = require('path');
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
        NO_PROMPT: '❌ Format Salah!\n\nSilahkan masukkan prompt untuk generate gambar',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        MAINTENANCE: 'Server sedang maintenance\n\nSilahkan coba model AI lain:',
        API_ERROR: '❌ Gagal memproses permintaan:\n{message}',
        SELF_MODE: '❌ Mode Self Mode! Fitur ini hanya untuk owner & super owner!'
    },
    FORMAT: {
        USAGE: `*Cara Penggunaan:*
• .{command} <deskripsi gambar>

*Contoh:*
• .{command} a girl with glasses pink short hair

*Model AI Lainnya:*
• Text2Img
• Waifu Diffusion  
• Flux Diffusion
• Flux Schnell
• Aimoji Generator`,
        GENERATE: `*Generate Image*
• *Model:* {model}
• *Prompt:* {prompt}
• *Status:* Generating...`
    }
};

class AIImageCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['text2img', 'waifu', 'flux', 'schnell', 'aimoji'];
        this.description = 'Generate gambar dari teks';
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
        
        this.modelNames = {
            'text2img': 'Text2Img',
            'waifu': 'Waifu Diffusion',
            'flux': 'Flux Diffusion', 
            'schnell': 'Flux Schnell',
            'aimoji': 'Aimoji Generator'
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

    getEndpoint(command) {
        const endpoints = {
            'text2img': 'text2img',
            'waifu': 'waifu-diff',
            'flux': 'flux-diffusion',
            'schnell': 'flux-schnell',
            'aimoji': 'aimoji'
        };
        return endpoints[command] || 'text2img';
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

        if (!args) {
            const usage = MESSAGES.FORMAT.USAGE.replace(/{command}/g, commandName);
            await this.sendWithThumb(from, usage, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        try {
            const modelName = this.modelNames[commandName];
            const generateMsg = MESSAGES.FORMAT.GENERATE
                .replace('{model}', modelName)
                .replace('{prompt}', args);
                
            await this.sendWithThumb(from, generateMsg, settings.botName);

            // Proses generate image
            // ... kode generate image tetap sama ...

            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error(`Error ${commandName}:`, error);
            const errorMsg = MESSAGES.ERROR.API_ERROR.replace('{message}', error.message);
            await this.sendWithThumb(from, errorMsg, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
        }
    }
}

module.exports = AIImageCommand;
