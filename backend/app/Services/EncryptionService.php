<?php

namespace App\Services;

use App\Models\EncryptedField;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;

class EncryptionService
{
    public function encrypt(object $model, string $field, string $value): void
    {
        EncryptedField::updateOrCreate(
            [
                'encryptable_type' => get_class($model),
                'encryptable_id' => $model->getKey(),
                'field' => $field,
            ],
            [
                'ciphertext' => Crypt::encryptString($value),
            ]
        );
    }

    public function decrypt(object $model, string $field): ?string
    {
        $record = EncryptedField::where([
            'encryptable_type' => get_class($model),
            'encryptable_id' => $model->getKey(),
            'field' => $field,
        ])->first();

        if (! $record) {
            return null;
        }

        try {
            return Crypt::decryptString($record->ciphertext);
        } catch (DecryptException) {
            return null;
        }
    }
}

