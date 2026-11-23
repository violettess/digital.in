<?php

use App\Models\PlatformSetting;
use App\Shared\Settings\PlatformSettingsService;
use Database\Seeders\PlatformSettingsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_the_documented_business_settings_and_serves_them_through_the_cache_service(): void
    {
        $this->seed(PlatformSettingsSeeder::class);

        $settings = app(PlatformSettingsService::class);

        expect($settings->get('platform_fee_pct'))->toBe(12)
            ->and($settings->get('start_reminder_hours'))->toBe([24, 72])
            ->and($settings->get('withdrawal_fee'))->toBeNull()
            ->and($settings->get('min_milestone_amount'))->toBeNull()
            ->and($settings->get('unknown_setting', 'fallback'))->toBe('fallback')
            ->and($settings->all())->toHaveCount(25);
    }

    public function test_seeding_restores_missing_defaults_without_overwriting_admin_values(): void
    {
        $this->seed(PlatformSettingsSeeder::class);
        PlatformSetting::query()->whereKey('platform_fee_pct')->update(['value' => 14]);
        PlatformSetting::query()->whereKey('max_active_contracts_per_student')->delete();

        $this->seed(PlatformSettingsSeeder::class);

        $settings = app(PlatformSettingsService::class);

        expect($settings->number('platform_fee_pct'))->toBe(14.0)
            ->and($settings->int('max_active_contracts_per_student'))->toBe(2);
    }
}
