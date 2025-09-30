import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from whatsapp_base import WhatsAppBase

def main():
    print("=" * 60)
    print("  EXEMPLO BÁSICO - WhatsApp API Base")
    print("=" * 60)
    
    client = WhatsAppBase()
    
    print("\n1. Verificando conexão...")
    if not client.verificar_conexao():
        print("API não conectada. Execute: node whatsapp-api-base.js")
        return
    
    print("API conectada!")
    
    print("\n2. Listando grupos...")
    grupos = client.listar_grupos()
    
    if grupos:
        print(f"Encontrados {len(grupos)} grupos:")
        for i, grupo in enumerate(grupos[:5], 1):
            print(f"   {i}. {grupo['name']} ({grupo['participantsCount']} membros)")
    
    print("\n3. Enviando mensagem de teste...")
    mensagem = "Teste de API WhatsApp - Sistema funcionando!"
    
    sucesso, detalhes = client.enviar_grupo(
        mensagem=mensagem,
        grupo="Meu Grupo de Teste"
    )
    
    if sucesso:
        print(f"Sucesso: {detalhes}")
    else:
        print(f"Erro: {detalhes}")

if __name__ == "__main__":
    main()
