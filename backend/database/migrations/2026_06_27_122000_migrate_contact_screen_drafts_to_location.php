<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('trainer_applications')->where('current_screen', 'contact')->update(['current_screen' => 'location']);
    }

    public function down(): void
    {
        // Irreversible: original current_screen value for affected drafts is not recoverable.
    }
};
