import requests
import logging
import os
import sys
import time
import csv
from typing import Tuple, List, Dict, Optional

class WhatsAppBase:
    """
    Cliente base para envio de WhatsApp via API
    Suporta texto, imagens, vídeos e documentos
    """
    
    def __init__(self, api_url: str = "http://localhost:3000"):
        self.api_url = api_url.rstrip('/')
        self.timeout = 30
        self.user = os.environ.get('USERNAME', 'unknown')
        
    def log(self, message: str):
        """Log com identificação do usuário"""
        print(f"[{self.user}] {message}")
        
    def verificar_conexao(self) -> bool:
        """Verifica se a API está conectada"""
        try:
            response = requests.get(f"{self.api_url}/status", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return data.get('connected', False)
            return False
        except Exception as e:
            self.log(f"Erro ao verificar conexão: {e}")
            return False
    
    def listar_grupos(self) -> list:
        """Lista todos os grupos disponíveis"""
        try:
            response = requests.get(f"{self.api_url}/groups", timeout=self.timeout)
            if response.status_code == 200:
                data = response.json()
                return data.get('groups', [])
            return []
        except Exception as e:
            self.log(f"Erro ao listar grupos: {e}")
            return []
    
    def enviar_grupo(self, mensagem: str, grupo: str = "Meu Grupo de Teste") -> Tuple[bool, str]:
        """Envia mensagem para um grupo"""
        try:
            if not self.verificar_conexao():
                return False, "API WhatsApp não está conectada"
            
            mensagem_completa = f"{mensagem}\n\nEnviado por: {self.user}"
            
            payload = {
                "groupName": grupo,
                "message": mensagem_completa
            }
            
            response = requests.post(
                f"{self.api_url}/send-group",
                json=payload,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                grupo_nome = data.get('groupName', grupo)
                return True, f"Enviado para {grupo_nome}"
            elif response.status_code == 404:
                return False, f"Grupo '{grupo}' não encontrado"
            elif response.status_code == 503:
                return False, "WhatsApp não conectado"
            else:
                error_msg = response.json().get('error', f'HTTP {response.status_code}')
                return False, error_msg
                
        except requests.exceptions.RequestException as e:
            return False, f"Erro de conexão: {str(e)}"
        except Exception as e:
            return False, f"Erro: {str(e)}"
    
    def enviar_contato(self, mensagem: str, telefone: str, nome_contato: str = None) -> Tuple[bool, str]:
        """Envia mensagem para um contato individual"""
        try:
            if not self.verificar_conexao():
                return False, "API WhatsApp não está conectada"
            
            payload = {
                "phone": telefone,
                "message": mensagem,
                "contactName": nome_contato
            }
            
            response = requests.post(
                f"{self.api_url}/send-contact",
                json=payload,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                return True, f"Enviado para {telefone} ({nome_contato or 'Sem nome'})"
            elif response.status_code == 404:
                return False, f"Número {telefone} não encontrado no WhatsApp"
            elif response.status_code == 503:
                return False, "WhatsApp não conectado"
            else:
                error_msg = response.json().get('error', f'HTTP {response.status_code}')
                return False, f"{error_msg} - {telefone}"
                
        except requests.exceptions.RequestException as e:
            return False, f"Erro de conexão: {str(e)}"
        except Exception as e:
            return False, f"Erro: {str(e)}"
    
    def enviar_massa(self, mensagem: str, contatos: List[Dict], delay_segundos: int = 2) -> Dict:
        """
        Envia mensagem em massa para múltiplos contatos
        """
        try:
            if not self.verificar_conexao():
                return {
                    'sucesso': False,
                    'erro': "API WhatsApp não está conectada"
                }
            
            contatos_formatados = []
            for contato in contatos:
                if isinstance(contato, dict):
                    contatos_formatados.append({
                        "phone": contato.get('telefone', contato.get('phone', '')),
                        "name": contato.get('nome', contato.get('name', ''))
                    })
            
            payload = {
                "contacts": contatos_formatados,
                "message": mensagem,
                "delayMs": delay_segundos * 1000
            }
            
            self.log(f"Iniciando envio em massa para {len(contatos_formatados)} contatos...")
            
            response = requests.post(
                f"{self.api_url}/send-bulk",
                json=payload,
                timeout=self.timeout * 10
            )
            
            if response.status_code == 200:
                data = response.json()
                summary = data.get('summary', {})
                
                self.log(f"Envio concluído - Total: {summary.get('total', 0)}, "
                        f"Sucessos: {summary.get('success', 0)}, "
                        f"Erros: {summary.get('errors', 0)}")
                
                return {
                    'sucesso': True,
                    'resumo': summary,
                    'resultados': data.get('results', []),
                    'detalhes': f"Enviados: {summary.get('success', 0)}/{summary.get('total', 0)}"
                }
            else:
                error_msg = response.json().get('error', f'HTTP {response.status_code}')
                return {'sucesso': False, 'erro': error_msg}
                
        except Exception as e:
            return {'sucesso': False, 'erro': f"Erro: {str(e)}"}


def enviar_whatsapp(mensagem: str, grupo: str = "Meu Grupo de Teste") -> bool:
    """Função de conveniência para envio em grupo"""
    client = WhatsAppBase()
    sucesso, detalhes = client.enviar_grupo(mensagem, grupo)
    
    if not sucesso:
        print(f"Erro WhatsApp: {detalhes}")
    
    return sucesso


if __name__ == "__main__":
    import datetime
    
    client = WhatsAppBase()
    client.log("Testando API...")
    
    conectado = client.verificar_conexao()
    client.log(f"API conectada: {conectado}")
    
    if conectado:
        grupos = client.listar_grupos()
        client.log(f"Encontrados {len(grupos)} grupos")