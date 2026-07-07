<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'token_hash',
    'email',
    'mobile',
    'stage',
    'registration_payload',
    'otp_hash',
    'email_otp_hash',
    'provider',
    'google_sub',
    'status',
    'attempts',
    'email_otp_attempts',
    'expires_at',
    'resend_available_at',
    'email_otp_expires_at',
    'email_otp_resend_available_at',
    'verified_at',
    'mobile_verified_at',
])]
class TrainerRegistrationChallenge extends Model
{
    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'email_otp_attempts' => 'integer',
            'expires_at' => 'datetime',
            'resend_available_at' => 'datetime',
            'email_otp_expires_at' => 'datetime',
            'email_otp_resend_available_at' => 'datetime',
            'verified_at' => 'datetime',
            'mobile_verified_at' => 'datetime',
        ];
    }
}
