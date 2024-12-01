const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const settings = require('./ly-bot/settings/config.js');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

class CommandHandler {
    constructor(sock) {
        this.sock = sock;
        this.modules = new Map();
        this.loadModules();
        this.commands = [];

    }

    loadModules() {
        const modulePath = path.join(__dirname, "ly-bot/module");
        const files = fs.readdirSync(modulePath).filter(f => f.endsWith('.js'));
        
        console.log(chalk.cyan('\n[ MEMUAT MODULE ]====================='));
        console.log(chalk.white.bold('-> Status: Memulai memuat module'));
        
        for (const file of files) {
            try {
                const CommandClass = require(path.join(modulePath, file));
                const instance = new CommandClass(this.sock);
                const moduleName = file.replace('.js', '');
                
                if (instance.commands && Array.isArray(instance.commands)) {
                    instance.commands.forEach(cmd => {
                        this.modules.set(cmd, {
                            instance,
                            type: 'multi'
                        });
                        console.log(chalk.green('-> Loaded:'), chalk.white(cmd));
                    });
                } else if (instance.command) {
                    this.modules.set(instance.command, {
                        instance,
                        type: 'single'
                    });
                    console.log(chalk.green('-> Loaded:'), chalk.white(instance.command));
                } else {
                    this.modules.set(moduleName, {
                        instance,
                        type: 'file'
                    });
                    console.log(chalk.green('-> Loaded:'), chalk.white(moduleName));
                }
            } catch (error) {
                console.error(chalk.red('-> Failed:'), file, error);
            }
        }
        console.log(chalk.cyan('========================================\n'));
    }

    async handleCommand(msg) {
        try {
            if (!msg.message) return;
            
            const messageType = Object.keys(msg.message)[0];
            let body = '';

            if (messageType === 'conversation') {
                body = msg.message.conversation;
            } else if (messageType === 'extendedTextMessage') {
                body = msg.message.extendedTextMessage.text;
            } else if (messageType === 'imageMessage') {
                body = msg.message.imageMessage.caption || '';
            } else if (messageType === 'videoMessage') {
                body = msg.message.videoMessage.caption || '';
            }

            if (!body.startsWith(settings.prefix)) {
                if (settings.features.aiAssistant.enabled) {
                    if (settings.features.aiAssistant.v1.enabled && 
                        settings.features.aiAssistant.version === 'v1') {
                        const assistantV1 = this.modules.get('asisten');
                        if (assistantV1) {
                            await assistantV1.instance.handleMessage(msg);
                        }
                    }
                    
                    if (settings.features.aiAssistant.v2.enabled && 
                        settings.features.aiAssistant.version === 'v2') {
                        const assistantV2 = this.modules.get('asistenqwen');
                        if (assistantV2) {
                            await assistantV2.instance.handleMessage(msg);
                        }
                    }
                }
                return;
            }

            const [cmd, ...args] = body.slice(settings.prefix.length).trim().split(/ +/);
            const command = cmd.toLowerCase();

            console.log(chalk.cyan('\n[ ADA COMMAND NIH ]====================='));
            console.log(chalk.yellow('-> Command:'), chalk.white('Terdeteksi'));
            console.log(chalk.yellow('-> Command:'), chalk.white(`.${command}`));

            const sender = msg.key.participant || msg.key.remoteJid;
            const senderNumber = sender.split('@')[0];

            const botNumber = this.sock.user.id.split(':')[0];
            const isBot = senderNumber === botNumber || sender.includes(botNumber);

            // Pengecekan status pengirim
            const isSuperOwner = settings.superOwner.includes(senderNumber) || isBot;
            const isOwner = settings.owner.includes(senderNumber) || isBot;

            // Status pengirim
            let statusPengirim = 'User';
            if (isBot) statusPengirim = 'Bot';
            else if (isSuperOwner) statusPengirim = 'Super Owner';
            else if (isOwner) statusPengirim = 'Owner';

            console.log(chalk.yellow('-> Pengirim:'), chalk.white(senderNumber));
            console.log(chalk.yellow('-> Dikirim di:'), chalk.white(msg.key.remoteJid.endsWith('@g.us') ? 'Group Chat' : 'Private Chat'));
            console.log(chalk.cyan('================================'));
            console.log(chalk.yellow('-> Status Pengirim:'), chalk.white(statusPengirim));
            console.log(chalk.yellow('-> Status Bot:'), settings.publicMode ? chalk.green('Public') : chalk.red('Self'));

            // Cek akses berdasarkan status
            if (settings.commands.superowner.includes(command)) {
                if (!isSuperOwner) {
                    console.log(chalk.yellow('-> Status:'), chalk.red('Ditolak (Khusus Super Owner)'));
                    console.log(chalk.cyan('========================================\n'));
                    return;
                }
            } else if (settings.commands.owner.includes(command)) {
                if (!isOwner && !isSuperOwner) {
                    console.log(chalk.yellow('-> Status:'), chalk.red('Ditolak (Khusus Owner)'));
                    console.log(chalk.cyan('========================================\n'));
                    return;
                }
            } else {
                // Command publik & AI Asisten
                if (!settings.publicMode && !isOwner && !isSuperOwner) {
                    console.log(chalk.yellow('-> Status:'), chalk.red('Ditolak (Mode Self)'));
                    console.log(chalk.cyan('========================================\n'));
                    return;
                }
            }

            const moduleInfo = this.modules.get(command);
            if (!moduleInfo) {
                console.log(chalk.yellow('-> Status:'), chalk.red('Command tidak ditemukan'));
                console.log(chalk.cyan('========================================\n'));
                return;
            }

            await moduleInfo.instance.execute(
                msg.key.remoteJid,
                args.join(' '),
                msg.key.remoteJid.endsWith('@g.us'),
                msg,
                isOwner || isSuperOwner
            );

            console.log(chalk.yellow('-> Status:'), chalk.green('Berhasil dieksekusi'));
            console.log(chalk.cyan('========================================\n'));

        } catch (error) {
            console.error(chalk.red('-> Status: Error -'), error);
            console.log(chalk.cyan('========================================\n'));
        }
    }
}

module.exports = { CommandHandler };
