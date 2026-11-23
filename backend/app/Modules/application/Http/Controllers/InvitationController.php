<?php

namespace App\Modules\application\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Project;
use App\Models\StudentProfile;
use App\Modules\application\Services\InvitationService;
use App\Shared\Exceptions\BusinessRuleViolation;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\Request;

final class InvitationController extends Controller
{
    public function __construct(private readonly InvitationService $invitations) {}

    /**
     * POST /projects/{id}/invitations — UMKM pemilik.
     * Target: `student_id` (users.id, dari rekomendasi) ATAU `student_profile_id`
     * (id dari GET /students — profil publik sengaja tidak mengirim users.id).
     */
    public function invite(Request $request, Project $project)
    {
        $input = $request->validate([
            'student_id' => ['required_without:student_profile_id', 'nullable', 'uuid'],
            'student_profile_id' => ['required_without:student_id', 'nullable', 'uuid'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $studentUserId = $input['student_id']
            ?? StudentProfile::query()->whereKey($input['student_profile_id'])->value('user_id');
        if (! $studentUserId) {
            throw new BusinessRuleViolation('Only active, verified students can be invited.');
        }

        $invitation = $this->invitations->invite($project, $request->user(), $studentUserId, $input['message'] ?? null);

        return ApiResponse::success($invitation, [], 201);
    }

    /** GET /invitations — Mahasiswa. Undangan milik sendiri (default: PENDING yang belum kedaluwarsa). */
    public function mine(Request $request)
    {
        $input = $request->validate(['status' => ['nullable', 'in:PENDING,ACCEPTED,DECLINED,EXPIRED']]);
        $status = $input['status'] ?? 'PENDING';

        $invitations = Invitation::query()
            ->where('student_id', $request->user()->id)
            ->where('status', $status)
            ->when($status === 'PENDING', fn ($query) => $query->where('expires_at', '>', now()))
            ->with(['project:id,umkm_id,category_id,title,description,budget_min,budget_max,deadline,city,status,suggested_milestones',
                'project.umkm:id,name', 'project.category:id,name'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return ApiResponse::success($invitations);
    }

    /** POST /invitations/{id}/accept — Mahasiswa yang diundang. */
    public function accept(Request $request, Invitation $invitation)
    {
        return ApiResponse::success($this->invitations->accept($invitation, $request->user()));
    }

    /** POST /invitations/{id}/decline — Mahasiswa yang diundang. */
    public function decline(Request $request, Invitation $invitation)
    {
        return ApiResponse::success($this->invitations->decline($invitation, $request->user()));
    }
}
