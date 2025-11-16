<?php

namespace App\Http\Controllers;

use App\Models\MeetingAttendanceUpload;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MeetingAttendanceUploadController extends Controller
{
    public function index(Request $request)
    {
        $uploads = MeetingAttendanceUpload::with('uploader:id,name,email')
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json($uploads);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'meeting_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:51200', // 50MB
        ]);

        $file = $request->file('file');
        $directory = now()->format('Y/m');
        $safeName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $filename = time() . '_' . ($safeName ?: 'attendance') . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs($directory, $filename, 'attendance');

        $upload = MeetingAttendanceUpload::create([
            'meeting_date' => $validated['meeting_date'] ?? now()->toDateString(),
            'original_filename' => $file->getClientOriginalName(),
            'stored_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json(
            $upload->load('uploader:id,name,email'),
            201
        );
    }

    public function show(MeetingAttendanceUpload $attendanceUpload)
    {
        return response()->json($attendanceUpload->load('uploader:id,name,email'));
    }

    public function download(MeetingAttendanceUpload $attendanceUpload)
    {
        if (!Storage::disk('attendance')->exists($attendanceUpload->stored_path)) {
            abort(404, 'File not found');
        }

        return response()->download(
            Storage::disk('attendance')->path($attendanceUpload->stored_path),
            $attendanceUpload->original_filename
        );
    }

    public function destroy(MeetingAttendanceUpload $attendanceUpload)
    {
        Storage::disk('attendance')->delete($attendanceUpload->stored_path);
        $attendanceUpload->delete();

        return response()->json(['message' => 'Upload deleted successfully']);
    }
}


