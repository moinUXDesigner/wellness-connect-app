<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'phone', 'phone_verified_at', 'google_id', 'wellness_goal', 'consent_to_terms', 'status', 'avatar_url'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'password' => 'hashed',
            'consent_to_terms' => 'boolean',
        ];
    }

    public function clientProfile(): HasOne
    {
        return $this->hasOne(ClientProfile::class);
    }

    public function practitioner(): HasOne
    {
        return $this->hasOne(Practitioner::class);
    }

    public function trainerApplication(): HasOne
    {
        return $this->hasOne(TrainerApplication::class, 'applicant_user_id');
    }

    public function intakeFlows(): HasMany
    {
        return $this->hasMany(IntakeFlow::class, 'client_user_id');
    }

    public function clientAppointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'client_user_id');
    }

    public function membershipSubscriptions(): HasMany
    {
        return $this->hasMany(MembershipSubscription::class, 'client_user_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function supportRequests(): HasMany
    {
        return $this->hasMany(SupportRequest::class, 'requester_user_id');
    }

    public function workflowConfigRevisions(): HasMany
    {
        return $this->hasMany(WorkflowConfigRevision::class, 'actor_user_id');
    }

    public function activityEvents(): HasMany
    {
        return $this->hasMany(ActivityEvent::class, 'actor_user_id');
    }
}
