<?php

namespace Tests\Feature;

use App\Mail\AdminPasswordResetMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_reset_registered_user_password_and_revoke_tokens(): void
    {
        Mail::fake();

        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);
        $user = User::factory()->create([
            'password' => 'old-password',
            'role' => 'client',
            'status' => 'active',
        ]);
        $user->createToken('existing-session');

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/v1/admin/users/{$user->id}/reset-password");
        $response->assertOk()->assertJsonPath('user.id', (string) $user->id);

        // Response must NOT expose the temporary password
        $this->assertArrayNotHasKey('password', $response->json());

        $user->refresh();

        // Old password must no longer work
        $this->assertFalse(Hash::check('old-password', $user->password));

        // Notification email must be sent
        Mail::assertSent(AdminPasswordResetMail::class, fn ($mail) => $mail->hasTo($user->email));

        // All sessions revoked
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'tokenable_type' => User::class,
        ]);
    }

    public function test_non_admin_cannot_reset_a_user_password(): void
    {
        $requester = User::factory()->create([
            'role' => 'client',
            'status' => 'active',
        ]);
        $user = User::factory()->create([
            'password' => 'old-password',
        ]);

        Sanctum::actingAs($requester);

        $this->postJson("/api/v1/admin/users/{$user->id}/reset-password")
            ->assertForbidden();

        $this->assertTrue(Hash::check('old-password', $user->fresh()->password));
    }
}
