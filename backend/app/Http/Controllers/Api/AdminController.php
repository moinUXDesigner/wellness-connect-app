<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AdminPasswordResetMail;
use App\Models\Appointment;
use App\Models\Notification;
use App\Models\RoleChangeAudit;
use App\Models\TrainerApplication;
use App\Models\User;
use App\Models\WellnessPackage;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLogs)
    {
    }

    public function overview(Request $request): JsonResponse
    {
        $usersCount = User::count();
        $activeUsersCount = User::where('status', 'active')->count();
        $appointmentsCount = Appointment::count();
        $highPriorityEscalationsCount = Notification::where('type', 'escalation')
            ->whereIn('status', ['queued', 'failed'])
            ->count();

        $roleDistribution = User::select('role', DB::raw('COUNT(*) as users'))
            ->groupBy('role')
            ->orderBy('role')
            ->get()
            ->map(function ($row) {
                $count = (int) $row->users;
                return [
                    'role' => (string) $row->role,
                    'users' => $count,
                    'status' => $count > 0 ? 'healthy' : 'attention',
                ];
            })->values();

        $recentEscalations = Notification::query()
            ->where('type', 'escalation')
            ->latest()
            ->limit(10)
            ->get()
            ->map(function (Notification $notification) {
                $payload = is_array($notification->payload_json) ? $notification->payload_json : [];
                $priority = (string) ($payload['priority'] ?? 'medium');
                return [
                    'id' => 'ESC-' . $notification->id,
                    'title' => (string) ($payload['title'] ?? 'Escalation notification'),
                    'priority' => in_array($priority, ['low', 'medium', 'high'], true) ? $priority : 'medium',
                    'status' => (string) $notification->status,
                ];
            })->values();

        $usageMetrics = [
            [
                'label' => 'Total Users',
                'value' => (string) $usersCount,
                'delta' => 'Live',
            ],
            [
                'label' => 'Active Users',
                'value' => (string) $activeUsersCount,
                'delta' => 'Current status',
            ],
            [
                'label' => 'Appointments',
                'value' => (string) $appointmentsCount,
                'delta' => 'Total booked',
            ],
            [
                'label' => 'Open Escalations',
                'value' => (string) $highPriorityEscalationsCount,
                'delta' => 'Needs action',
            ],
        ];

        $analytics = [
            [
                'label' => 'Users',
                'value' => (string) $usersCount,
                'delta' => 'Total accounts',
            ],
            [
                'label' => 'Appointments',
                'value' => (string) $appointmentsCount,
                'delta' => 'All time',
            ],
            [
                'label' => 'Escalations',
                'value' => (string) $highPriorityEscalationsCount,
                'delta' => 'Open',
            ],
            [
                'label' => 'Programs',
                'value' => (string) WellnessPackage::count(),
                'delta' => 'Package catalog',
            ],
        ];

        return response()->json([
            'analytics' => $analytics,
            'usage_metrics' => $usageMetrics,
            'role_distribution' => $roleDistribution,
            'recent_escalations' => $recentEscalations,
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $users = User::query()
            ->select('id', 'name', 'email', 'phone', 'role', 'status', 'avatar_url', 'created_at')
            ->selectSub(
                DB::table('personal_access_tokens')
                    ->selectRaw('MAX(last_used_at)')
                    ->whereColumn('tokenable_id', 'users.id')
                    ->where('tokenable_type', User::class),
                'last_active_at'
            )
            ->latest()
            ->get()
            ->map(fn (User $user) => [
                'id' => (string) $user->id,
                'name' => (string) $user->name,
                'email' => (string) $user->email,
                'phone' => $user->phone ? (string) $user->phone : null,
                'avatarUrl' => $user->avatar_url ? (string) $user->avatar_url : null,
                'avatar_url' => $user->avatar_url ? (string) $user->avatar_url : null,
                'role' => (string) $user->role,
                'status' => (string) ($user->status ?? 'active'),
                'joinedAt' => optional($user->created_at)->format('Y-m-d') ?? '',
                'lastActiveAt' => $user->last_active_at ? Carbon::parse((string) $user->last_active_at)->toIso8601String() : null,
            ])->values();

        return response()->json([
            'users' => $users,
        ]);
    }

    public function resetUserPassword(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $temporaryPassword = Str::password(12);

        $user->forceFill([
            'password' => $temporaryPassword,
            'remember_token' => Str::random(60),
        ])->save();

        $user->tokens()->delete();

        Mail::to($user->email)->send(new AdminPasswordResetMail($temporaryPassword, $user->name));

        $this->activityLogs->record('auth', 'password_reset_forced', sprintf('%s reset the password for %s.', $request->user()->name, $user->name), [
            'actor' => $request->user(),
            'targetUser' => $user,
            'subject' => $user,
            'details' => ['reason' => 'Admin initiated password reset and revoked active sessions.'],
            'audienceUsers' => [$user],
        ]);

        return response()->json([
            'message' => "Password reset. {$user->email} has been notified by email.",
            'user' => [
                'id' => (string) $user->id,
                'email' => (string) $user->email,
            ],
        ]);
    }

    public function destroyUser(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $actor = $request->user();
        abort_if($actor?->id === $user->id, 422, 'You cannot delete your own administrator account.');

        if ($user->role === 'admin' && $user->status === 'active') {
            $activeAdminCount = User::query()
                ->where('role', 'admin')
                ->where('status', 'active')
                ->count();

            abort_if($activeAdminCount <= 1, 422, 'The last active administrator cannot be deleted.');
        }

        $deletedUser = [
            'id' => (string) $user->id,
            'name' => (string) $user->name,
            'email' => (string) $user->email,
            'role' => (string) $user->role,
        ];

        DB::transaction(function () use ($user): void {
            $user->tokens()->delete();
            // Anonymise PII — pseudonymise identifying fields and retain clinical records
            // for the legal retention period. SoftDeletes on clinical models handle
            // scheduled purges after the retention window, separately.
            $user->update([
                'name'              => 'Deleted User #' . $user->id,
                'email'             => 'deleted+' . $user->id . '@wellnessconnect.internal',
                'phone'             => null,
                'phone_verified_at' => null,
                'google_id'         => null,
                'avatar_url'        => null,
                'wellness_goal'     => null,
                'status'            => 'suspended',
            ]);
            if ($user->clientProfile) {
                $user->clientProfile->update([
                    'profile_photo_url'        => null,
                    'emergency_contact_name'   => null,
                    'emergency_contact_phone'  => null,
                ]);
            }
        });

        $this->activityLogs->record('account', 'user_deleted', sprintf('%s anonymised the account for %s.', $actor->name, $deletedUser['name']), [
            'actor' => $actor,
            'targetRole' => $deletedUser['role'],
            'subject' => ['type' => User::class, 'id' => $deletedUser['id'], 'label' => $deletedUser['name']],
            'details' => ['email' => $deletedUser['email'], 'role' => $deletedUser['role']],
            'audienceRoles' => ['admin'],
        ]);

        return response()->json([
            'message' => "Account for {$deletedUser['email']} has been anonymised.",
            'user' => $deletedUser,
        ]);
    }

    public function roleChanges(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $audits = RoleChangeAudit::query()
            ->with(['actor:id,name,email,avatar_url', 'target:id,name,email,avatar_url'])
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (RoleChangeAudit $audit) => $this->roleChangePayload($audit))
            ->values();

        return response()->json([
            'roleChanges' => $audits,
        ]);
    }

    public function updateUserRole(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'role' => ['required', 'string', 'in:client,trainer,helpdesk,admin,finance,legal,content'],
            'reason' => ['required', 'string', 'max:500'],
        ]);
        $newRole = (string) $validated['role'];
        $reason = trim((string) $validated['reason']);

        abort_if($reason === '', 422, 'A role change reason is required.');

        $audit = DB::transaction(function () use ($request, $user, $newRole, $reason): RoleChangeAudit {
            $target = User::query()->lockForUpdate()->findOrFail($user->id);
            $actor = $request->user();
            $previousRole = (string) $target->role;

            abort_unless($target->status === 'active', 422, 'Only active users can be assigned a role.');
            abort_if($previousRole === $newRole, 422, 'Select a different role before saving.');

            if ($newRole === 'trainer') {
                $approvedApplicationExists = TrainerApplication::query()
                    ->whereRaw('LOWER(applicant_email) = ?', [strtolower((string) $target->email)])
                    ->where('status', 'approved')
                    ->exists();

                abort_unless($approvedApplicationExists, 422, 'Trainer role requires an approved trainer application.');
            }

            if ($previousRole === 'admin' && $newRole !== 'admin') {
                $activeAdminCount = User::query()
                    ->where('role', 'admin')
                    ->where('status', 'active')
                    ->count();

                abort_if($activeAdminCount <= 1, 422, 'The last active administrator cannot be reassigned.');
            }

            $target->forceFill(['role' => $newRole])->save();
            $target->tokens()->delete();

            return RoleChangeAudit::query()->create([
                'actor_user_id' => $actor->id,
                'target_user_id' => $target->id,
                'previous_role' => $previousRole,
                'new_role' => $newRole,
                'reason' => $reason,
            ]);
        });

        $audit->load(['actor:id,name,email,avatar_url', 'target:id,name,email,avatar_url']);
        $updatedUser = User::query()->findOrFail($user->id);

        $this->activityLogs->record('rbac', 'role_changed', sprintf('%s changed %s from %s to %s.', $request->user()->name, $updatedUser->name, $audit->previous_role, $audit->new_role), [
            'actor' => $request->user(),
            'targetUser' => $updatedUser,
            'subject' => $updatedUser,
            'details' => [
                'previousRole' => $audit->previous_role,
                'newRole' => $audit->new_role,
                'reason' => $audit->reason,
            ],
            'audienceRoles' => [$audit->previous_role, $audit->new_role],
            'audienceUsers' => [$updatedUser],
        ]);

        return response()->json([
            'message' => "Role updated for {$updatedUser->email}. Existing sessions have been signed out.",
            'user' => [
                'id' => (string) $updatedUser->id,
                'name' => (string) $updatedUser->name,
                'email' => (string) $updatedUser->email,
                'avatarUrl' => $updatedUser->avatar_url ? (string) $updatedUser->avatar_url : null,
                'avatar_url' => $updatedUser->avatar_url ? (string) $updatedUser->avatar_url : null,
                'role' => (string) $updatedUser->role,
                'status' => (string) $updatedUser->status,
                'joinedAt' => optional($updatedUser->created_at)->format('Y-m-d') ?? '',
            ],
            'roleChange' => $this->roleChangePayload($audit),
        ]);
    }

    public function programs(Request $request): JsonResponse
    {
        $programs = WellnessPackage::query()
            ->select('id', 'name', 'is_active', 'description')
            ->latest()
            ->get()
            ->map(fn (WellnessPackage $pkg) => [
                'id' => 'PRG-' . $pkg->id,
                'title' => (string) $pkg->name,
                'category' => 'lifestyle',
                'status' => $pkg->is_active ? 'published' : 'archived',
                'assignedCount' => 0,
            ])->values();

        return response()->json([
            'programs' => $programs,
        ]);
    }

    public function escalations(Request $request): JsonResponse
    {
        $tickets = Notification::query()
            ->where('type', 'escalation')
            ->latest()
            ->limit(30)
            ->get()
            ->map(function (Notification $notification) {
                $payload = is_array($notification->payload_json) ? $notification->payload_json : [];
                $priority = (string) ($payload['priority'] ?? 'medium');
                return [
                    'id' => 'ESC-' . $notification->id,
                    'title' => (string) ($payload['title'] ?? 'Escalation notification'),
                    'priority' => in_array($priority, ['low', 'medium', 'high'], true) ? $priority : 'medium',
                    'status' => (string) $notification->status,
                    'createdAt' => optional($notification->created_at)->toIso8601String(),
                ];
            })->values();

        return response()->json([
            'tickets' => $tickets,
        ]);
    }

    public function activities(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $activities = Appointment::query()
            ->with(['client:id,name', 'practitioner:id,user_id', 'practitioner.user:id,name'])
            ->latest()
            ->limit(40)
            ->get()
            ->map(function (Appointment $appointment) {
                return [
                    'id' => 'APT-' . $appointment->id,
                    'serviceType' => (string) $appointment->service_type,
                    'clientName' => (string) optional($appointment->client)->name,
                    'professionalName' => (string) optional(optional($appointment->practitioner)->user)->name,
                    'scheduleAt' => optional($appointment->starts_at)->toIso8601String(),
                    'status' => (string) $appointment->status,
                ];
            })->values();

        return response()->json([
            'activities' => $activities,
        ]);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403, 'Admin access required.');
    }

    private function roleChangePayload(RoleChangeAudit $audit): array
    {
        return [
            'id' => (string) $audit->id,
            'actorName' => (string) optional($audit->actor)->name,
            'actorEmail' => (string) optional($audit->actor)->email,
            'actorAvatarUrl' => optional($audit->actor)->avatar_url,
            'targetUserId' => (string) $audit->target_user_id,
            'targetName' => (string) optional($audit->target)->name,
            'targetEmail' => (string) optional($audit->target)->email,
            'targetAvatarUrl' => optional($audit->target)->avatar_url,
            'previousRole' => (string) $audit->previous_role,
            'newRole' => (string) $audit->new_role,
            'reason' => (string) $audit->reason,
            'changedAt' => optional($audit->created_at)->toIso8601String(),
        ];
    }
}
