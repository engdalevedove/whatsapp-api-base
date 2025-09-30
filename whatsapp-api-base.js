const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');

const app = express();
app.use(express.json());

// Configurações
const PORT = 3000;
const LOG_FILE = 'whatsapp-base.log';

// Função de log
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './whatsapp-session-base'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Estado da conexão
let isReady = false;

// Eventos do cliente
client.on('qr', (qr) => {
    log('QR Code gerado. Escaneie com seu WhatsApp:');
    console.log('\n' + '='.repeat(50));
    qrcode.generate(qr, { small: true });
    console.log('='.repeat(50) + '\n');
});

client.on('ready', () => {
    log('WhatsApp Web conectado e pronto!');
    isReady = true;
});

client.on('authenticated', () => {
    log('WhatsApp autenticado com sucesso');
});

client.on('auth_failure', (msg) => {
    log(`Falha na autenticação: ${msg}`);
    isReady = false;
});

client.on('disconnected', (reason) => {
    log(`WhatsApp desconectado: ${reason}`);
    isReady = false;
});

// Função para formatar número
function formatPhoneNumber(number) {
    const clean = number.replace(/\D/g, '');
    
    if (clean.length === 11 && clean.startsWith('11')) {
        return `55${clean}@c.us`;
    } else if (clean.length === 10 && clean.startsWith('1')) {
        return `5511${clean}@c.us`;
    } else if (clean.length === 13 && clean.startsWith('55')) {
        return `${clean}@c.us`;
    } else if (clean.length === 12 && clean.startsWith('55')) {
        return `${clean}@c.us`;
    }
    
    return `55${clean}@c.us`;
}

// ROTAS DA API

// Status da conexão
app.get('/status', (req, res) => {
    res.json({
        connected: isReady,
        timestamp: new Date().toISOString(),
        service: 'WhatsApp-API-Base'
    });
});

// Listar grupos
app.get('/groups', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(503).json({ error: 'WhatsApp não conectado' });
        }

        const chats = await client.getChats();
        const groups = chats
            .filter(chat => chat.isGroup)
            .map(group => ({
                id: group.id._serialized,
                name: group.name,
                participantsCount: group.participants ? group.participants.length : 0
            }));

        res.json({
            success: true,
            groups: groups,
            total: groups.length
        });

    } catch (error) {
        log(`Erro ao listar grupos: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Enviar mensagem para grupo
app.post('/send-group', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(503).json({ error: 'WhatsApp não conectado' });
        }

        const { groupName, message } = req.body;

        if (!groupName || !message) {
            return res.status(400).json({ 
                error: 'groupName e message são obrigatórios' 
            });
        }

        const chats = await client.getChats();
        const group = chats.find(chat => 
            chat.isGroup && 
            chat.name && 
            chat.name.toLowerCase().includes(groupName.toLowerCase())
        );

        if (!group) {
            log(`Grupo não encontrado: ${groupName}`);
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }

        await group.sendMessage(message);
        
        log(`Mensagem enviada para grupo: ${group.name}`);
        
        res.json({
            success: true,
            groupName: group.name,
            messageSent: message,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        log(`Erro ao enviar mensagem: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Enviar mensagem para contato individual
app.post('/send-contact', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(503).json({ error: 'WhatsApp não conectado' });
        }

        const { phone, message, contactName } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ 
                error: 'phone e message são obrigatórios' 
            });
        }

        const chatId = formatPhoneNumber(phone);
        
        let finalMessage = message;
        if (contactName) {
            finalMessage = message.replace('@contactname', contactName);
        } else {
            finalMessage = message.replace('@contactname', 'Cliente');
        }

        const numberExists = await client.isRegisteredUser(chatId);
        if (!numberExists) {
            log(`Número não encontrado no WhatsApp: ${phone}`);
            return res.status(404).json({ 
                error: 'Número não encontrado no WhatsApp',
                phone: phone 
            });
        }

        await client.sendMessage(chatId, finalMessage);
        
        log(`Mensagem enviada para: ${phone} (${contactName || 'Sem nome'})`);
        
        res.json({
            success: true,
            phone: phone,
            contactName: contactName || null,
            messageSent: finalMessage,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        log(`Erro ao enviar mensagem para ${req.body.phone}: ${error.message}`);
        res.status(500).json({ 
            error: error.message,
            phone: req.body.phone 
        });
    }
});

