const fs = require('fs');
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
        GROUP_ONLY: '❌ Fitur ini hanya bisa digunakan di dalam grup!',
        ADMIN_ONLY: '❌ Fitur ini hanya untuk admin grup!',
        BOT_ADMIN: '❌ Bot harus menjadi admin untuk menggunakan fitur ini!',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!'
    },
    FORMAT: {
        USAGE: `*Cara Penggunaan:*
• .antilink on/off

*Contoh:*
• .antilink on - Mengaktifkan antilink
• .antilink off - Menonaktifkan antilink`,
        STATUS: `*Antilink Status*

• *Status:* {status}
• *Aksi:* {action}
• *Target:* Member Grup
• *Pengecualian:* Admin & Owner`,
        DETECTED: `*Antilink Detected*

• *User:* @{user}
• *Aksi:* Pesan dihapus
• *Alasan:* Mengirim link`
    }
};

class AntiLinkCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['antilink'];
        this.description = 'Mengatur fitur antilink';
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
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
        
        if (!settings.publicMode && !settings.owner.includes(senderNumber)) {
            await this.sendWithThumb(from, MESSAGES.ERROR.ACCESS_DENIED, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        if (!isGroup) {
            await this.sendWithThumb(from, MESSAGES.ERROR.GROUP_ONLY, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        const groupMetadata = await this.sock.groupMetadata(from);
        const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin === 'admin';
        const botNumber = this.sock.user.id.split(':')[0] + "@s.whatsapp.net";
        const isBotAdmin = groupMetadata.participants.find(p => p.id === botNumber)?.admin === 'admin';

        if (!isAdmin && !settings.owner.includes(senderNumber)) {
            await this.sendWithThumb(from, MESSAGES.ERROR.ADMIN_ONLY, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        if (!isBotAdmin) {
            await this.sendWithThumb(from, MESSAGES.ERROR.BOT_ADMIN, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        const action = args?.toLowerCase();
        if (!action || !['on', 'off'].includes(action)) {
            await this.sendWithThumb(from, MESSAGES.FORMAT.USAGE, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        try {
            settings.features.antilink.enabled = action === 'on';
            fs.writeFileSync('./ly-bot/settings/config.js', JSON.stringify(settings, null, 4));

            const status = MESSAGES.FORMAT.STATUS
                .replace('{status}', action === 'on' ? '✅ Aktif' : '❌ Nonaktif')
                .replace('{action}', action === 'on' ? 'Hapus pesan & Peringatan' : 'Tidak ada');

            await this.sendWithThumb(from, status, settings.botName);
            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error antilink:', error);
            await this.sendWithThumb(from, MESSAGES.ERROR.DEFAULT, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
        }
    }

    async handleMessage(msg) {
        if (!msg.key.remoteJid.endsWith('@g.us')) return;
        if (!settings.features.antilink.enabled) return;

        const groupId = msg.key.remoteJid;
        const messageAuthor = msg.key.participant || msg.key.remoteJid;
        
        let content = '';
        const messageTypes = ['conversation', 'extendedTextMessage', 'imageMessage', 'videoMessage'];
        
        for (const type of messageTypes) {
            if (msg.message?.[type]) {
                content = msg.message[type].text || 
                         msg.message[type].caption || 
                         msg.message[type].conversation || '';
                break;
            }
        }

        // Regex untuk mendeteksi berbagai jenis link
        const linkRegex = /(https?:\/\/)?[\w\-~]+(\.[\w\-~]+)+(\/[\w\-~]*)*(#[\w-]*)?(\?[^\s]*)?/gi;
        
        // Cek apakah pesan mengandung link
        if (!linkRegex.test(content)) return;

        try {
            const groupMetadata = await this.sock.groupMetadata(groupId);
            const participants = groupMetadata.participants;
            const isAdmin = participants.find(p => p.id === messageAuthor)?.admin === 'admin';
            const isOwner = settings.owner.includes(messageAuthor.split('@')[0]);
            const botNumber = this.sock.user.id.split(':')[0] + "@s.whatsapp.net";
            const isBotAdmin = participants.find(p => p.id === botNumber)?.admin === 'admin';

            // Skip jika pengirim admin atau owner
            if (isAdmin || isOwner) return;
            if (!isBotAdmin) return;

            // Hapus pesan
            await this.sock.sendMessage(groupId, { delete: msg.key });
            
            // Kirim peringatan
            await this.sock.sendMessage(groupId, {
                text: `*ᴀɴᴛɪʟɪɴᴋ ᴅᴇᴛᴇᴄᴛᴇᴅ*\n\n` +
                     `• *ᴜꜱᴇʀ:* @${messageAuthor.split('@')[0]}\n` +
                     `• *ᴀᴋꜱɪ:* ᴘᴇꜱᴀɴ ᴅɪʜᴀᴘᴜꜱ\n` +
                     `• *ᴀʟᴀꜱᴀɴ:* ᴍᴇɴɢɪʀɪᴍ ʟɪɴᴋ`,
                mentions: [messageAuthor]
            });
        } catch (err) {
            console.error('Error in antilink:', err);
        }
    }
}

module.exports = AntiLinkCommand;