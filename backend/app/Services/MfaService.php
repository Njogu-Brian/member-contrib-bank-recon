<?php

namespace App\Services;

use App\Models\MfaSecret;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use OTPHP\TOTP;

class MfaService
{
    public function enable(User $user, string $code): MfaSecret
    {
        $secret = $this->createSecretForUser($user);

        $totp = TOTP::create($secret->secret);
        if (! $totp->verify($code)) {
            throw ValidationException::withMessages(['code' => 'Invalid OTP']);
        }

        $secret->update([
            'enabled' => true,
            'enabled_at' => now(),
        ]);

        return $secret;
    }

    public function disable(User $user): void
    {
        $user->mfaSecret()?->delete();
    }

    protected function createSecretForUser(User $user): MfaSecret
    {
        $secret = $user->mfaSecret;
        if ($secret) {
            return $secret;
        }

        $totp = TOTP::create();

        return MfaSecret::create([
            'user_id' => $user->id,
            'secret' => $totp->getSecret(),
        ]);
    }
}

