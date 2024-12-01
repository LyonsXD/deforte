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
        NO_URL: '❌ URL tidak boleh kosong!',
        INVALID_URL: '❌ URL Bilibili tidak valid!\n\nFormat URL yang benar:\n• https://bilibili.tv/id/video/xxxxx\n• https://www.bilibili.com/video/xxxxx\n• https://bili.im/xxxxx\n\nPastikan URL adalah link video Bilibili yang valid!',
        NO_VIDEO: '❌ Link video tidak ditemukan!',
        DOWNLOAD_FAILED: '❌ Gagal mengunduh video!\n\nTips: Coba lagi atau pilih video lain',
        VIDEO_INFO_FAILED: '❌ Gagal mendapatkan info video!\n\nKemungkinan penyebab:\n• Video tidak tersedia\n• URL shortlink tidak valid\n• Server sedang maintenance\n\nTips: Coba gunakan URL asli Bilibili',
        ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus owner bot!',
        SUPER_ACCESS_DENIED: '❌ Akses Ditolak: Fitur ini khusus super owner bot!',
        SELF_MODE: '❌ Bot dalam mode self! Hanya owner yang bisa menggunakan'
    },
    FORMAT: {
        USAGE: '❌ Masukkan URL Bilibili!\n\nCara Penggunaan:\n.bstation [url]\n\nContoh:\n.bstation https://bilibili.tv/id/video/xxxxx'
    },
    SUCCESS: '✅ Berhasil mengunduh video!\n\n'
};

class BilibiliDownloader {
    constructor(sock) {
        this.sock = sock;
        this.commands = ['bstation', 'bili'];
        this.description = 'Download video dari Bilibili/BStation';
        this.defaultThumb = path.join(__dirname, '..', 'media', 'thumb.jpg');
        this.API_URL = 'https://api.ryzendesu.vip/api/downloader/bilibili';
    }

    async sendReaction(msg, emoji) {
        await this.sock.sendMessage(msg.key.remoteJid, {
            react: {
                text: emoji,
                key: msg.key
            }
        });
    }

