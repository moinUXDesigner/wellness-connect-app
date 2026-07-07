<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['client_id', 'primary_practitioner_id', 'created_by', 'title', 'description', 'primary_goal', 'status', 'start_date', 'end_date', 'review_frequency', 'risk_level'])]
class CbtCarePlan extends Model
{
    use SoftDeletes;
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function practitioner(): BelongsTo
    {
        return $this->belongsTo(Practitioner::class, 'primary_practitioner_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function goals(): HasMany
    {
        return $this->hasMany(CbtPlanGoal::class, 'care_plan_id');
    }

    public function exercises(): HasMany
    {
        return $this->hasMany(CbtPlanExercise::class, 'care_plan_id');
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(CbtProgressSnapshot::class, 'care_plan_id');
    }
}
