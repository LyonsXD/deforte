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
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan',
        EMPTY_URL: '❌ URL tidak boleh kosong!',
        INVALID_URL: '❌ URL YouTube tidak valid!\n\nFormat URL yang benar:\n• https://youtube.com/watch?v=xxxxx\n• https://youtu.be/xxxxx\n\nPastikan URL adalah link video YouTube yang valid!',
        WRONG_FORMAT: '❌ Masukkan URL YouTube!\n\nCara penggunaan:\n.ytmp4 [URL]\n\nContoh:\n.ytmp4 https://youtu.be/xxxxx',
        API_ERROR: '❌ Gagal mendapatkan info video!\n\nKemungkinan penyebab:\n• Server sedang bermasah\n• URL tidak valid\n• Video tidak tersedia\n\nTips: Coba lagi dalam beberapa saat',
        DOWNLOAD_ERROR: '❌ Gagal mengunduh video!\n\nTips: Coba lagi atau pilih video lain'
    },
    YOUTUBE: {
        PROCESS: '⌛ Mohon tunggu, sedang mengunduh video...\n\nTips: Waktu download tergantung ukuran video',
        SUCCESS: '✅ Berhasil mengunduh video!\n\nJudul: {title}\nFormat: MP4 Video (720p)'
    }
};

class YoutubeMP4Downloader {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['ytmp4'];
        this.description = 'Download video dari YouTube';
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
        this.API_URL = 'https://api.ryzendesu.vip/api/downloader/ytmp4';
    }

    async sendWithThumb(jid, text, title, body = '') {
        const thumb = fs.readFileSync(this.defaultThumb);
        
        await this.sock.sendMessage(jid, {
            text: text,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: body.toUpperCase().replace(/[A-Z]/g, char => String.fromCharCode(0xFF21 + char.charCodeAt(0) - 65)),
                    mediaType: 1,
                    thumbnail: thumb,
                    renderLargerThumbnail: false,
                    showAdAttribution: true
                }
            }
        });
    }

    isYoutubeUrl(url) {
        return /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/.test(url);
    }

    async sendReaction(msg, emoji) {
        await this.sock.sendMessage(msg.key.remoteJid, {
            react: {
                text: emoji,
                key: msg.key
            }
        });
    }

    async downloadVideo(from, url, msg) {
        try {
            if (!url || typeof url !== 'string') {
                throw new Error(MESSAGES.ERROR.EMPTY_URL);
            }

            if (!this.isYoutubeUrl(url)) {
                throw new Error(MESSAGES.ERROR.INVALID_URL);
            }

            await this.sendReaction(msg, REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)]);
            await this.sendWithThumb(from, MESSAGES.YOUTUBE.PROCESS, settings.botName, "Mengunduh video");

            const response = await axios.get(this.API_URL, {
                params: { url: url, reso: '720p' },
                timeout: 30000
            }).catch(err => {
                console.error('API Error:', err);
                throw new Error(MESSAGES.ERROR.API_ERROR);
            });

            if (response.data.status !== 'tunnel' || !response.data.url) {
                throw new Error(MESSAGES.ERROR.DOWNLOAD_ERROR);
            }

            const videoResponse = await axios.get(response.data.url, {
                responseType: 'arraybuffer',
                timeout: 60000
            }).catch(() => {
                throw new Error(MESSAGES.ERROR.DOWNLOAD_ERROR);
            });

            await this.sock.sendMessage(from, {
                video: Buffer.from(videoResponse.data),
                mimetype: 'video/mp4',
                caption: `*ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
                        `📝 *ꜰɪʟᴇɴᴀᴍᴇ:* ${response.data.filename}\n` +
                        `🎥 *ᴋᴜᴀʟɪᴛᴀꜱ:* 720ᴘ`,
                fileName: response.data.filename
            });

            await this.sendReaction(msg, REACTIONS.SUCCESS);
            await this.sendWithThumb(
                from,
                MESSAGES.YOUTUBE.SUCCESS.replace('{title}', response.data.filename.replace('.mp4', '')),
                settings.botName,
                "Berhasil mengunduh video"
            );

            return { success: true };

        } catch (error) {
            console.error('YouTube Download Error:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                error.message || MESSAGES.ERROR.DEFAULT + 'Terjadi kesalahan pada sistem',
                settings.botName,
                "Eror"
            );
            return { error: 'Failed' };
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

        if (!args) {
            await this.sendWithThumb(from, MESSAGES.ERROR.WRONG_FORMAT, settings.botName);
            await this.sendReaction(msg, REACTIONS.ERROR);
            return;
        }

        const randomProcess = REACTIONS.PROCESS[Math.floor(Math.random() * REACTIONS.PROCESS.length)];
        await this.sendReaction(msg, randomProcess);

        return this.downloadVideo(from, args, msg);
    }
}

module.exports = YoutubeMP4Downloader;
