<?php

namespace Database\Seeders;

use App\Models\ServiceCategory;
use Illuminate\Database\Seeder;

class ServiceCategorySeeder extends Seeder
{
    public const CATEGORIES = [
        'social-media' => 'Social Media',
        'branding' => 'Branding',
        'marketplace' => 'Marketplace',
        'website' => 'Website',
        'digital-bookkeeping' => 'Digital Bookkeeping',
        'graphic-design' => 'Graphic Design',
        'data' => 'Data & Spreadsheet',
        'video' => 'Video',
        'ui-ux' => 'UI/UX',
        'copywriting' => 'Copywriting',
    ];

    public function run(): void
    {
        foreach (self::CATEGORIES as $slug => $name) {
            ServiceCategory::query()->firstOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'is_active' => true],
            );
        }
    }
}