// Envio em massa
app.post('/send-bulk', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(503).json({ error: 'WhatsApp não conectado' });
        }

        const { contacts, message, delayMs = 2000 } = req.body;

        if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
            return res.status(400).json({ 
                error: 'contacts deve ser um array não vazio' 
            });
        }

        if (!message) {
            return res.status(400).json({ 
                error: 'message é obrigatório' 
            });
        }

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        log(`Iniciando envio em massa para ${contacts.length} contatos`);

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            const { phone, name } = contact;

            try {
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }

                const chatId = formatPhoneNumber(phone);
                
                let finalMessage = message;
                if (name) {
                    finalMessage = message.replace('@contactname', name);
                } else {
                    finalMessage = message.replace('@contactname', 'Cliente');
                }

                const numberExists = await client.isRegisteredUser(chatId);
                if (!numberExists) {
                    results.push({
                        phone: phone,
                        name: name || null,
                        success: false,
                        error: 'Número não encontrado no WhatsApp'
                    });
                    errorCount++;
                    continue;
                }

                await client.sendMessage(chatId, finalMessage);
                
                results.push({
                    phone: phone,
                    name: name || null,
                    success: true,
                    message: finalMessage
                });
                
                successCount++;
                log(`[${i+1}/${contacts.length}] Enviado para: ${phone} (${name || 'Sem nome'})`);

            } catch (error) {
                results.push({
                    phone: phone,
                    name: name || null,
                    success: false,
                    error: error.message
                });
                errorCount++;
                log(`Erro ao enviar para ${phone}: ${error.message}`);
            }
        }

        log(`Envio em massa concluído. Sucessos: ${successCount}, Erros: ${errorCount}`);

        res.json({
            success: true,
            summary: {
                total: contacts.length,
                success: successCount,
                errors: errorCount
            },
            results: results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        log(`Erro no envio em massa: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Enviar imagem
app.post('/send-image', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(503).json({ error: 'WhatsApp não conectado' });
        }

        const { phone, imagePath, caption, contactName } = req.body;

        if (!phone || !imagePath) {
            return res.status(400).json({ 
                error: 'phone e imagePath são obrigatórios' 
            });
        }

        const chatId = formatPhoneNumber(phone);
        
        const numberExists = await client.isRegisteredUser(chatId);
        if (!numberExists) {
            return res.status(404).json({ 
                error: 'Número não encontrado no WhatsApp',
                phone: phone 
            });
        }

        const media = MessageMedia.fromFilePath(imagePath);
        
        let finalCaption = caption || '';
        if (contactName && finalCaption) {
            finalCaption = finalCaption.replace('@contactname', contactName);
        }

        await client.sendMessage(chatId, media, { caption: finalCaption });
        
        log(`Imagem enviada para: ${phone} (${contactName || 'Sem nome'})`);
        
        res.json({
            success: true,
            phone: phone,
            contactName: contactName || null,
            imagePath: imagePath,
            caption: finalCaption,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        log(`Erro ao enviar imagem para ${req.body.phone}: ${error.message}`);
        res.status(500).json({ 
            error: error.message,
            phone: req.body.phone 
        });
    }
});

// Enviar vídeo
app.post('/send-video', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(503).json({ error: 'WhatsApp não conectado' });
        }

        const { phone, videoPath, caption, contactName } = req.body;

        if (!phone || !videoPath) {
            return res.status(400).json({ 
                error: 'phone e videoPath são obrigatórios' 
            });
        }

        const chatId = formatPhoneNumber(phone);
        
        const numberExists = await client.isRegisteredUser(chatId);
        if (!numberExists) {
            return res.status(404).json({ 
                error: 'Número não encontrado no WhatsApp',
                phone: phone 
            });
        }

        const media = MessageMedia.fromFilePath(videoPath);
        
        let finalCaption = caption || '';
        if (contactName && finalCaption) {
            finalCaption = finalCaption.replace('@contactname', contactName);
        }

        await client.sendMessage(chatId, media, { caption: finalCaption });
        
        log(`Vídeo enviado para: ${phone} (${contactName || 'Sem nome'})`);
        
        res.json({
            success: true,
            phone: phone,
            contactName: contactName || null,
            videoPath: videoPath,
            caption: finalCaption,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        log(`Erro ao enviar vídeo para ${req.body.phone}: ${error.message}`);
        res.status(500).json({ 
            error: error.message,
            phone: req.body.phone 
        });
    }
});

// Enviar documento
app.post('/send-document', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(503).json({ error: 'WhatsApp não conectado' });
        }

        const { phone, filePath, fileName, contactName } = req.body;

        if (!phone || !filePath) {
            return res.status(400).json({ 
                error: 'phone e filePath são obrigatórios' 
            });
        }

        const chatId = formatPhoneNumber(phone);
        
        const numberExists = await client.isRegisteredUser(chatId);
        if (!numberExists) {
            return res.status(404).json({ 
                error: 'Número não encontrado no WhatsApp',
                phone: phone 
            });
        }

        const media = MessageMedia.fromFilePath(filePath);
        
        if (fileName) {
            media.filename = fileName;
        }

        await client.sendMessage(chatId, media);
        
        log(`Documento enviado para: ${phone} (${contactName || 'Sem nome'})`);
        
        res.json({
            success: true,
            phone: phone,
            contactName: contactName || null,
            filePath: filePath,
            fileName: fileName || null,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        log(`Erro ao enviar documento para ${req.body.phone}: ${error.message}`);
        res.status(500).json({ 
            error: error.message,
            phone: req.body.phone 
        });
    }
});

// Página de status
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>WhatsApp API Base</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 10px; }
            .status { padding: 15px; border-radius: 5px; margin: 10px 0; }
            .connected { background: #d4edda; color: #155724; }
            .disconnected { background: #f8d7da; color: #721c24; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>WhatsApp API Base</h1>
            <div class="status ${isReady ? 'connected' : 'disconnected'}">
                <strong>Status:</strong> ${isReady ? 'Conectado' : 'Desconectado'}
            </div>
            <h2>Endpoints:</h2>
            <ul>
                <li>GET /status - Status da conexão</li>
                <li>GET /groups - Listar grupos</li>
                <li>POST /send-group - Enviar mensagem para grupo</li>
                <li>POST /send-contact - Enviar mensagem para contato</li>
                <li>POST /send-bulk - Envio em massa</li>
                <li>POST /send-image - Enviar imagem</li>
                <li>POST /send-video - Enviar vídeo</li>
                <li>POST /send-document - Enviar documento</li>
            </ul>
        </div>
    </body>
    </html>`;
    
    res.send(html);
});

// Inicializar
log('Iniciando WhatsApp API Base...');
client.initialize();

app.listen(PORT, () => {
    log(`Servidor rodando em http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    log('Encerrando WhatsApp API Base...');
    client.destroy();
    process.exit(0);
});