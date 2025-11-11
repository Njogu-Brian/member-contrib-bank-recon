# Matching Service

Node.js microservice for matching bank transactions to members using fuzzy matching and optional AI.

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

The service runs on port 3001 by default.

## API

### POST /match-batch

Match a batch of transactions to members.

**Request:**
```json
{
  "transactions": [
    {
      "client_tran_id": "t_01",
      "tran_date": "2025-04-04",
      "particulars": "MPS2547... JACINTA WAN 0716227320",
      "credit": 3000,
      "transaction_code": "TD41CC9GZ",
      "phones": ["0716227320"]
    }
  ],
  "members": [
    {
      "id": 10,
      "name": "Jacinta Wan",
      "phone": "0716227320",
      "member_code": "MPS2547"
    }
  ]
}
```

**Response:**
```json
[
  {
    "client_tran_id": "t_01",
    "tran_date": "2025-04-04",
    "particulars": "MPS2547... JACINTA WAN 0716227320",
    "credit": 3000,
    "transaction_code": "TD41CC9GZ",
    "phones": ["0716227320"],
    "candidate_member_id": 10,
    "confidence": 0.98,
    "match_tokens": ["0716227320"],
    "match_reason": "Exact phone match"
  }
]
```

## Matching Strategies

1. **Exact phone match** (confidence: 0.98)
2. **Transaction code match** (confidence: 0.90)
3. **Name fuzzy matching** (confidence: 0.5-0.85)
4. **Partial phone match** (confidence: 0.75)

## Cursor AI Integration

Set `CURSOR_API_KEY` environment variable to enable AI matching (placeholder implementation).

