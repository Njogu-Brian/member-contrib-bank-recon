<?php

namespace App\Services;

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class QrCodeService
{
    public function generate(string $data): string
    {
        $fileName = 'qr/' . Str::uuid() . '.png';

        $result = Builder::create()
            ->writer(new PngWriter())
            ->size(300)
            ->data($data)
            ->margin(10)
            ->build();

        Storage::disk('public')->put($fileName, $result->getString());

        return $fileName;
    }
}

