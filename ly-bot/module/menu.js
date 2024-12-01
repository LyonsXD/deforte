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
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan',
        FAILED: '❌ Gagal menampilkan menu:\n{error}'
    }
};

class MenuCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['menu', 'help'];
        this.description = 'Menampilkan daftar perintah';
        this.startTime = process.hrtime()[0] * 1000;
        this.settings = settings;
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

    getRuntime() {
        const uptime = (process.hrtime()[0] * 1000) - this.startTime;
        let seconds = Math.floor(uptime / 1000);
        let minutes = Math.floor(seconds / 60);
        let hours = Math.floor(minutes / 60);
        let days = Math.floor(hours / 24);

        seconds %= 60;
        minutes %= 60;
        hours %= 24;

        return `${days} Hari ${hours} Jam ${minutes} Menit ${seconds} Detik`;
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
            // Sisanya sama seperti kode asli
            const menuText = `╭─❒ 「 *ɪɴꜰᴏʀᴍᴀꜱɪ ʙᴏᴛ* 」
├ *ɴᴀᴍᴀ:* ${this.settings.botName}
├ *ᴠᴇʀꜱɪᴏɴ:* ${this.settings.version}
├ *ʀᴜɴᴛɪᴍᴇ:* ${this.getRuntime()}
├ *ᴍᴏᴅᴇ:* ${this.settings.publicMode ? 'ᴘᴜʙʟɪᴄ' : 'ꜱᴇʟꜰ'}
├ *ᴘʀᴇꜰɪx:* ${this.settings.prefix}
╰❒

╭─❒ 「 *SUPER OWNER MENU* 」 
├ ${this.settings.prefix}public
├ ${this.settings.prefix}self
├ ${this.settings.prefix}setprefix
├ ${this.settings.prefix}setbotname
├ ${this.settings.prefix}setbotpp
├ ${this.settings.prefix}addowner
├ ${this.settings.prefix}delowner
├ ${this.settings.prefix}listowner
╰❒

╭─❒ 「 *PUSH MENU* 」
├ ${this.settings.prefix}pushkontak-v1
├ ${this.settings.prefix}pushkontak-v2
├ ${this.settings.prefix}pushkontak-v3
├ ${this.settings.prefix}pushkontak-v4
├ ${this.settings.prefix}savekontak-v1
├ ${this.settings.prefix}savekontak-v2
╰❒

╭─❒ 「 *JB MENU* 」
├ ${this.settings.prefix}jpm
├ ${this.settings.prefix}listidgc
├ ${this.settings.prefix}hidetag
├ ${this.settings.prefix}cekgc
╰❒

╭─❒ 「 *ADMIN MENU* 」
├ ${this.settings.prefix}promote
├ ${this.settings.prefix}demote
├ ${this.settings.prefix}antilink
├ ${this.settings.prefix}gc
├ ${this.settings.prefix}leave
├ ${this.settings.prefix}welcome
├ ${this.settings.prefix}resetlinkgc
├ ${this.settings.prefix}kick
╰❒

╭─❒ 「 *MENU AI CHAT* 」
├ ${this.settings.prefix}claude
├ ${this.settings.prefix}gpt4o
├ ${this.settings.prefix}gemini
├ ${this.settings.prefix}blackbox
├ ${this.settings.prefix}qwen
╰❒
╰❒

╭─❒ 「 *MENU AI IMAGE* 」
├ ${this.settings.prefix}text2img
├ ${this.settings.prefix}waifu
├ ${this.settings.prefix}flux
├ ${this.settings.prefix}flux1dev
├ ${this.settings.prefix}catimg
├ ${this.settings.prefix}schnell
├ ${this.settings.prefix}aimoji
├ ${this.settings.prefix}explainimg
├ ${this.settings.prefix}remini
╰❒

╭─❒ 「 *MENU OTHER AI* 」
├ ${this.settings.prefix}musicgen
╰❒

╭─❒ 「 *MENU DOWNLOADER* 」
├ ${this.settings.prefix}tiktok
├ ${this.settings.prefix}spotify
├ ${this.settings.prefix}ytmp3
├ ${this.settings.prefix}ytmp4
├ ${this.settings.prefix}bstation
╰❒

╭─❒ 「 *MENU STICKER* 」
├ ${this.settings.prefix}sticker
├ ${this.settings.prefix}quotly
├ ${this.settings.prefix}brat
╰❒

╭─❒ 「 *TOOLS MENU* 」
├ ${this.settings.prefix}pastebin
├ ${this.settings.prefix}imgtourl
╰❒

> ${this.settings.footer}`;

            await this.sendWithThumb(from, menuText, settings.botName);
            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error in menu command:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
        }
    }
}

module.exports = MenuCommand;