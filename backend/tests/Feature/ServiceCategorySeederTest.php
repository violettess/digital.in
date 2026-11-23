<?php

use Database\Seeders\ServiceCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceCategorySeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_active_categories_idempotently_for_the_public_catalog_endpoint(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        $this->seed(ServiceCategorySeeder::class);

        $this->assertDatabaseCount('service_categories', count(ServiceCategorySeeder::CATEGORIES));

        $this->getJson('/api/v1/categories')
            ->assertOk()
            ->assertJsonCount(count(ServiceCategorySeeder::CATEGORIES), 'data')
            ->assertJsonPath('data.0.name', 'Branding');
    }
}
