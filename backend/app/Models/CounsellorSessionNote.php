<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['appointment_id', 'client_user_id', 'practitioner_id', 'workflow_state', 'subjective', 'objective', 'assessment', 'plan', 'next_action', 'started_at', 'completed_at', 'follow_up_requested_at', 'escalated_at'])]
class CounsellorSessionNote extends Model
{
    use SoftDeletes;
    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'follow_up_requested_at' => 'datetime',
            'escalated_at' => 'datetime',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_user_id');
    }

    public function practitioner(): BelongsTo
    {
        return $this->belongsTo(Practitioner::class);
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(CounsellorAssessmentResult::class, 'session_note_id');
    }

    public function flow(): HasOne
    {
        return $this->hasOne(CounsellorSessionFlow::class, 'session_note_id');
    }
}
