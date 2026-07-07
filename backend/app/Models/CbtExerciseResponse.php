<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['exercise_instance_id', 'client_id', 'response_json', 'score_json', 'emotion_before', 'emotion_after', 'client_reflection', 'submitted_at'])]
class CbtExerciseResponse extends Model
{
    use SoftDeletes;
    protected function casts(): array
    {
        return [
            'response_json' => 'array',
            'score_json' => 'array',
            'submitted_at' => 'datetime',
        ];
    }

    public function instance(): BelongsTo
    {
        return $this->belongsTo(CbtExerciseInstance::class, 'exercise_instance_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function review(): HasOne
    {
        return $this->hasOne(CbtPractitionerReview::class, 'exercise_response_id');
    }

    public function riskEvents(): HasMany
    {
        return $this->hasMany(CbtRiskEvent::class, 'exercise_response_id');
    }
}
