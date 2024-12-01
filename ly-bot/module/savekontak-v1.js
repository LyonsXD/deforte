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
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan',
        GROUP_ONLY: '❌ Fitur ini hanya bisa digunakan di dalam grup!',
        FAILED: '❌ Gagal menyimpan kontak:\n{error}'
    },
    SAVEKONTAK: {
        SUCCESS: '✅ Berhasil menyimpan {total} kontak\nFile telah dikirim ke owner',
        SUCCESS_OWNER: 'Target Grup: {group}\nTotal Kontak: {total}\nFormat File: VCF\nWaktu Proses: {duration}'
    }
};

class SaveKontakCommand {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['savekontak-v1', 'svkontakv1'];
        this.description = 'Save kontak versi 1';
        this.startTime = null;
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

    async sendWithThumb(jid, text, title, body = '') {
        let thumb;
        try {
            thumb = fs.readFileSync(this.defaultThumb);
        } catch (err) {
            thumb = Buffer.from('');
        }

        await this.sock.sendMessage(jid, {
            text: text,
            contextInfo: {
                forwardingScore: settings.features.msgForwarded.enabled ? settings.features.msgForwarded.score : 0,
                isForwarded: settings.features.msgForwarded.enabled,
                externalAdReply: {
                    title: title,
                    body: body || settings.footer,
                    mediaType: 1,
                    thumbnail: thumb,
                    renderLargerThumbnail: false,
                    showAdAttribution: true
                }
            }
        });
    }

    formatTime(ms) {
        const hours = Math.floor(ms / (60 * 60 * 1000));
        const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((ms % (60 * 1000)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    formatContactInfo(contacts) {
        let info = '';
        const maxDisplay = 10;
        
        for (let i = 0; i < Math.min(contacts.length, maxDisplay); i++) {
            info += `┃ ✎ ${i + 1}. ${contacts[i].name} (${contacts[i].number})\n`;
        }
        
        if (contacts.length > maxDisplay) {
            info += `┃ ✎ ...dan ${contacts.length - maxDisplay} kontak lainnya\n`;
        }
        
        return info;
    }

    isOwner(sender) {
        try {
            return settings.owner.includes(sender.split('@')[0]);
        } catch (error) {
            console.error('Error checking owner:', error);
            return false;
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

        if (!isGroup) {
            await this.sendWithThumb(from, MESSAGES.ERROR.GROUP_ONLY, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        try {
            this.startTime = Date.now();
            const group = await this.sock.groupMetadata(from);
            const participants = group.participants;
            let contacts = [];

            for (let participant of participants) {
                const contact = {
                    name: participant.notify || participant.vname || participant.name || participant.id.split('@')[0],
                    number: participant.id.split('@')[0]
                };
                contacts.push(contact);
            }

            const vcfContent = contacts.map(contact => {
                return `BEGIN:VCARD\nVERSION:3.0\nFN:${contact.name}\nTEL;type=CELL;type=VOICE;waid=${contact.number}:+${contact.number}\nEND:VCARD`;
            }).join('\n');

            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const sanitizedGroupName = group.subject.replace(/[<>:"/\\|?*]/g, '_');
            const vcfPath = path.join(tempDir, `${sanitizedGroupName}.vcf`);
            
            fs.writeFileSync(vcfPath, vcfContent);

            const duration = this.formatTime(Date.now() - this.startTime);
            const ownerNumber = settings.owner[0] + "@s.whatsapp.net";

            await this.sock.sendMessage(ownerNumber, {
                document: fs.readFileSync(vcfPath),
                fileName: `${group.subject}.vcf`,
                mimetype: 'text/vcard',
                contextInfo: {
                    externalAdReply: {
                        title: settings.botName,
                        body: "ꜱᴀᴠᴇ ᴄᴏɴᴛᴀᴄᴛ",
                        mediaType: 1,
                        thumbnail: fs.readFileSync(this.defaultThumb),
                        renderLargerThumbnail: false,
                        showAdAttribution: true
                    }
                }
            });

            await this.sendWithThumb(
                ownerNumber,
                MESSAGES.SAVEKONTAK.SUCCESS_OWNER
                    .replace('{group}', group.subject)
                    .replace('{total}', contacts.length)
                    .replace('{duration}', duration),
                settings.botName
            );

            await this.sendWithThumb(
                from,
                MESSAGES.SAVEKONTAK.SUCCESS.replace('{total}', contacts.length),
                settings.botName
            );

            await this.sendReaction(msg, REACTIONS.SUCCESS);

            fs.unlinkSync(vcfPath);

        } catch (error) {
            console.error('Error in savekontak:', error);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR.FAILED.replace('{error}', error.message),
                settings.botName
            );
            await this.sendReaction(msg, REACTIONS.ERROR);
        }
    }
}

module.exports = SaveKontakCommand;