<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'google_id')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->string('google_id', 64)->nullable()->unique()->after('phone');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'google_id')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('google_id');
            });
        }
    }
};
