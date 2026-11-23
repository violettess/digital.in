<?php

namespace App\Modules\payment\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Models\Payment;
use App\Modules\payment\Gateway\MockPaymentGateway;
use App\Modules\payment\Gateway\PaymentGateway;
use App\Modules\payment\Services\PaymentService;
use App\Shared\Exceptions\InvalidStateTransition;
use App\Shared\Http\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class PaymentController extends Controller
{
    /** POST /contracts/{id}/payments — UMKM pemilik. Buat tagihan escrow. */
    public function store(Request $request, Contract $contract, PaymentService $payments)
    {
        $input = $request->validate([
            'method' => ['required', Rule::in(PaymentService::METHODS)],
        ]);

        $result = $payments->createEscrowPayment($contract, $request->user(), $input['method'], $request->ip());

        return ApiResponse::success($result['payment'], [], $result['created'] ? 201 : 200);
    }

    /**
     * POST /payments/{id}/mock-complete — UMKM pembayar. Simulasi "bayar" selama belum ada
     * payment gateway asli: mengirim webhook bertanda tangan ke alur webhook yang sama
     * (sama seperti `php artisan payments:mock-pay`). Hanya untuk driver MOCK di luar production;
     * selain itu 404 agar endpoint tidak terlihat.
     */
    public function mockComplete(Request $request, Payment $payment, PaymentGateway $gateway, PaymentService $payments)
    {
        abort_if(app()->isProduction() || ! $gateway instanceof MockPaymentGateway, 404);

        $input = $request->validate(['status' => ['nullable', 'in:PAID,FAILED,EXPIRED']]);

        if ($payment->payer_id !== $request->user()->id) {
            throw new AuthorizationException('Only the payer can complete this payment.');
        }
        if ($payment->status !== 'PENDING' || ! $payment->gateway_ref) {
            throw new InvalidStateTransition('Only pending payments can be completed.', ['status' => $payment->status]);
        }

        $raw = json_encode([
            'gateway_ref' => $payment->gateway_ref,
            'status' => $input['status'] ?? 'PAID',
            'gross_amount' => $payment->total_charged,
        ], JSON_THROW_ON_ERROR);

        $payments->handleWebhook($raw, [MockPaymentGateway::SIGNATURE_HEADER => $gateway->sign($raw)]);

        return ApiResponse::success($payment->fresh());
    }
}
