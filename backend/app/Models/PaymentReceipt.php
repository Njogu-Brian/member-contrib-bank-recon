<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id',
        'file_name',
        'disk',
        'path',
        'qr_code_path',
    ];

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }
}

