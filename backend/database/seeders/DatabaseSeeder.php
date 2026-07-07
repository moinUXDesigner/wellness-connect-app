<?php

namespace Database\Seeders;

use App\Models\ClientProfile;
use App\Models\Practitioner;
use App\Models\PractitionerSpecialty;
use App\Models\ServiceCatalog;
use App\Models\TrainerApplication;
use App\Models\User;
use App\Models\WellnessPackage;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        if (! app()->isLocal() && ! app()->environment('testing')) {
            $this->command->warn('DatabaseSeeder: skipped — only runs in local/testing environments.');
            return;
        }

        $this->call(CbtTemplateSeeder::class);

        foreach ([
            ['code' => 'psychology', 'name' => 'Psychology Support', 'description' => 'Counselling support'],
            ['code' => 'training', 'name' => 'Personal Training', 'description' => 'Fitness training'],
            ['code' => 'combined', 'name' => 'Combined Wellness', 'description' => 'Mind + body support'],
            ['code' => 'package', 'name' => 'Wellness Packages', 'description' => 'Bundled plans'],
        ] as $service) {
            ServiceCatalog::updateOrCreate(['code' => $service['code']], $service + ['is_active' => true]);
        }

        foreach ([
            ['code' => 'mind-care-starter', 'name' => 'Mind Care Starter', 'description' => '2 counselling sessions - 4 weeks', 'duration_weeks' => 4, 'sessions_counselling' => 2, 'sessions_training' => 0],
            ['code' => 'fit-start-plan', 'name' => 'Fit Start Plan', 'description' => '4 PT sessions - 4 weeks', 'duration_weeks' => 4, 'sessions_counselling' => 0, 'sessions_training' => 4],
            ['code' => 'mind-body-reset', 'name' => 'Mind + Body Reset', 'description' => '4 counselling + 4 PT sessions - 8 weeks', 'duration_weeks' => 8, 'sessions_counselling' => 4, 'sessions_training' => 4],
        ] as $package) {
            WellnessPackage::updateOrCreate(['code' => $package['code']], $package + ['is_active' => true]);
        }

        $admin = User::updateOrCreate(
            ['email' => 'admin@wellnessconnect.local'],
            ['name' => 'Admin User', 'password' => 'Admin@12345', 'role' => 'admin', 'status' => 'active', 'phone' => '+91 9000000001', 'consent_to_terms' => true]
        );

        $client = User::updateOrCreate(
            ['email' => 'client@wellnessconnect.local'],
            ['name' => 'Client User', 'password' => 'Client@12345', 'role' => 'client', 'status' => 'active', 'phone' => '+91 9000000002', 'consent_to_terms' => true, 'wellness_goal' => 'both']
        );

        $counsellorUser = User::updateOrCreate(
            ['email' => 'counsellor@wellnessconnect.local'],
            ['name' => 'Dr. Aisha Sharma', 'password' => 'Counsellor@12345', 'role' => 'counsellor', 'status' => 'active', 'phone' => '+91 9000000003', 'consent_to_terms' => true]
        );

        $trainerUser = User::updateOrCreate(
            ['email' => 'trainer@wellnessconnect.local'],
            ['name' => 'Arjun Mehta', 'password' => 'Trainer@12345', 'role' => 'trainer', 'status' => 'active', 'phone' => '+91 9000000004', 'consent_to_terms' => true]
        );

        TrainerApplication::updateOrCreate(
            ['application_id' => 'TRN-SEED-APPROVED'],
            [
                'reviewed_by_user_id' => $admin->id,
                'applicant_name' => $trainerUser->name,
                'applicant_email' => $trainerUser->email,
                'applicant_mobile' => (string) $trainerUser->phone,
                'city' => 'Hyderabad',
                'state' => 'Telangana',
                'expertise_json' => ['Mobility', 'Consistency'],
                'values_json' => [],
                'status' => 'approved',
                'admin_remarks' => 'Pre-approved seeded trainer account.',
                'review_history_json' => [],
                'submitted_at' => now(),
            ]
        );

        ClientProfile::updateOrCreate(
            ['user_id' => $client->id],
            ['primary_goal' => 'both', 'timezone' => 'Asia/Kolkata', 'preferred_language' => 'en']
        );

        $counsellor = Practitioner::updateOrCreate(
            ['user_id' => $counsellorUser->id],
            ['practitioner_type' => 'counsellor', 'bio' => 'Specializes in anxiety, stress and burnout.', 'rating' => 4.9, 'is_active' => true]
        );

        $trainer = Practitioner::updateOrCreate(
            ['user_id' => $trainerUser->id],
            ['practitioner_type' => 'trainer', 'bio' => 'Focuses on mobility and consistency.', 'rating' => 4.8, 'is_active' => true]
        );

        foreach (['anxiety', 'stress', 'burnout'] as $specialty) {
            PractitionerSpecialty::updateOrCreate(['practitioner_id' => $counsellor->id, 'specialty_code' => $specialty]);
        }

        foreach (['fat_loss', 'mobility', 'consistency'] as $specialty) {
            PractitionerSpecialty::updateOrCreate(['practitioner_id' => $trainer->id, 'specialty_code' => $specialty]);
        }

        $this->call(AvailabilitySlotSeeder::class);
    }
}
