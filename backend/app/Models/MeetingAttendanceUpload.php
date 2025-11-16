<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MeetingAttendanceUpload extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_date',
        'original_filename',
        'stored_path',
        'mime_type',
        'file_size',
        'uploaded_by',
        'notes',
        'processed_at',
    ];

    protected $casts = [
        'meeting_date' => 'date',
        'processed_at' => 'datetime',
    ];

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}