    async sendWithThumb(jid, text, title, body = '') {
        await this.sock.sendMessage(jid, {
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

    isBilibiliUrl(url) {
        return /^(https?:\/\/)?(www\.)?(bilibili\.(tv|com)|bstation\.tv|bili\.im)/.test(url);
    }

    async downloadVideo(from, url) {
        try {
            // Validasi URL
            if (!url || typeof url !== 'string') {
                throw new Error('❌ URL tidak boleh kosong!');
            }

            if (!this.isBilibiliUrl(url)) {
                throw new Error('❌ URL Bilibili tidak valid!\n\n' + 
                              '*Format URL yang benar:*\n' +
                              '• https://bilibili.tv/id/video/xxxxx\n' +
                              '• https://www.bilibili.com/video/xxxxx\n' +
                              '• https://bili.im/xxxxx\n\n' +
                              '*Pastikan URL adalah link video Bilibili yang valid!*');
            }

            await this.sendReaction(msg, REACTIONS.PROCESS);
            await this.sendWithThumb(
                from,
                MESSAGES.PROCESSING,
                settings.botName,
                "Processing Video..."
            );

            // Coba resolve shortlink bili.im jika diperlukan
            let finalUrl = url;
            if (url.includes('bili.im')) {
                try {
                    const response = await axios.get(url, {
                        maxRedirects: 5,
                        validateStatus: function (status) {
                            return status >= 200 && status < 400;
                        }
                    });
                    finalUrl = response.request.res.responseUrl || url;
                } catch (err) {
                    console.error('Shortlink resolve error:', err);
                }
            }

            // Get video info dengan retry
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    const response = await axios.get(this.API_URL, {
                        params: { url: finalUrl },
                        timeout: 30000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });

                    if (!response.data.status || !response.data.data) {
                        throw new Error('Invalid response data');
                    }

                    const videoData = response.data.data;
                    const videoUrl = videoData.mediaList.videoList[0]?.url;
                    const filename = videoData.mediaList.videoList[0]?.filename || 'bstation_video.mp4';

                    if (!videoUrl) {
                        throw new Error('❌ Link video tidak ditemukan!');
                    }

                    await this.sendReaction(msg, REACTIONS.PROCESS);
                    await this.sendWithThumb(
                        from,
                        MESSAGES.DOWNLOADING,
                        settings.botName,
                        "Downloading..."
                    );

                    // Download video
                    const videoResponse = await axios.get(videoUrl, {
                        responseType: 'arraybuffer',
                        timeout: 60000
                    }).catch(() => {
                        throw new Error('❌ Gagal mengunduh video!\n\n' +
                                      '*Tips:* Coba lagi atau pilih video lain');
                    });

                    // Kirim video
                    await this.sock.sendMessage(from, {
                        video: Buffer.from(videoResponse.data),
                        caption: `*BILIBILI VIDEO DOWNLOADER*\n\n` +
                                `📝 *Judul:* ${videoData.title}\n` +
                                `👀 *Views:* ${videoData.views}\n` +
                                `👍 *Like:* ${videoData.like}\n` +
                                `📝 *Deskripsi:* ${videoData.description?.substring(0, 100)}...`,
                        fileName: filename,
                        mimetype: 'video/mp4'
                    });

                    await this.sendReaction(msg, REACTIONS.SUCCESS);
                    await this.sendWithThumb(
                        from,
                        MESSAGES.SUCCESS +
                        `*Judul:* ${videoData.title}`,
                        settings.botName,
                        "Download Success"
                    );

                    return { success: true };

                } catch (err) {
                    retryCount++;
                    if (retryCount === maxRetries) {
                        throw new Error('❌ Gagal mendapatkan info video!\n\n' +
                                    '*Kemungkinan penyebab:*\n' +
                                    '• Video tidak tersedia\n' +
                                    '• URL shortlink tidak valid\n' +
                                    '• Server sedang maintenance\n\n' +
                                    '*Tips:* Coba gunakan URL asli Bilibili');
                    }
                    // Tunggu sebentar sebelum retry
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

        } catch (error) {
            console.error('Bilibili Download Error:', error);
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                MESSAGES.ERROR + error.message || '❌ Terjadi kesalahan! Silakan coba lagi nanti.',
                settings.botName,
                "Error Occurred"
            );
            return { error: 'Failed' };
        }
    }

    async execute(from, args, isGroup, msg, commandName) {
        const messageAuthor = msg.key.participant || msg.key.remoteJid;
        const senderNumber = messageAuthor.split('@')[0];
        
        // Langsung return tanpa respon jika mode self dan bukan owner
        if (!settings.publicMode && 
            !settings.owner.includes(senderNumber) && 
            !settings.superOwner.includes(senderNumber)) {
            return;
        }

        // Cek level command
        if (settings.commands.superowner.includes(commandName)) {
            if (!settings.superOwner.includes(senderNumber)) {
                await this.sendWithThumb(from, MESSAGES.SUPER_OWNER_ONLY, settings.botName, "ᴀᴋꜱᴇꜱ ᴅɪᴛᴏʟᴀᴋ");
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }
        } else if (settings.commands.owner.includes(commandName)) {
            if (!settings.owner.includes(senderNumber) && !settings.superOwner.includes(senderNumber)) {
                await this.sendWithThumb(from, MESSAGES.OWNER_ONLY, settings.botName, "ᴀᴋꜱᴇꜱ ᴅɪᴛᴏʟᴀᴋ");
                await this.sendReaction(msg, REACTIONS.ERROR);
                return;
            }
        }

        // Cek format URL
        if (!args) {
            await this.sendReaction(msg, REACTIONS.ERROR);
            await this.sendWithThumb(
                from,
                MESSAGES.NO_URL,
                settings.botName,
                "Format Salah"
            );
            return;
        }

        return this.downloadVideo(from, args, msg);
    }
}

module.exports = BilibiliDownloader;