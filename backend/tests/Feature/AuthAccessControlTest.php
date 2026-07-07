<?php

namespace Tests\Feature;

use App\Mail\TrainerEmailOtpMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthAccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_cannot_create_privileged_user(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Unsafe Admin',
            'email' => 'unsafe-admin@example.com',
            'password' => 'password123',
            'role' => 'admin',
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('users', ['email' => 'unsafe-admin@example.com']);
    }

    public function test_public_registration_still_creates_client_account(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'New Client',
            'email' => 'new-client@example.com',
            'password' => 'password123',
            'role' => 'client',
        ])->assertCreated()->assertJsonPath('user.role', 'client');
    }

    public function test_trainer_mobile_otp_request_does_not_create_account_or_draft(): void
    {
        $this->postJson('/api/v1/auth/trainer-register/mobile-otp/request', [
            'mobile' => '98765 43210',
            'consent_to_terms' => true,
        ])->assertCreated()
            ->assertJsonStructure(['challengeToken', 'maskedMobile', 'expiresAt', 'resendAvailableAt']);

        $this->assertDatabaseMissing('users', ['phone' => '+919876543210']);
        $this->assertDatabaseHas('trainer_registration_challenges', [
            'mobile' => '+919876543210',
            'stage' => 'mobile',
            'status' => 'pending',
        ]);
    }

    public function test_trainer_mobile_otp_verify_marks_mobile_verified_without_creating_account(): void
    {
        $challengeToken = $this->requestMobileOtp();

        $this->postJson('/api/v1/auth/trainer-register/mobile-otp/verify', [
            'challengeToken' => $challengeToken,
            'otp' => '123456',
        ])->assertOk()->assertJsonPath('mobileVerified', true);

        $this->assertDatabaseMissing('users', ['phone' => '+919876543210']);
        $this->assertDatabaseHas('trainer_registration_challenges', [
            'mobile' => '+919876543210',
            'stage' => 'profile',
            'status' => 'pending',
        ]);
    }

    public function test_trainer_mobile_otp_attempt_limit_blocks_registration(): void
    {
        $challengeToken = $this->requestMobileOtp();

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/auth/trainer-register/mobile-otp/verify', [
                'challengeToken' => $challengeToken,
                'otp' => '000000',
            ])->assertUnprocessable();
        }

        $this->assertDatabaseHas('trainer_registration_challenges', ['status' => 'blocked', 'attempts' => 5]);
        $this->postJson('/api/v1/auth/trainer-register/mobile-otp/verify', [
            'challengeToken' => $challengeToken,
            'otp' => '123456',
        ])->assertUnprocessable();
    }

    public function test_trainer_mobile_otp_resend_respects_cooldown_and_keeps_challenge_usable(): void
    {
        Carbon::setTestNow('2026-05-26 10:00:00');
        $challengeToken = $this->requestMobileOtp();

        $this->postJson('/api/v1/auth/trainer-register/mobile-otp/resend', [
            'challengeToken' => $challengeToken,
        ])->assertStatus(429);

        Carbon::setTestNow(now()->addMinutes(2));
        $this->postJson('/api/v1/auth/trainer-register/mobile-otp/resend', [
            'challengeToken' => $challengeToken,
        ])->assertOk()->assertJsonPath('challengeToken', $challengeToken);

        $this->postJson('/api/v1/auth/trainer-register/mobile-otp/verify', [
            'challengeToken' => $challengeToken,
            'otp' => '123456',
        ])->assertOk();

        Carbon::setTestNow();
    }

    public function test_trainer_mobile_otp_expiry_and_replacement_prevent_old_challenges(): void
    {
        Carbon::setTestNow('2026-05-26 10:00:00');
        $expiredToken = $this->requestMobileOtp();
        Carbon::setTestNow(now()->addMinutes(11));

        $this->postJson('/api/v1/auth/trainer-register/mobile-otp/verify', [
            'challengeToken' => $expiredToken,
            'otp' => '123456',
        ])->assertUnprocessable();

        $firstToken = $this->requestMobileOtp();
        $replacementToken = $this->requestMobileOtp();

        $this->postJson('/api/v1/auth/trainer-register/mobile-otp/verify', [
            'challengeToken' => $firstToken,
            'otp' => '123456',
        ])->assertUnprocessable();
        $this->postJson('/api/v1/auth/trainer-register/mobile-otp/verify', [
            'challengeToken' => $replacementToken,
            'otp' => '123456',
        ])->assertOk();

        $this->assertDatabaseHas('trainer_registration_challenges', ['status' => 'expired']);
        $this->assertDatabaseHas('trainer_registration_challenges', ['status' => 'replaced']);
        Carbon::setTestNow();
    }

    public function test_trainer_email_otp_request_requires_verified_mobile(): void
    {
        $challengeToken = $this->requestMobileOtp();

        $this->postJson('/api/v1/auth/trainer-register/email-otp/request', [
            'challengeToken' => $challengeToken,
            'name' => 'Draft Trainer',
            'email' => 'draft.trainer@example.com',
            'password' => 'password123',
        ])->assertUnprocessable();
    }

    public function test_trainer_email_otp_verify_creates_account_and_draft(): void
    {
        Mail::fake();
        $challengeToken = $this->requestMobileOtp();
        $this->verifyMobileOtp($challengeToken);
        $otp = $this->requestEmailOtpAndCaptureCode($challengeToken, [
            'name' => 'Draft Trainer',
            'email' => 'draft.trainer@example.com',
            'password' => 'password123',
        ]);

        $this->postJson('/api/v1/auth/trainer-register/email-otp/verify', [
            'challengeToken' => $challengeToken,
            'otp' => $otp,
        ])->assertCreated()
            ->assertJsonPath('user.role', 'trainer')
            ->assertJsonPath('user.phone', '+919876543210')
            ->assertJsonPath('application.status', 'draft')
            ->assertJsonPath('application.currentScreen', 'personalInfo')
            ->assertJsonPath('application.values.profile.mobile', '+919876543210')
            ->assertJsonPath('application.values.profile.email', 'draft.trainer@example.com');

        $this->assertDatabaseHas('users', [
            'email' => 'draft.trainer@example.com',
            'role' => 'trainer',
            'phone' => '+919876543210',
        ]);
        $this->assertDatabaseHas('trainer_applications', [
            'applicant_email' => 'draft.trainer@example.com',
            'applicant_mobile' => '+919876543210',
            'status' => 'draft',
        ]);
    }

    public function test_trainer_email_otp_attempt_limit_blocks_registration(): void
    {
        Mail::fake();
        $challengeToken = $this->requestMobileOtp();
        $this->verifyMobileOtp($challengeToken);
        $this->requestEmailOtpAndCaptureCode($challengeToken, [
            'name' => 'Draft Trainer',
            'email' => 'draft.trainer@example.com',
            'password' => 'password123',
        ]);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/auth/trainer-register/email-otp/verify', [
                'challengeToken' => $challengeToken,
                'otp' => '000000',
            ])->assertUnprocessable();
        }

        $this->assertDatabaseHas('trainer_registration_challenges', ['status' => 'blocked', 'email_otp_attempts' => 5]);
        $this->assertDatabaseMissing('users', ['email' => 'draft.trainer@example.com']);
    }

    public function test_trainer_email_otp_resend_respects_cooldown(): void
    {
        Mail::fake();
        Carbon::setTestNow('2026-05-26 10:00:00');
        $challengeToken = $this->requestMobileOtp();
        $this->verifyMobileOtp($challengeToken);
        $this->requestEmailOtpAndCaptureCode($challengeToken, [
            'name' => 'Draft Trainer',
            'email' => 'draft.trainer@example.com',
            'password' => 'password123',
        ]);

        $this->postJson('/api/v1/auth/trainer-register/email-otp/resend', [
            'challengeToken' => $challengeToken,
        ])->assertStatus(429);

        Carbon::setTestNow(now()->addMinutes(2));
        $this->postJson('/api/v1/auth/trainer-register/email-otp/resend', [
            'challengeToken' => $challengeToken,
        ])->assertOk()->assertJsonPath('challengeToken', $challengeToken);

        Mail::assertSent(TrainerEmailOtpMail::class, 2);
        Carbon::setTestNow();
    }

    public function test_trainer_mobile_and_email_otp_attempt_counters_are_independent(): void
    {
        Mail::fake();
        $challengeToken = $this->requestMobileOtp();

        // Wrong mobile attempts before verifying should not affect the email-stage counters later.
        $this->postJson('/api/v1/auth/trainer-register/mobile-otp/verify', [
            'challengeToken' => $challengeToken,
            'otp' => '000000',
        ])->assertUnprocessable();

        $this->verifyMobileOtp($challengeToken);
        $this->assertDatabaseHas('trainer_registration_challenges', ['attempts' => 1, 'email_otp_attempts' => 0]);

        $otp = $this->requestEmailOtpAndCaptureCode($challengeToken, [
            'name' => 'Draft Trainer',
            'email' => 'draft.trainer@example.com',
            'password' => 'password123',
        ]);

        $this->postJson('/api/v1/auth/trainer-register/email-otp/verify', [
            'challengeToken' => $challengeToken,
            'otp' => '000000',
        ])->assertUnprocessable();
        $this->assertDatabaseHas('trainer_registration_challenges', ['attempts' => 1, 'email_otp_attempts' => 1]);

        $this->postJson('/api/v1/auth/trainer-register/email-otp/verify', [
            'challengeToken' => $challengeToken,
            'otp' => $otp,
        ])->assertCreated();
    }

    public function test_inactive_accounts_cannot_login(): void
    {
        foreach (['pending', 'suspended'] as $status) {
            User::factory()->create([
                'email' => "{$status}@example.com",
                'password' => 'password123',
                'role' => 'client',
                'status' => $status,
            ]);

            $this->postJson('/api/v1/auth/login', [
                'email' => "{$status}@example.com",
                'password' => 'password123',
            ])->assertForbidden();
        }
    }

    public function test_user_can_login_with_email(): void
    {
        User::factory()->create([
            'email' => 'email.login@example.com',
            'password' => 'password123',
            'role' => 'client',
            'status' => 'active',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'EMAIL.login@example.com',
            'password' => 'password123',
        ])->assertOk()->assertJsonPath('user.email', 'email.login@example.com');
    }

    public function test_user_can_login_with_verified_mobile_number(): void
    {
        User::factory()->create([
            'email' => 'verified.mobile@example.com',
            'password' => 'password123',
            'role' => 'trainer',
            'status' => 'active',
            'phone' => '+919876543210',
            'phone_verified_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => '98765 43210',
            'password' => 'password123',
        ])->assertOk()->assertJsonPath('user.email', 'verified.mobile@example.com');
    }

    public function test_user_cannot_login_with_unverified_mobile_number(): void
    {
        User::factory()->create([
            'email' => 'unverified.mobile@example.com',
            'password' => 'password123',
            'role' => 'client',
            'status' => 'active',
            'phone' => '+919876543210',
            'phone_verified_at' => null,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => '98765 43210',
            'password' => 'password123',
        ])->assertUnprocessable();
    }

    public function test_trainer_can_login_with_mobile_immediately_after_registration(): void
    {
        Mail::fake();
        $challengeToken = $this->requestMobileOtp('+91 91234 56780');
        $this->verifyMobileOtp($challengeToken);
        $otp = $this->requestEmailOtpAndCaptureCode($challengeToken, [
            'name' => 'Mobile Login Trainer',
            'email' => 'mobile.login.trainer@example.com',
            'password' => 'password123',
        ]);
        $this->postJson('/api/v1/auth/trainer-register/email-otp/verify', [
            'challengeToken' => $challengeToken,
            'otp' => $otp,
        ])->assertCreated();

        $this->postJson('/api/v1/auth/login', [
            'email' => '+91 91234 56780',
            'password' => 'password123',
        ])->assertOk()->assertJsonPath('user.email', 'mobile.login.trainer@example.com');
    }

    public function test_inactive_account_token_is_rejected_on_protected_api(): void
    {
        $suspended = User::factory()->create(['role' => 'client', 'status' => 'suspended']);
        Sanctum::actingAs($suspended);

        $this->getJson('/api/v1/auth/me')->assertForbidden();
        $this->putJson('/api/v1/client/profile', [
            'name' => 'Blocked User',
            'consent_to_terms' => true,
        ])->assertForbidden();
    }

    private function requestMobileOtp(string $mobile = '+91 98765 43210'): string
    {
        return (string) $this->postJson('/api/v1/auth/trainer-register/mobile-otp/request', [
            'mobile' => $mobile,
            'consent_to_terms' => true,
        ])->assertCreated()->json('challengeToken');
    }

    private function verifyMobileOtp(string $challengeToken): void
    {
        $this->postJson('/api/v1/auth/trainer-register/mobile-otp/verify', [
            'challengeToken' => $challengeToken,
            'otp' => '123456',
        ])->assertOk();
    }

    private function requestEmailOtpAndCaptureCode(string $challengeToken, array $overrides): string
    {
        $this->postJson('/api/v1/auth/trainer-register/email-otp/request', array_merge(
            ['challengeToken' => $challengeToken],
            $overrides,
        ))->assertCreated();

        $captured = null;
        Mail::assertSent(TrainerEmailOtpMail::class, function (TrainerEmailOtpMail $mail) use (&$captured): bool {
            $captured = $mail->otp;

            return true;
        });

        return (string) $captured;
    }
}
