<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['session_note_id', 'active_step_key', 'completion_percent', 'session_rating', 'client_feedback', 'clinician_summary', 'client_summary', 'private_summary', 'next_agenda'])]
class CounsellorSessionFlow extends Model
{
    use SoftDeletes;
    public function sessionNote(): BelongsTo
    {
        return $this->belongsTo(CounsellorSessionNote::class, 'session_note_id');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(CounsellorSessionFlowStep::class, 'session_flow_id')->orderBy('sort_order');
    }
}
