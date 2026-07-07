<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'phone_verified_at')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->timestamp('phone_verified_at')->nullable()->after('phone');
            });
        }

        // Every existing trainer account got its phone number through the OTP-verified
        // registration flow, so it's safe to backfill them as verified retroactively.
        DB::table('users')
            ->where('role', 'trainer')
            ->whereNotNull('phone')
            ->whereNull('phone_verified_at')
            ->update(['phone_verified_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'phone_verified_at')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('phone_verified_at');
            });
        }
    }
};
