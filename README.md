![GitHub release](https://img.shields.io/github/v/release/engdalevedove/whatsapp-api-base)
![License](https://img.shields.io/github/license/engdalevedove/whatsapp-api-base)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Python](https://img.shields.io/badge/python-%3E%3D3.8-blue)


# WhatsApp API Base - Sistema de Envio Automatizado

## Sobre o Projeto

API robusta para automação de envios via WhatsApp Web, desenvolvida para ambiente corporativo. Permite envio de mensagens de texto, imagens, vídeos e documentos tanto para contatos individuais quanto grupos, incluindo funcionalidade de envio em massa.

### Principais Funcionalidades

- **Envio de Mensagens de Texto** - Para grupos e contatos individuais
- **Envio de Mídias** - Imagens, vídeos e documentos
- **Envio em Massa** - Com delay configurável entre mensagens
- **Personalização de Mensagens** - Substituição automática de nomes
- **API REST Completa** - Endpoints para todas as funcionalidades
- **Biblioteca Python** - Cliente para integração fácil
- **Serviço Permanente** - Configuração como serviço Windows com PM2
- **Logs Detalhados** - Rastreamento completo de envios
- **Interface Web** - Painel de status e monitoramento

## Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **whatsapp-web.js** - Biblioteca para WhatsApp Web
- **Python** - Cliente e scripts de automação
- **PM2** - Gerenciamento de processos
- **QRCode Terminal** - Autenticação visual

## Estrutura do Projeto
WhatsApp-API-Base/
├── whatsapp-api-base.js      # API principal Node.js
├── whatsapp_base.py          # Cliente Python
├── envio_massa.py            # Script de envio em massa
├── envio_csv_direto.py       # Script para CSV
├── start-api-shared.bat      # Script de inicialização
├── package.json              # Dependências Node.js
├── DOCUMENTATION.md          # Documentação completa
└── docs/                     # Documentação adicional

## Instalação Rápida

### Pré-requisitos
- Node.js v18+ 
- Python 3.8+
- PM2 (para serviço permanente)

### 1. Clone o repositório
```bash
git clone https://github.com/engdalevedove/whatsapp-api-base.git
cd whatsapp-api-base