# Endpoint para Envio de Mensagens para Agentes

## Descrição
O endpoint `/messages/send-to-agent` permite enviar mensagens para agentes através de threads, criando automaticamente contatos e threads conforme necessário.

## URL
```
POST /messages/send-to-agent
```

## Autenticação
Requer token de autenticação via header `Authorization: Bearer <token>`

## Parâmetros do Body

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `content` | string | Sim | Conteúdo da mensagem (1-10000 caracteres) |
| `email` | string | Condicional | Email do contato (obrigatório se origin ≠ 'whatsapp') |
| `phone` | string | Condicional | Telefone do contato (obrigatório se origin = 'whatsapp') |
| `origin` | string | Sim | Origem da mensagem: 'whatsapp', 'instagram', 'website', 'tiktok', 'messenger' |
| `agentId` | string | Sim | ID do agente que receberá a mensagem |

## Validações

### Origem vs Campos Obrigatórios
- **WhatsApp**: Campo `phone` é obrigatório
- **Outras origens**: Campo `email` é obrigatório

### Lógica de Funcionamento
1. **Validação**: Verifica se todos os campos estão corretos
2. **Agente**: Verifica se o agente existe
3. **Contato**: Busca contato existente por email/phone, ou cria novo se não existir
4. **Thread**: Busca thread criada nas últimas 24h para o mesmo contato/agente/origem, ou cria nova
5. **Mensagens**: Cria mensagem do usuário e resposta automática do assistente

## Exemplos de Uso

### WhatsApp
```json
POST /messages/send-to-agent
{
  "content": "Olá, gostaria de saber mais sobre seus produtos",
  "phone": "+5511999999999",
  "origin": "whatsapp",
  "agentId": "507f1f77bcf86cd799439011"
}
```

### Website
```json
POST /messages/send-to-agent
{
  "content": "Preciso de ajuda com meu pedido",
  "email": "cliente@exemplo.com",
  "origin": "website",
  "agentId": "507f1f77bcf86cd799439011"
}
```

## Resposta de Sucesso (201)
```json
{
  "success": true,
  "message": "Message sent to agent successfully",
  "data": {
    "userMessage": {
      "id": "507f1f77bcf86cd799439012",
      "threadId": "507f1f77bcf86cd799439013",
      "role": "user",
      "content": "Olá, gostaria de saber mais sobre seus produtos",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "assistantMessage": {
      "id": "507f1f77bcf86cd799439014",
      "threadId": "507f1f77bcf86cd799439013",
      "role": "assistant",
      "content": "Olá! Recebi sua mensagem e em breve nossa equipe entrará em contato com você.",
      "createdAt": "2024-01-15T10:30:01.000Z"
    },
    "thread": {
      "id": "507f1f77bcf86cd799439013",
      "name": "whatsapp - +5511999999999 - 2024-01-15",
      "origin": "whatsapp",
      "isNew": true
    },
    "contact": {
      "id": "507f1f77bcf86cd799439015",
      "email": null,
      "phone": "+5511999999999"
    }
  }
}
```

## Erros Possíveis

### Validação (400)
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "phone",
      "message": "Phone is required for WhatsApp origin, email is required for other origins"
    }
  ]
}
```

### Agente Não Encontrado (404)
```json
{
  "success": false,
  "message": "Agent not found"
}
```

### Erro Interno (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
``` 