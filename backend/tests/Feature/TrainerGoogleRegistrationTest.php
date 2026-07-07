<?php

namespace Tests\Feature;

use App\Contracts\GoogleIdTokenVerifier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrainerGoogleRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_register_requires_verified_mobile(): void
    {
        $this->mockGoogleVerifier([
            'sub' => 'google-sub-1',
            'email' => 'google.trainer@example.com',
            'email_verified' => true,
            'name' => 'Google Trainer',
        ]);

        $challengeToken = $this->requestMobileOtp();

        $this->postJson('/api/v1/auth/trainer-register/google', [
            'challengeToken' => $challengeToken,
            'idToken' => 'fake-id-token',
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('users', ['email' => 'google.trainer@example.com']);
    }

    public function test_google_register_creates_account_with_valid_token(): void
    {
        $this->mockGoogleVerifier([
            'sub' => 'google-sub-1',
            'email' => 'google.trainer@example.com',
            'email_verified' => true,
            'name' => 'Google Trainer',
        ]);

        $challengeToken = $this->requestMobileOtp();
        $this->verifyMobileOtp($challengeToken);

        $this->postJson('/api/v1/auth/trainer-register/google', [
            'challengeToken' => $challengeToken,
            'idToken' => 'fake-id-token',
        ])->assertCreated()
            ->assertJsonPath('user.role', 'trainer')
            ->assertJsonPath('user.email', 'google.trainer@example.com')
            ->assertJsonPath('application.status', 'draft');

        $this->assertDatabaseHas('users', [
            'email' => 'google.trainer@example.com',
            'role' => 'trainer',
            'google_id' => 'google-sub-1',
            'phone' => '+919876543210',
        ]);
        $this->assertDatabaseHas('trainer_registration_challenges', [
            'mobile' => '+919876543210',
            'status' => 'verified',
            'stage' => 'completed',
            'google_sub' => 'google-sub-1',
        ]);
    }

    public function test_google_register_rejects_already_registered_email(): void
    {
        User::factory()->create(['email' => 'google.trainer@example.com']);

        $this->mockGoogleVerifier([
            'sub' => 'google-sub-2',
            'email' => 'google.trainer@example.com',
            'email_verified' => true,
            'name' => 'Google Trainer',
        ]);

        $challengeToken = $this->requestMobileOtp();
        $this->verifyMobileOtp($challengeToken);

        $this->postJson('/api/v1/auth/trainer-register/google', [
            'challengeToken' => $challengeToken,
            'idToken' => 'fake-id-token',
        ])->assertUnprocessable();
    }

    public function test_google_register_rejects_unverified_google_email(): void
    {
        $this->mockGoogleVerifier([
            'sub' => 'google-sub-3',
            'email' => 'unverified@example.com',
            'email_verified' => false,
            'name' => 'Unverified',
        ]);

        $challengeToken = $this->requestMobileOtp();
        $this->verifyMobileOtp($challengeToken);

        $this->postJson('/api/v1/auth/trainer-register/google', [
            'challengeToken' => $challengeToken,
            'idToken' => 'fake-id-token',
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('users', ['email' => 'unverified@example.com']);
    }

    private function mockGoogleVerifier(array $claims): void
    {
        $this->mock(GoogleIdTokenVerifier::class, function ($mock) use ($claims): void {
            $mock->shouldReceive('verify')->andReturn($claims);
        });
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
}
