import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from whatsapp_base import WhatsAppBase

# CONFIGURAÇÃO: DEFINA SEUS CONTATOS AQUI
CONTATOS = [
    {'nome': 'João Silva', 'telefone': '11999999999'},
    {'nome': 'Maria Santos', 'telefone': '11988888888'},
    {'nome': 'Pedro Costa', 'telefone': '11977777777'},
]

# CONFIGURAÇÃO: MENSAGEM
MENSAGEM = """Prezado(a) @contactname!

Esta é uma mensagem de teste do sistema automatizado.

Atenciosamente,
Equipe de Desenvolvimento"""

# CONFIGURAÇÃO: DELAY ENTRE MENSAGENS (segundos)
DELAY = 3

def main():
    print("=" * 60)
    print("    ENVIO EM MASSA - EXECUÇÃO DIRETA")
    print("=" * 60)
    
    client = WhatsAppBase()
    
    print("1. Verificando conexão...")
    if not client.verificar_conexao():
        print("✗ ERRO: WhatsApp não conectado!")
        return False
    
    print("✓ WhatsApp conectado!")
    
    print(f"\n2. Configurações:")
    print(f"   • Total de contatos: {len(CONTATOS)}")
    print(f"   • Delay entre mensagens: {DELAY} segundos")
    
    print(f"\n3. Iniciando envio...")
    
    resultado = client.enviar_massa(
        mensagem=MENSAGEM,
        contatos=CONTATOS,
        delay_segundos=DELAY
    )
    
    if resultado['sucesso']:
        resumo = resultado['resumo']
        print(f"✓ CONCLUÍDO: {resumo['success']}/{resumo['total']} enviados")
        return True
    else:
        print(f"✗ ERRO: {resultado['erro']}")
        return False

if __name__ == "__main__":
    main()