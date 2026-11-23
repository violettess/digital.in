<?php

use App\Models\Application;
use App\Models\Project;
use App\Models\ServiceCategory;
use App\Models\StudentProfile;
use App\Models\University;
use App\Models\User;
use Database\Seeders\PlatformSettingsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * UMKM menyarankan milestone saat posting project (DECISIONS.md: "Milestone saran UMKM").
 * projects.suggested_milestones hanya usulan; milestone kontrak tetap dari lamaran.
 */
class SuggestedMilestonesTest extends TestCase
{
    use RefreshDatabase;

    private User $umkm;

    private User $student;

    private ServiceCategory $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PlatformSettingsSeeder::class);

        $this->category = ServiceCategory::query()->create(['name' => 'Desain', 'slug' => 'desain']);
        $university = University::query()->create([
            'name' => 'Kampus X', 'email_domain' => 'x.ac.id', 'city' => 'Bandung', 'is_partner' => true,
        ]);
        $this->umkm = User::factory()->create(['role' => 'UMKM', 'status' => 'ACTIVE']);
        $this->student = User::factory()->create(['role' => 'STUDENT', 'status' => 'ACTIVE']);
        StudentProfile::query()->create([
            'user_id' => $this->student->id,
            'university_id' => $university->id,
            'verification_status' => 'VERIFIED',
            'is_available' => true,
        ])->skills()->attach($this->category->id, ['level' => 'ADVANCED']);
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('test')->plainTextToken);
    }

    private function payload(array $overrides = []): array
    {
        return array_replace([
            'category_id' => $this->category->id,
            'title' => 'Logo kedai',
            'description' => 'Butuh logo baru.',
            'budget_min' => 500000,
            'budget_max' => 500000,
            'deadline' => now()->addDays(30)->toDateString(),
            'suggested_milestones' => [
                ['title' => 'Konsep', 'amount' => 200000, 'due_date' => now()->addDays(10)->toDateString()],
                ['title' => 'Final', 'amount' => 300000, 'due_date' => now()->addDays(20)->toDateString()],
            ],
        ], $overrides);
    }

    public function test_umkm_can_post_project_with_suggested_milestones(): void
    {
        $id = $this->as($this->umkm)->postJson('/api/v1/projects', $this->payload())
            ->assertCreated()
            ->assertJsonCount(2, 'data.suggested_milestones')
            ->assertJsonPath('data.suggested_milestones.0.title', 'Konsep')
            ->json('data.id');

        $this->as($this->umkm)->postJson("/api/v1/projects/{$id}/publish")->assertOk();

        // Mahasiswa bisa melihat saran milestone di detail project.
        $this->as($this->student)->getJson("/api/v1/projects/{$id}")
            ->assertOk()
            ->assertJsonPath('data.suggested_milestones.1.amount', 300000);
    }

    public function test_suggested_milestones_are_optional(): void
    {
        $payload = $this->payload();
        unset($payload['suggested_milestones']);

        $this->as($this->umkm)->postJson('/api/v1/projects', $payload)
            ->assertCreated()
            ->assertJsonPath('data.suggested_milestones', null);
    }

    public function test_positive_suggested_milestone_amount_below_old_minimum_is_accepted(): void
    {
        $this->as($this->umkm)->postJson('/api/v1/projects', $this->payload([
            'suggested_milestones' => [['title' => 'Nilai kecil', 'amount' => 1]],
        ]))->assertCreated()
            ->assertJsonPath('data.suggested_milestones.0.amount', 1);
    }

    public function test_zero_suggested_milestone_amount_is_rejected(): void
    {
        $this->as($this->umkm)->postJson('/api/v1/projects', $this->payload([
            'suggested_milestones' => [['title' => 'Tanpa nominal', 'amount' => 0]],
        ]))->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED');
    }

    public function test_suggested_milestone_requires_title_and_amount(): void
    {
        $this->as($this->umkm)->postJson('/api/v1/projects', $this->payload([
            'suggested_milestones' => [['amount' => 200000]],
        ]))->assertStatus(422);

        $this->as($this->umkm)->postJson('/api/v1/projects', $this->payload([
            'suggested_milestones' => [['title' => 'Tanpa nominal']],
        ]))->assertStatus(422);
    }

    public function test_past_due_date_is_rejected(): void
    {
        $this->as($this->umkm)->postJson('/api/v1/projects', $this->payload([
            'suggested_milestones' => [['title' => 'Lewat', 'amount' => 200000, 'due_date' => now()->subDay()->toDateString()]],
        ]))->assertStatus(422);
    }

    public function test_project_and_suggested_milestone_due_today_are_accepted(): void
    {
        $today = now()->toDateString();

        $this->as($this->umkm)->postJson('/api/v1/projects', $this->payload([
            'deadline' => $today,
            'suggested_milestones' => [['title' => 'Hari ini', 'amount' => 200000, 'due_date' => $today]],
        ]))->assertCreated();
    }

    public function test_student_apply_without_milestones_uses_umkm_suggestion(): void
    {
        $project = Project::query()->create([
            ...$this->payload(),
            'umkm_id' => $this->umkm->id,
            'status' => 'OPEN',
            'published_at' => now(),
        ]);

        $applicationId = $this->as($this->student)->postJson("/api/v1/projects/{$project->id}/applications", [
            'proposal' => 'Saya siap.',
            'offered_price' => 500000,
            'estimated_days' => 20,
        ])->assertCreated()->json('data.id');

        $milestones = Application::query()->find($applicationId)->proposed_milestones;
        $this->assertCount(2, $milestones);
        $this->assertSame('Konsep', $milestones[0]['title']);
        $this->assertSame(200000, $milestones[0]['amount']);
    }

    public function test_suggestion_must_match_offered_price_when_used_as_default(): void
    {
        $project = Project::query()->create([
            ...$this->payload(),
            'umkm_id' => $this->umkm->id,
            'status' => 'OPEN',
            'published_at' => now(),
        ]);

        // Saran berjumlah 500.000 tapi penawaran 400.000 → aturan total milestone tetap berlaku.
        $this->as($this->student)->postJson("/api/v1/projects/{$project->id}/applications", [
            'proposal' => 'Saya siap.',
            'offered_price' => 400000,
            'estimated_days' => 20,
        ])->assertStatus(422)->assertJsonPath('error.code', 'BUSINESS_RULE_VIOLATION');
    }

    public function test_umkm_can_invite_by_student_profile_id_from_students_list(): void
    {
        $project = Project::query()->create([
            ...$this->payload(), 'umkm_id' => $this->umkm->id, 'status' => 'OPEN', 'published_at' => now(),
        ]);
        $profileId = $this->as($this->umkm)->getJson('/api/v1/students')->assertOk()->json('data.0.id');

        $this->as($this->umkm)->postJson("/api/v1/projects/{$project->id}/invitations", ['student_profile_id' => $profileId])
            ->assertCreated()
            ->assertJsonPath('data.student_id', $this->student->id);
    }

    public function test_invite_with_unknown_profile_or_no_target_is_rejected(): void
    {
        $project = Project::query()->create([
            ...$this->payload(), 'umkm_id' => $this->umkm->id, 'status' => 'OPEN', 'published_at' => now(),
        ]);

        $this->as($this->umkm)->postJson("/api/v1/projects/{$project->id}/invitations", [
            'student_profile_id' => '00000000-0000-0000-0000-000000000000',
        ])->assertStatus(422)->assertJsonPath('error.code', 'BUSINESS_RULE_VIOLATION');

        $this->as($this->umkm)->postJson("/api/v1/projects/{$project->id}/invitations", [])
            ->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED');
    }

    public function test_umkm_can_update_suggested_milestones_while_open(): void
    {
        $project = Project::query()->create([
            ...$this->payload(),
            'umkm_id' => $this->umkm->id,
            'status' => 'OPEN',
            'published_at' => now(),
        ]);

        $this->as($this->umkm)->putJson("/api/v1/projects/{$project->id}", [
            'suggested_milestones' => [['title' => 'Sekaligus', 'amount' => 500000]],
        ])->assertOk()->assertJsonCount(1, 'data.suggested_milestones');
    }
}
