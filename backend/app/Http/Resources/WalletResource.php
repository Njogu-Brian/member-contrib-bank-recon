<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WalletResource extends JsonResource
{
    /**
     * @param Request $request
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'member_id' => $this->member_id,
            'balance' => $this->balance,
            'locked_balance' => $this->locked_balance,
            'member' => [
                'name' => $this->member?->name,
                'member_code' => $this->member?->member_code,
            ],
            'updated_at' => $this->updated_at,
        ];
    }
}

