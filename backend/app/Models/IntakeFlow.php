<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['client_user_id', 'service_type', 'wellness_package_id', 'current_step', 'status', 'risk_level', 'submitted_at', 'completed_at'])]
class IntakeFlow extends Model
{
    use SoftDeletes;
    public function client()
    {
        return $this->belongsTo(User::class, 'client_user_id');
    }

    public function answers()
    {
        return $this->hasMany(IntakeAnswer::class);
    }

    public function package()
    {
        return $this->belongsTo(WellnessPackage::class, 'wellness_package_id');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }
}
