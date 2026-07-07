<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['client_id', 'care_plan_id', 'exercise_response_id', 'risk_type', 'risk_level', 'trigger_text', 'action_taken', 'alerted_practitioner_id', 'status'])]
class CbtRiskEvent extends Model
{
    use SoftDeletes;
    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function carePlan(): BelongsTo
    {
        return $this->belongsTo(CbtCarePlan::class, 'care_plan_id');
    }

    public function response(): BelongsTo
    {
        return $this->belongsTo(CbtExerciseResponse::class, 'exercise_response_id');
    }

    public function alertedPractitioner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'alerted_practitioner_id');
    }
}
