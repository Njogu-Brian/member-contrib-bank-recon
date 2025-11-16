# Matching Service

Node.js microservice for AI-powered transaction matching.

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## Endpoints

### GET /health
Health check endpoint.

### POST /match-batch
Batch match transactions to members.

**Request:**
```json
{
  "transactions": [
    {
      "id": 1,
      "particulars": "Pay Bill from 25472****176 - JOYCE NJAGI Acc. Joyce Njagi",
      "transaction_code": "TJVMV8W9FC"
    }
  ],
  "members": [
    {
      "id": 1,
      "name": "Joyce Njagi",
      "phone": "254712345678"
    }
  ]
}
```

**Response:**
```json
[
  {
    "transaction_id": 1,
    "matches": [
      {
        "member_id": 1,
        "member_name": "Joyce Njagi",
        "confidence": 0.98,
        "reason": "Phone number match"
      }
    ]
  }
]
```

