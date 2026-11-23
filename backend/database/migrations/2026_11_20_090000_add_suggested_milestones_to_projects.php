<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * UMKM dapat menyarankan milestone saat memposting project (lihat DECISIONS.md).
 * Disimpan sebagai json [{ title, description?, amount, due_date? }] — hanya usulan,
 * bukan milestone kontrak. Milestone kontrak tetap dibuat dari lamaran mahasiswa.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->json('suggested_milestones')->nullable()->after('city');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('suggested_milestones');
        });
    }
};
