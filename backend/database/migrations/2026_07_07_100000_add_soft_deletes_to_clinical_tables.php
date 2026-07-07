<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TABLES = [
        'counsellor_session_notes',
        'counsellor_session_flows',
        'counsellor_session_flow_steps',
        'counsellor_assessment_results',
        'cbt_care_plans',
        'cbt_exercise_responses',
        'cbt_risk_events',
        'intake_flows',
        'intake_answers',
    ];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $table): void {
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $table): void {
                $table->dropColumn('deleted_at');
            });
        }
    }
};
