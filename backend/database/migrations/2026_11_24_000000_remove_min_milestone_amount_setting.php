<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('platform_settings')->where('key', 'min_milestone_amount')->delete();
        Cache::forget('platform_settings:all');
    }

    public function down(): void
    {
        DB::table('platform_settings')->updateOrInsert(
            ['key' => 'min_milestone_amount'],
            ['value' => json_encode(150000), 'updated_at' => now(), 'created_at' => now()],
        );
        Cache::forget('platform_settings:all');
    }
};
