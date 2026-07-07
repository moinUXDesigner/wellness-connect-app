<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['appointment_id', 'session_note_id', 'client_user_id', 'practitioner_id', 'assessment_type', 'answers_json', 'score', 'severity', 'administered_at'])]
class CounsellorAssessmentResult extends Model
{
    use SoftDeletes;
    protected function casts(): array
    {
        return [
            'answers_json' => 'array',
            'administered_at' => 'datetime',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function sessionNote(): BelongsTo
    {
        return $this->belongsTo(CounsellorSessionNote::class, 'session_note_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_user_id');
    }

    public function practitioner(): BelongsTo
    {
        return $this->belongsTo(Practitioner::class);
    }
}
