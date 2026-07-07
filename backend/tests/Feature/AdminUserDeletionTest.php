<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentEvent;
use App\Models\CreditAdjustment;
use App\Models\EntitlementPeriod;
use App\Models\MembershipPayment;
use App\Models\MembershipReceipt;
use App\Models\MembershipRefund;
use App\Models\MembershipSubscription;
use App\Models\RevenueRecognition;
use App\Models\User;
use App\Models\WellnessPackage;
use App\Models\WellnessPackagePriceTier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_anonymise_a_user_and_revoke_tokens(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $user = User::factory()->create(['role' => 'client', 'status' => 'active']);
        $user->createToken('existing-session');
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/v1/admin/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('user.id', (string) $user->id);

        $user->refresh();
        $this->assertStringStartsWith('deleted+', $user->email);
        $this->assertSame('suspended', $user->status);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'tokenable_type' => User::class,
        ]);
        $this->assertDatabaseHas('activity_events', [
            'category' => 'account',
            'action' => 'user_deleted',
            'actor_user_id' => $admin->id,
        ]);
    }

    public function test_admin_cannot_delete_their_own_account(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/v1/admin/users/{$admin->id}")->assertUnprocessable();
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_non_admin_cannot_delete_a_user(): void
    {
        $requester = User::factory()->create(['role' => 'client', 'status' => 'active']);
        $user = User::factory()->create();
        Sanctum::actingAs($requester);

        $this->deleteJson("/api/v1/admin/users/{$user->id}")->assertForbidden();
        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_appointment_audit_events_do_not_block_anonymisation(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $user = User::factory()->create(['role' => 'client', 'status' => 'active']);
        $appointment = Appointment::query()->create([
            'client_user_id' => $user->id,
            'service_type' => 'training',
            'mode' => 'online',
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHour(),
            'status' => 'scheduled',
        ]);
        AppointmentEvent::query()->create([
            'appointment_id' => $appointment->id,
            'event_type' => 'created',
            'actor_user_id' => $user->id,
            'created_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/v1/admin/users/{$user->id}")->assertOk();

        $user->refresh();
        $this->assertStringStartsWith('deleted+', $user->email);
    }

    public function test_financial_actions_do_not_block_anonymisation(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $actor = User::factory()->create(['role' => 'finance', 'status' => 'active']);
        $client = User::factory()->create(['role' => 'client', 'status' => 'active']);
        [$subscription, $payment] = $this->billingRecordsFor($client);
        CreditAdjustment::query()->create([
            'subscription_id' => $subscription->id,
            'credit_type' => 'training',
            'adjustment_amount' => 1,
            'reason' => 'Manual correction.',
            'actor_id' => $actor->id,
        ]);
        MembershipRefund::query()->create([
            'payment_id' => $payment->id,
            'subscription_id' => $subscription->id,
            'amount_minor' => 1000,
            'category' => 'admin_adjustment',
            'reason' => 'Approved refund.',
            'status' => 'processed',
            'actor_user_id' => $actor->id,
        ]);
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/v1/admin/users/{$actor->id}")->assertOk();

        $actor->refresh();
        $this->assertStringStartsWith('deleted+', $actor->email);
    }

    public function test_client_billing_history_does_not_block_anonymisation(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $client = User::factory()->create(['role' => 'client', 'status' => 'active']);
        [$subscription, $payment] = $this->billingRecordsFor($client);
        $period = EntitlementPeriod::query()->create([
            'subscription_id' => $subscription->id,
            'payment_id' => $payment->id,
            'starts_at' => now(),
            'ends_at' => now()->addMonth(),
            'granted_credits_json' => ['training' => 1],
            'status' => 'active',
        ]);
        MembershipReceipt::query()->create([
            'payment_id' => $payment->id,
            'subscription_id' => $subscription->id,
            'receipt_number' => 'RCT-DELETE-1',
            'client_name' => $client->name,
            'client_email' => $client->email,
            'plan_name' => 'Delete protection plan',
            'tier_label' => 'Standard',
            'amount_minor' => 5000,
            'currency' => 'INR',
            'issued_at' => now(),
        ]);
        RevenueRecognition::query()->create([
            'subscription_id' => $subscription->id,
            'payment_id' => $payment->id,
            'entitlement_period_id' => $period->id,
            'amount_earned_minor' => 0,
            'amount_deferred_minor' => 5000,
            'recognition_reason' => 'payment_captured_deferred',
            'recognized_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/v1/admin/users/{$client->id}")->assertOk();

        $client->refresh();
        $this->assertStringStartsWith('deleted+', $client->email);
    }

    private function billingRecordsFor(User $client): array
    {
        $package = WellnessPackage::query()->create([
            'code' => 'delete-protection-' . uniqid(),
            'slug' => 'delete-protection-' . uniqid(),
            'name' => 'Delete protection plan',
            'status' => 'published',
            'duration_weeks' => 4,
            'sessions_counselling' => 0,
            'sessions_training' => 1,
            'is_active' => true,
        ]);
        $version = $package->versions()->create([
            'version_number' => 1,
            'name' => 'Delete protection plan',
            'duration_weeks' => 4,
            'included_credits_json' => ['training' => 1],
            'status' => 'published',
            'published_at' => now(),
        ]);
        $tier = WellnessPackagePriceTier::query()->create([
            'wellness_package_version_id' => $version->id,
            'label' => 'Standard',
            'billing_type' => 'one_time',
            'amount_minor' => 5000,
            'currency' => 'INR',
            'is_active' => true,
        ]);
        $subscription = MembershipSubscription::query()->create([
            'client_user_id' => $client->id,
            'wellness_package_version_id' => $version->id,
            'price_tier_id' => $tier->id,
            'status' => 'active',
        ]);
        $payment = MembershipPayment::query()->create([
            'subscription_id' => $subscription->id,
            'amount_minor' => 5000,
            'currency' => 'INR',
            'status' => 'captured',
        ]);

        return [$subscription, $payment];
    }
}
