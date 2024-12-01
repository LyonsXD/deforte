const settings = require('../settings/config.js');
const fs = require('fs');
const path = require('path');

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
        NO_NUMBER: '❌ Format Salah!\n\nCara Penggunaan:\n.cekgc <nomor>\n\nContoh:\n.cekgc 628123456789',
        INVALID_NUMBER: '❌ Nomor harus diawali dengan 62!',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan'
    },
    NO_GROUPS: 'Tidak ada grup yang sama'
};

class ListGrupCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['cekgc'];
        this.description = 'Cek grup yang sama dengan target';
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

    async notifyOwner(title, message) {
        try {
            const ownerNumber = settings.owner[0] + "@s.whatsapp.net";
            await this.sendWithThumb(ownerNumber, `*${title}*\n\n${message}`, `${settings.botName} - ${title}`, "Group List Result");
        } catch (error) {
            console.error('Error sending owner notification:', error);
        }
    }

    truncateText(text, maxLength = 30) {
        if (text.length > maxLength) {
            return text.substring(0, maxLength - 3) + '...';
        }
        return text;
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

        if (!args) {
            await this.sendWithThumb(from, MESSAGES.ERROR.NO_NUMBER, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        try {
            let number = args.replace(/[^0-9]/g, '');
            if (!number.startsWith('62')) {
                await this.sendWithThumb(from, MESSAGES.ERROR.INVALID_NUMBER, settings.botName);
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }

            const targetJid = number + '@s.whatsapp.net';
            const groups = await this.sock.groupFetchAllParticipating();
            const userGroups = [];

            for (const group of Object.values(groups)) {
                const participants = group.participants || [];
                if (participants.some(p => p.id === targetJid)) {
                    userGroups.push({
                        name: this.truncateText(group.subject),
                        id: group.id,
                        members: participants.length,
                        creation: group.creation,
                        isAdmin: participants.find(p => p.id === targetJid)?.admin ? true : false
                    });
                }
            }

            let message = `*Target:* ${number}\n`;
            message += `*Total Grup:* ${userGroups.length}\n`;
            
            if (userGroups.length > 0) {
                message += `\n*DAFTAR GRUP YANG SAMA (BOT & TARGET)*\n`;
                userGroups.forEach((group, index) => {
                    message += `\n${index + 1}. *${group.name}*`;
                    message += `\n• *ID:* \`\`\`${group.id.split('@')[0]}\`\`\``;
                    message += `\n• *Member:* ${group.members}`;
                    message += `\n• *Role:* ${group.isAdmin ? 'Admin' : 'Member'}`;
                    message += `\n• *Dibuat:* ${new Date(group.creation * 1000).toLocaleString('id-ID')}`;
                });
            } else {
                message += `\n*DAFTAR GRUP YANG SAMA*\n`;
                message += MESSAGES.NO_GROUPS;
            }

            await this.notifyOwner("LIST GRUP", message);
            await this.sendReaction(msg, REACTIONS.SUCCESS);

        } catch (error) {
            console.error('Error:', error);
            await this.notifyOwner("ERROR", `Gagal mendapatkan informasi: ${error.message}`);
            await this.sendReaction(msg, REACTIONS.ERROR);
        }
    }
}

module.exports = ListGrupCommand;
