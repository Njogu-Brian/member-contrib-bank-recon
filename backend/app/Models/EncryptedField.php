<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EncryptedField extends Model
{
    use HasFactory;

    protected $fillable = [
        'encryptable_type',
        'encryptable_id',
        'field',
        'ciphertext',
    ];
}

