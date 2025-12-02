<?php

namespace App\Services;

use App\Models\MfaSecret;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use OTPHP\TOTP;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel\ErrorCorrectionLevelMedium;
use Endroid\QrCode\RoundBlockSizeMode\RoundBlockSizeModeMargin;
use Endroid\QrCode\Writer\PngWriter;

class MfaService
{
    /**
     * Get or create MFA secret for user (for setup)
     */
    public function getSecret(User $user): MfaSecret
    {
        return $this->createSecretForUser($user);
    }

    /**
     * Get MFA setup data (secret and QR code)
     */
    public function getSetup(User $user): array
    {
        $secret = $this->createSecretForUser($user);
        $qrCode = $this->getQrCode($user);

        return [
            'secret' => $secret->secret,
            'qr_code' => $qrCode,
            'enabled' => $secret->enabled,
        ];
    }

    /**
     * Generate QR code for Google Authenticator
     */
    public function getQrCode(User $user): string
    {
        $secret = $this->createSecretForUser($user);
        $appName = Setting::get('app_name', config('app.name', 'Evimeria'));
        
        $totp = TOTP::create($secret->secret);
        $totp->setLabel($user->email);
        $totp->setIssuer($appName);
        
        $uri = $totp->getProvisioningUri();
        
        // Generate QR code
        $result = Builder::create()
            ->writer(new PngWriter())
            ->data($uri)
            ->encoding(new Encoding('UTF-8'))
            ->errorCorrectionLevel(new ErrorCorrectionLevelMedium())
            ->size(300)
            ->margin(10)
            ->roundBlockSizeMode(new RoundBlockSizeModeMargin())
            ->build();
        
        return base64_encode($result->getString());
    }

    /**
     * Enable MFA after verification
     */
    public function enable(User $user, string $code): MfaSecret
    {
        $secret = $this->createSecretForUser($user);

        if (!$this->verify($user, $code)) {
            throw ValidationException::withMessages(['code' => 'Invalid OTP code']);
        }

        $secret->update([
            'enabled' => true,
            'enabled_at' => now(),
        ]);

        return $secret;
    }

    /**
     * Verify MFA code
     */
    public function verify(User $user, string $code): bool
    {
        $secret = $user->mfaSecret;
        if (!$secret || !$secret->secret) {
            return false;
        }

        $totp = TOTP::create($secret->secret);
        return $totp->verify($code);
    }

    /**
     * Disable MFA for user
     */
    public function disable(User $user): void
    {
        $user->mfaSecret()?->delete();
    }

    /**
     * Check if MFA is enabled for user
     */
    public function isEnabled(User $user): bool
    {
        $secret = $user->mfaSecret;
        return $secret && $secret->enabled;
    }

    protected function createSecretForUser(User $user): MfaSecret
    {
        $secret = $user->mfaSecret;
        if ($secret && $secret->secret) {
            return $secret;
        }

        $totp = TOTP::create();

        return MfaSecret::updateOrCreate(
            ['user_id' => $user->id],
            ['secret' => $totp->getSecret(), 'enabled' => false]
        );
    }
}

