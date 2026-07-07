<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trainer_registration_challenges', function (Blueprint $table): void {
            $table->string('stage', 20)->default('mobile')->after('mobile');
            $table->timestamp('mobile_verified_at')->nullable()->after('verified_at');
            $table->string('email_otp_hash')->nullable()->after('otp_hash');
            $table->timestamp('email_otp_expires_at')->nullable()->after('expires_at');
            $table->timestamp('email_otp_resend_available_at')->nullable()->after('resend_available_at');
            $table->unsignedTinyInteger('email_otp_attempts')->default(0)->after('attempts');
            $table->string('google_sub', 64)->nullable()->after('provider');
        });

        Schema::table('trainer_registration_challenges', function (Blueprint $table): void {
            $table->string('email', 255)->nullable()->change();
            $table->text('registration_payload')->nullable()->change();
            $table->string('otp_hash')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('trainer_registration_challenges', function (Blueprint $table): void {
            $table->dropColumn([
                'stage',
                'mobile_verified_at',
                'email_otp_hash',
                'email_otp_expires_at',
                'email_otp_resend_available_at',
                'email_otp_attempts',
                'google_sub',
            ]);
        });
    }
};
