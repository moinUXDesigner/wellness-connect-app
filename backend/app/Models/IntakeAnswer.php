<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['intake_flow_id', 'section_key', 'question_key', 'answer_type', 'answer_json'])]
class IntakeAnswer extends Model
{
    use SoftDeletes;
    protected function casts(): array
    {
        return [
            'answer_json' => 'array',
        ];
    }

    public function intakeFlow()
    {
        return $this->belongsTo(IntakeFlow::class);
    }
}
