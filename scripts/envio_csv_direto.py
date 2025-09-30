cat > envio_csv_direto.py << 'EOF'
import sys
import csv
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from whatsapp_base import WhatsAppBase

# CONFIGURAÇÃO: ARQUIVO CSV
ARQUIVO_CSV = "contatos.csv"

# CONFIGURAÇÃO: MENSAGEM
MENSAGEM = """Prezado(a) @contactname!

Esta é uma mensagem de teste do sistema automatizado.

Atenciosamente,
Equipe de Desenvolvimento"""

def carregar_csv(arquivo):
    """Carrega contatos do CSV"""
    contatos = []
    
    try:
        with open(arquivo, 'r', encoding='utf-8') as file:
            sample = file.read(1024)
            file.seek(0)
            delimiter = ';' if ';' in sample else ','
            
            reader = csv.DictReader(file, delimiter=delimiter)
            
            for row in reader:
                nome = (row.get('nome') or row.get('name') or 
                       row.get('Nome') or row.get('NOME') or '').strip()
                
                telefone = (row.get('telefone') or row.get('phone') or 
                           row.get('Telefone') or row.get('TELEFONE') or
                           row.get('whatsapp') or row.get('celular') or '').strip()
                
                if telefone:
                    contatos.append({
                        'nome': nome or 'Cliente',
                        'telefone': telefone
                    })
        
        return contatos
        
    except Exception as e:
        print(f"Erro ao carregar CSV: {e}")
        return []

def main():
    print("=" * 60)
    print("    ENVIO EM MASSA - CARREGAMENTO CSV")
    print("=" * 60)
    
    if not os.path.exists(ARQUIVO_CSV):
        print(f"Erro: Arquivo não encontrado: {ARQUIVO_CSV}")
        print("Crie o arquivo CSV com colunas: nome,telefone")
        return False
    
    print(f"1. Carregando contatos de: {ARQUIVO_CSV}")
    contatos = carregar_csv(ARQUIVO_CSV)
    
    if not contatos:
        print("Erro: Nenhum contato válido encontrado no CSV")
        return False
    
    print(f"Carregados {len(contatos)} contatos")
    
    client = WhatsAppBase()
    
    print("2. Verificando conexão...")
    if not client.verificar_conexao():
        print("Erro: WhatsApp não conectado!")
        return False
    
    print("WhatsApp conectado!")
    
    print("3. Executando envio em massa...")
    
    resultado = client.enviar_massa(MENSAGEM, contatos, delay_segundos=3)
    
    if resultado['sucesso']:
        resumo = resultado['resumo']
        print(f"CONCLUÍDO: {resumo['success']}/{resumo['total']} enviados")
        return True
    else:
        print(f"ERRO: {resultado['erro']}")
        return False

if __name__ == "__main__":
    main()
EOF