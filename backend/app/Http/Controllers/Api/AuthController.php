<?php

namespace App\Http\Controllers\Api;

use App\Contracts\GoogleIdTokenVerifier;
use App\Contracts\SmsVerificationSender;
use App\Http\Controllers\Controller;
use App\Mail\TrainerEmailOtpMail;
use App\Models\ClientProfile;
use App\Models\TrainerApplication;
use App\Models\TrainerRegistrationChallenge;
use App\Models\User;
use App\Services\ActivityLogService;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly ActivityLogService $activityLogs,
        private readonly SmsVerificationSender $smsVerificationSender,
        private readonly GoogleIdTokenVerifier $googleIdTokenVerifier,
    )
    {
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:120'],
            'role' => ['nullable', 'string', 'in:client'],
            'phone' => ['nullable', 'string', 'max:30'],
            'consent_to_terms' => ['nullable', 'boolean'],
            'primary_goal' => ['nullable', 'in:fitness,mental_health,both'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => $validated['role'] ?? 'client',
            'phone' => $validated['phone'] ?? null,
            'consent_to_terms' => (bool) ($validated['consent_to_terms'] ?? false),
            'wellness_goal' => $validated['primary_goal'] ?? null,
        ]);

        $profile = ClientProfile::updateOrCreate(
            ['user_id' => $user->id],
            ['primary_goal' => $validated['primary_goal'] ?? null]
        );

        if ((bool) ($validated['consent_to_terms'] ?? false)) {
            \App\Models\ConsentRecord::query()->create([
                'user_id'      => $user->id,
                'consent_type' => 'terms_of_service',
                'version'      => '1.0',
                'accepted_at'  => now(),
                'ip_address'   => $request->ip(),
                'user_agent'   => $request->userAgent(),
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        $this->activityLogs->record('account', 'registered', sprintf('%s created an account.', $user->name), [
            'actor' => $user,
            'subject' => $user,
            'details' => ['role' => $user->role],
            'audienceUsers' => [$user],
        ]);

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
            'profile' => $profile,
        ], 201);
    }

    public function requestTrainerMobileOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mobile' => ['required', 'string', 'max:30'],
            'consent_to_terms' => ['required', 'accepted'],
        ]);
        $mobile = $this->normalizeIndianMobile((string) $validated['mobile']);
        $this->ensureTrainerMobileAvailable($mobile);
        $token = Str::random(64);
        $now = now();
        $otp = $this->generateOtp('services.trainer_otp.code');

        TrainerRegistrationChallenge::query()
            ->where('status', 'pending')
            ->where('mobile', $mobile)
            ->update(['status' => 'replaced']);

        $challenge = TrainerRegistrationChallenge::query()->create([
            'token_hash' => hash('sha256', $token),
            'mobile' => $mobile,
            'stage' => 'mobile',
            'registration_payload' => Crypt::encryptString(json_encode([
                'mobile' => $mobile,
            ], JSON_THROW_ON_ERROR)),
            'otp_hash' => Hash::make($otp),
            'provider' => $this->smsVerificationSender->providerName(),
            'status' => 'pending',
            'attempts' => 0,
            'expires_at' => $now->copy()->addMinutes((int) config('services.trainer_otp.expiry_minutes', 10)),
            'resend_available_at' => $now->copy()->addSeconds((int) config('services.trainer_otp.resend_seconds', 60)),
        ]);

        $this->smsVerificationSender->send($mobile, $otp);

        return response()->json([
            'challengeToken' => $token,
            'maskedMobile' => $this->maskMobile($mobile),
            'expiresAt' => $challenge->expires_at->toIso8601String(),
            'resendAvailableAt' => $challenge->resend_available_at->toIso8601String(),
            'message' => 'Verification code sent to your mobile number.',
        ], 201);
    }

    public function verifyTrainerMobileOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challengeToken' => ['required', 'string', 'max:120'],
            'otp' => ['required', 'digits:6'],
        ]);

        $result = DB::transaction(function () use ($validated): array {
            $challenge = $this->findPendingTrainerChallenge((string) $validated['challengeToken'], true, 'mobile');

            $maxAttempts = (int) config('services.trainer_otp.max_attempts', 5);
            if ($challenge->expires_at->isPast()) {
                $challenge->forceFill(['status' => 'expired'])->save();

                return ['error' => 'This verification code has expired. Start registration again.'];
            }
            if ($challenge->attempts >= $maxAttempts) {
                $challenge->forceFill(['status' => 'blocked'])->save();

                return ['error' => 'Too many incorrect attempts. Start registration again.'];
            }
            if (!Hash::check((string) $validated['otp'], (string) $challenge->otp_hash)) {
                $challenge->increment('attempts');
                if ($challenge->attempts >= $maxAttempts) {
                    $challenge->forceFill(['status' => 'blocked'])->save();
                }

                return ['error' => $challenge->attempts >= $maxAttempts
                        ? 'Too many incorrect attempts. Start registration again.'
                        : 'Incorrect verification code.'];
            }

            $challenge->forceFill([
                'mobile_verified_at' => now(),
                'stage' => 'profile',
            ])->save();

            return ['challenge' => $challenge];
        });

        if (isset($result['error'])) {
            throw ValidationException::withMessages(['otp' => [$result['error']]]);
        }

        /** @var TrainerRegistrationChallenge $challenge */
        $challenge = $result['challenge'];

        return response()->json([
            'challengeToken' => $validated['challengeToken'],
            'mobileVerified' => true,
            'maskedMobile' => $this->maskMobile((string) $challenge->mobile),
            'message' => 'Mobile number verified.',
        ]);
    }

    public function resendTrainerMobileOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challengeToken' => ['required', 'string', 'max:120'],
        ]);
        $challenge = $this->findPendingTrainerChallenge((string) $validated['challengeToken'], false, 'mobile');
        $this->ensureChallengeUsable($challenge, 'mobile');

        if ($challenge->resend_available_at->isFuture()) {
            return response()->json([
                'message' => 'Please wait before requesting another code.',
                'resendAvailableAt' => $challenge->resend_available_at->toIso8601String(),
            ], 429);
        }

        $now = now();
        $otp = $this->generateOtp('services.trainer_otp.code');
        $challenge->forceFill([
            'otp_hash' => Hash::make($otp),
            'attempts' => 0,
            'expires_at' => $now->copy()->addMinutes((int) config('services.trainer_otp.expiry_minutes', 10)),
            'resend_available_at' => $now->copy()->addSeconds((int) config('services.trainer_otp.resend_seconds', 60)),
        ])->save();
        $this->smsVerificationSender->send((string) $challenge->mobile, $otp);

        return response()->json([
            'challengeToken' => $validated['challengeToken'],
            'maskedMobile' => $this->maskMobile((string) $challenge->mobile),
            'expiresAt' => $challenge->expires_at->toIso8601String(),
            'resendAvailableAt' => $challenge->resend_available_at->toIso8601String(),
            'message' => 'A new verification code has been sent.',
        ]);
    }

    public function requestTrainerEmailOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challengeToken' => ['required', 'string', 'max:120'],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:120'],
        ]);

        $challenge = $this->findPendingTrainerChallenge((string) $validated['challengeToken'], true, 'profile');
        $email = strtolower((string) $validated['email']);
        $name = trim((string) $validated['name']);

        TrainerRegistrationChallenge::query()
            ->where('status', 'pending')
            ->where('id', '!=', $challenge->id)
            ->whereRaw('LOWER(email) = ?', [$email])
            ->update(['status' => 'replaced']);

        $now = now();
        $otp = $this->generateOtp('services.trainer_email_otp.code');
        $expiryMinutes = (int) config('services.trainer_email_otp.expiry_minutes', 10);

        $challenge->forceFill([
            'email' => $email,
            'registration_payload' => Crypt::encryptString(json_encode([
                'name' => $name,
                'email' => $email,
                'password' => (string) $validated['password'],
                'mobile' => $challenge->mobile,
            ], JSON_THROW_ON_ERROR)),
            'email_otp_hash' => Hash::make($otp),
            'email_otp_attempts' => 0,
            'email_otp_expires_at' => $now->copy()->addMinutes($expiryMinutes),
            'email_otp_resend_available_at' => $now->copy()->addSeconds((int) config('services.trainer_email_otp.resend_seconds', 60)),
        ])->save();

        Mail::to($email)->send(new TrainerEmailOtpMail($otp, $name, $expiryMinutes));

        return response()->json([
            'challengeToken' => $validated['challengeToken'],
            'maskedEmail' => $this->maskEmail($email),
            'expiresAt' => $challenge->email_otp_expires_at->toIso8601String(),
            'resendAvailableAt' => $challenge->email_otp_resend_available_at->toIso8601String(),
            'message' => 'Verification code sent to your email.',
        ], 201);
    }

    public function verifyTrainerEmailOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challengeToken' => ['required', 'string', 'max:120'],
            'otp' => ['required', 'digits:6'],
        ]);

        $result = DB::transaction(function () use ($validated): array {
            $challenge = $this->findPendingTrainerChallenge((string) $validated['challengeToken'], true, 'profile');

            if (!$challenge->email_otp_hash || !$challenge->email_otp_expires_at) {
                return ['error' => 'This verification request is no longer available. Start again.'];
            }

            $maxAttempts = (int) config('services.trainer_email_otp.max_attempts', 5);
            if ($challenge->email_otp_expires_at->isPast()) {
                $challenge->forceFill(['status' => 'expired'])->save();

                return ['error' => 'This verification code has expired. Start registration again.'];
            }
            if ($challenge->email_otp_attempts >= $maxAttempts) {
                $challenge->forceFill(['status' => 'blocked'])->save();

                return ['error' => 'Too many incorrect attempts. Start registration again.'];
            }
            if (!Hash::check((string) $validated['otp'], (string) $challenge->email_otp_hash)) {
                $challenge->increment('email_otp_attempts');
                if ($challenge->email_otp_attempts >= $maxAttempts) {
                    $challenge->forceFill(['status' => 'blocked'])->save();
                }

                return ['error' => $challenge->email_otp_attempts >= $maxAttempts
                        ? 'Too many incorrect attempts. Start registration again.'
                        : 'Incorrect verification code.'];
            }

            $payload = json_decode(Crypt::decryptString((string) $challenge->registration_payload), true, 512, JSON_THROW_ON_ERROR);
            $accountResult = $this->createTrainerAccount($payload);

            $challenge->forceFill([
                'status' => 'verified',
                'stage' => 'completed',
                'verified_at' => now(),
            ])->save();

            return $accountResult;
        });

        if (isset($result['error'])) {
            throw ValidationException::withMessages(['otp' => [$result['error']]]);
        }

        return $this->trainerRegistrationResponse($result['user'], $result['application']);
    }

    public function resendTrainerEmailOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challengeToken' => ['required', 'string', 'max:120'],
        ]);
        $challenge = $this->findPendingTrainerChallenge((string) $validated['challengeToken'], false, 'profile');

        if (!$challenge->email || !$challenge->email_otp_hash) {
            throw ValidationException::withMessages([
                'otp' => ['This verification request is no longer available. Start again.'],
            ]);
        }
        $this->ensureChallengeUsable($challenge, 'email');

        if ($challenge->email_otp_resend_available_at?->isFuture()) {
            return response()->json([
                'message' => 'Please wait before requesting another code.',
                'resendAvailableAt' => $challenge->email_otp_resend_available_at->toIso8601String(),
            ], 429);
        }

        $payload = json_decode(Crypt::decryptString((string) $challenge->registration_payload), true, 512, JSON_THROW_ON_ERROR);
        $now = now();
        $otp = $this->generateOtp('services.trainer_email_otp.code');
        $expiryMinutes = (int) config('services.trainer_email_otp.expiry_minutes', 10);

        $challenge->forceFill([
            'email_otp_hash' => Hash::make($otp),
            'email_otp_attempts' => 0,
            'email_otp_expires_at' => $now->copy()->addMinutes($expiryMinutes),
            'email_otp_resend_available_at' => $now->copy()->addSeconds((int) config('services.trainer_email_otp.resend_seconds', 60)),
        ])->save();

        Mail::to((string) $challenge->email)->send(new TrainerEmailOtpMail($otp, (string) ($payload['name'] ?? ''), $expiryMinutes));

        return response()->json([
            'challengeToken' => $validated['challengeToken'],
            'maskedEmail' => $this->maskEmail((string) $challenge->email),
            'expiresAt' => $challenge->email_otp_expires_at->toIso8601String(),
            'resendAvailableAt' => $challenge->email_otp_resend_available_at->toIso8601String(),
            'message' => 'A new verification code has been sent.',
        ]);
    }

    public function googleTrainerRegister(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challengeToken' => ['required', 'string', 'max:120'],
            'idToken' => ['required', 'string'],
        ]);

        $result = DB::transaction(function () use ($validated): array {
            $challenge = $this->findPendingTrainerChallenge((string) $validated['challengeToken'], true, 'profile');

            try {
                $claims = $this->googleIdTokenVerifier->verify((string) $validated['idToken']);
            } catch (\Throwable) {
                return ['error' => 'Unable to verify your Google account. Try again.'];
            }

            if (!$claims['email_verified']) {
                return ['error' => 'Your Google account email is not verified.'];
            }

            if (User::query()->where('google_id', $claims['sub'])->exists()) {
                return ['error' => 'An account already exists for this Google account. Sign in instead.'];
            }

            if (User::query()->whereRaw('LOWER(email) = ?', [$claims['email']])->exists()) {
                return ['error' => 'This email is already registered. Sign in instead.'];
            }

            $accountResult = $this->createTrainerAccount([
                'name' => $claims['name'] !== '' ? $claims['name'] : $claims['email'],
                'email' => $claims['email'],
                'password' => Str::random(40),
                'mobile' => $challenge->mobile,
                'google_id' => $claims['sub'],
            ]);

            $challenge->forceFill([
                'status' => 'verified',
                'stage' => 'completed',
                'google_sub' => $claims['sub'],
                'verified_at' => now(),
            ])->save();

            return $accountResult;
        });

        if (isset($result['error'])) {
            throw ValidationException::withMessages(['idToken' => [$result['error']]]);
        }

        return $this->trainerRegistrationResponse($result['user'], $result['application']);
    }

    /**
     * @param array{name: string, email: string, password: string, mobile: string, google_id?: string|null} $payload
     * @return array{user: User, application: TrainerApplication}
     */
    private function createTrainerAccount(array $payload): array
    {
        if (User::query()->whereRaw('LOWER(email) = ?', [strtolower((string) $payload['email'])])->exists()) {
            throw ValidationException::withMessages(['email' => ['This email is already registered.']]);
        }
        $this->ensureTrainerMobileAvailable((string) $payload['mobile']);

        $user = User::query()->create([
            'name' => $payload['name'],
            'email' => $payload['email'],
            'password' => $payload['password'],
            'role' => 'trainer',
            'status' => 'active',
            'phone' => $payload['mobile'],
            // This helper only ever runs after the registration challenge's mobile OTP
            // (or Google) step has already verified the number, so mark it verified here too.
            'phone_verified_at' => now(),
            'google_id' => $payload['google_id'] ?? null,
            'consent_to_terms' => true,
        ]);

        \App\Models\ConsentRecord::query()->create([
            'user_id'      => $user->id,
            'consent_type' => 'terms_of_service',
            'version'      => '1.0',
            'accepted_at'  => now(),
            'ip_address'   => request()->ip(),
            'user_agent'   => request()->userAgent(),
        ]);

        $application = TrainerApplication::query()->create([
            'application_id' => 'TRN-' . now()->format('YmdHis') . '-' . Str::upper(Str::random(6)),
            'applicant_user_id' => $user->id,
            'applicant_name' => $user->name,
            'applicant_email' => $user->email,
            'applicant_mobile' => $user->phone,
            'values_json' => [
                'profile' => [
                    'fullName' => $user->name,
                    'email' => $user->email,
                    'mobile' => $user->phone,
                ],
            ],
            'status' => 'draft',
            'current_screen' => 'personalInfo',
            'review_history_json' => [],
        ]);

        return ['user' => $user, 'application' => $application];
    }

    private function trainerRegistrationResponse(User $user, TrainerApplication $application): JsonResponse
    {
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->activityLogs->record('account', 'registered', sprintf('%s started a trainer application.', $user->name), [
            'actor' => $user,
            'subject' => $application,
            'details' => ['role' => 'trainer', 'applicationId' => $application->application_id],
            'audienceUsers' => [$user],
            'audienceRoles' => ['admin'],
        ]);

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
            'application' => [
                'applicationId' => (string) $application->application_id,
                'status' => 'draft',
                'currentScreen' => 'personalInfo',
                'values' => $application->values_json,
            ],
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $throttleKey = 'login|' . strtolower((string) $validated['email']) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => ["Too many login attempts. Please try again in {$seconds} seconds."],
            ]);
        }

        $user = $this->findUserByLoginIdentifier((string) $validated['email']);

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            RateLimiter::hit($throttleKey, 300);
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        RateLimiter::clear($throttleKey);

        if ($user->status !== 'active') {
            return response()->json([
                'message' => $user->status === 'suspended'
                    ? 'Your account has been suspended. Please contact support.'
                    : 'Your account is pending activation. Please contact support.',
            ], 403);
        }

        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->activityLogs->record('auth', 'login', sprintf('%s signed in.', $user->name), [
            'actor' => $user,
            'subject' => $user,
            'audienceUsers' => [$user],
        ]);

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
            'profile' => $user->clientProfile,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('clientProfile');

        return response()->json([
            'user' => $this->userPayload($user),
            'profile' => $user->clientProfile,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        $this->activityLogs->record('auth', 'logout', sprintf('%s signed out.', (string) $user?->name), [
            'actor' => $user,
            'subject' => $user,
            'audienceUsers' => array_values(array_filter([$user])),
        ]);

        $user?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'max:120', 'confirmed'],
        ]);

        $user = $request->user();

        if (!$user || !Hash::check($validated['current_password'], (string) $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->forceFill([
            'password' => $validated['password'],
            'remember_token' => Str::random(60),
        ])->save();

        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->activityLogs->record('auth', 'password_changed', sprintf('%s changed their password.', $user->name), [
            'actor' => $user,
            'subject' => $user,
            'audienceUsers' => [$user],
        ]);

        return response()->json([
            'message' => 'Password updated successfully.',
            'token' => $token,
            'user' => $this->userPayload($user),
            'profile' => $user->clientProfile,
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $status = Password::sendResetLink([
            'email' => $validated['email'],
        ]);

        if ($status !== Password::RESET_LINK_SENT) {
            return response()->json([
                'message' => __($status),
            ], 422);
        }

        return response()->json([
            'message' => 'Password reset link sent to your email.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'max:120', 'confirmed'],
        ]);

        $resetUser = null;
        $status = Password::reset(
            $validated,
            function (User $user, string $password) use (&$resetUser): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                $user->tokens()->delete();
                $resetUser = $user;
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => __($status),
            ], 422);
        }

        if ($resetUser instanceof User) {
            $this->activityLogs->record('auth', 'password_reset', sprintf('%s reset their password.', $resetUser->name), [
                'actor' => $resetUser,
                'subject' => $resetUser,
                'audienceUsers' => [$resetUser],
            ]);
        }

        return response()->json([
            'message' => 'Password reset successful. You can now login with your new password.',
        ]);
    }

    private function userPayload(User $user): array
    {
        $requiresClientIntake = $user->role === 'client' && !$user->intakeFlows()->exists();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'phone' => $user->phone,
            'avatarUrl' => $user->avatar_url ?: $user->clientProfile?->profile_photo_url,
            'avatar_url' => $user->avatar_url,
            'dob' => optional($user->clientProfile?->dob)->format('Y-m-d'),
            'age' => $user->clientProfile?->dob?->age,
            'gender' => $user->clientProfile?->gender,
            'occupation' => $user->clientProfile?->occupation,
            'consent_to_terms' => (bool) $user->consent_to_terms,
            'status' => $user->status ?? 'active',
            'requires_client_intake' => $requiresClientIntake,
            'permissions' => app(PermissionService::class)->effectiveKeys($user),
        ];
    }

    private function normalizeIndianMobile(string $mobile): string
    {
        $normalized = $this->tryNormalizeIndianMobile($mobile);
        if ($normalized === null) {
            throw ValidationException::withMessages([
                'mobile' => ['Enter a valid Indian mobile number.'],
            ]);
        }

        return $normalized;
    }

    private function tryNormalizeIndianMobile(string $mobile): ?string
    {
        $digits = preg_replace('/\D+/', '', $mobile) ?? '';
        if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
            $digits = substr($digits, 2);
        }

        if (!preg_match('/^[6-9]\d{9}$/', $digits)) {
            return null;
        }

        return '+91' . $digits;
    }

    private function findUserByLoginIdentifier(string $identifier): ?User
    {
        $identifier = trim($identifier);
        if ($identifier === '') {
            return null;
        }

        if (str_contains($identifier, '@')) {
            return User::query()->whereRaw('LOWER(email) = ?', [strtolower($identifier)])->first();
        }

        $mobile = $this->tryNormalizeIndianMobile($identifier);
        if ($mobile === null) {
            return null;
        }

        // Only a verified mobile number can be used as a login identifier -- an unverified
        // `phone` value on a client/other-role account was never proven to belong to them.
        return User::query()->where('phone', $mobile)->whereNotNull('phone_verified_at')->first();
    }

    private function ensureTrainerMobileAvailable(string $mobile): void
    {
        if (User::query()->where('phone', $mobile)->exists()) {
            throw ValidationException::withMessages([
                'mobile' => ['This mobile number is already registered.'],
            ]);
        }
    }

    private function findPendingTrainerChallenge(string $token, bool $lock = false, ?string $expectedStage = null): TrainerRegistrationChallenge
    {
        $query = TrainerRegistrationChallenge::query()->where('token_hash', hash('sha256', $token));
        if ($lock) {
            $query->lockForUpdate();
        }
        $challenge = $query->first();

        if (!$challenge || $challenge->status !== 'pending' || ($expectedStage !== null && $challenge->stage !== $expectedStage)) {
            throw ValidationException::withMessages([
                'otp' => ['This verification request is no longer available. Start again.'],
            ]);
        }

        return $challenge;
    }

    private function ensureChallengeUsable(TrainerRegistrationChallenge $challenge, string $channel = 'mobile'): void
    {
        if ($channel === 'email') {
            if (!$challenge->email_otp_expires_at || $challenge->email_otp_expires_at->isPast()) {
                $challenge->forceFill(['status' => 'expired'])->save();
                throw ValidationException::withMessages([
                    'otp' => ['This verification code has expired. Start registration again.'],
                ]);
            }

            if ($challenge->email_otp_attempts >= (int) config('services.trainer_email_otp.max_attempts', 5)) {
                $challenge->forceFill(['status' => 'blocked'])->save();
                throw ValidationException::withMessages([
                    'otp' => ['Too many incorrect attempts. Start registration again.'],
                ]);
            }

            return;
        }

        if ($challenge->expires_at->isPast()) {
            $challenge->forceFill(['status' => 'expired'])->save();
            throw ValidationException::withMessages([
                'otp' => ['This verification code has expired. Start registration again.'],
            ]);
        }

        if ($challenge->attempts >= (int) config('services.trainer_otp.max_attempts', 5)) {
            $challenge->forceFill(['status' => 'blocked'])->save();
            throw ValidationException::withMessages([
                'otp' => ['Too many incorrect attempts. Start registration again.'],
            ]);
        }
    }

    private function maskMobile(string $mobile): string
    {
        return substr($mobile, 0, 3) . ' ***** ' . substr($mobile, -4);
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $visible = substr($local, 0, 1);

        return $visible . str_repeat('*', max(strlen($local) - 1, 3)) . '@' . $domain;
    }

    private function generateOtp(string $configKey): string
    {
        $random = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        if (app()->isProduction()) {
            return $random;
        }
        return (string) config($configKey, $random);
    }
}
