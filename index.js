const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const chalk = require("chalk");
const path = require("path");
const settings = require("./ly-bot/settings/config.js");
const { CommandHandler } = require("./cmd.js");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const sessionDir = "./session";
let sock = null;

const MESSAGES = {
    CONNECTED: `*ᴊᴏɪɴ ᴄʜᴀɴɴᴇʟ ɪɴꜰᴏ ꜱᴄʀɪᴘᴛ ʙᴏᴛ ᴡᴀ ɢʀᴀᴛɪꜱ:*\n` +
               `https://whatsapp.com/channel/0029VatcVey7NoZwa7gBFR2o\n\n` +
               `*ꜱᴜʙꜱᴄʀɪʙᴇ ʏᴏᴜᴛᴜʙᴇ:*\n` +
               `https://youtube.com/@ly-team?si=DYrB03D1QJO3JZa\n\n` +
               `> *ɴᴏᴛᴇ:* ꜱᴄʀɪᴘᴛ ɪɴɪ 100% ɢʀᴀᴛɪꜱ, ᴊᴀɴɢᴀɴ ᴅɪᴊᴜᴀʟ, ꜱʜᴀʀᴇ?? ᴡᴀᴊɪʙ ᴄʀᴇᴅɪᴛ!!`
};

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Safari", "1.0.0"],
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true
    });

    const commandHandler = new CommandHandler(sock);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg?.message) return;
        
        const sender = msg.key.participant || msg.key.remoteJid;
        const senderNumber = sender.split('@')[0];
        const isSuperOwner = settings.superOwner.includes(senderNumber);
        const isOwner = settings.owner.includes(senderNumber);
        const isBot = senderNumber === sock.user.id.split(':')[0];

        if (settings.publicMode || isOwner || isSuperOwner || isBot) {
            await commandHandler.handleCommand(msg);
        }
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "open") {
            // Kirim pesan ke diri sendiri saat terkoneksi
            const botNumber = sock.user.id.split(':')[0];
            const connectImage = fs.readFileSync('./ly-bot/media/connect.jpg');
            
            await sock.sendMessage(`${botNumber}@s.whatsapp.net`, {
                image: connectImage,
                caption: MESSAGES.CONNECTED,
                contextInfo: {
                    externalAdReply: {
                        title: "BOT TELAH TERKONEKSI",
                        body: "ꜱᴄʀɪᴘᴛ ʙʏ ʟʏ-ᴛᴇᴀᴍ",
                        mediaType: 1,
                        thumbnail: null,
                        renderLargerThumbnail: false,
                        showAdAttribution: true
                    }
                }
            });
        }
        
        if (connection === "close") {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        }
    });

    if (!fs.existsSync(path.join(sessionDir, 'creds.json'))) {
        const phoneNumber = await new Promise(resolve => {
            rl.question('Masukkan nomor WhatsApp (628xxx): ', resolve);
        });
        
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\nKode pairing: ${code}`);
        rl.close();
    }

    return sock;
}

process.on('uncaughtException', console.error);
process.on('SIGINT', async () => {
    if (sock) await sock.end();
    process.exit();
});

if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

connectToWhatsApp();