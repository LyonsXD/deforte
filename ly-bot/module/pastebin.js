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
        WRONG_FORMAT: '❌ Format Salah!\n\nPenggunaan: .pastebin <text>',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan',
        FAILED: '❌ Gagal membuat paste:\n{error}'
    },
    SUCCESS: '✅ Paste berhasil dibuat!\n\nLink: {link}'
};

class CreatePastebinCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['pastebin'];
        this.description = 'Membuat paste di pastebin';
        this.PASTEBIN_API_KEY = 'BTKz2WrkAp_vO4ANmneUQC_cpl2HAjpj';
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

        const text = Array.isArray(args) ? args.join(' ') : args;
        if (!text || text.trim() === '') {
            await this.sendWithThumb(from, MESSAGES.ERROR.WRONG_FORMAT, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        const title = 'LY BOT';

        try {
            const params = new URLSearchParams();
            params.append('api_dev_key', this.PASTEBIN_API_KEY);
            params.append('api_option', 'paste');
            params.append('api_paste_code', text);
            params.append('api_paste_private', '1');
            params.append('api_paste_name', title);
            params.append('api_paste_expire_date', 'N');
            params.append('api_paste_format', 'text');

            const response = await axios.post('https://pastebin.com/api/api_post.php', params);

            if (response.data.includes('pastebin.com')) {
                await this.sendWithThumb(
                    from, 
                    MESSAGES.SUCCESS.replace('{link}', response.data),
                    settings.botName
                );
                await this.sendReaction(msg, REACTIONS.SUCCESS);
            } else {
                throw new Error(response.data);
            }

        } catch (error) {
            console.error('Error creating paste:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
        }
    }
}

module.exports = CreatePastebinCommand;