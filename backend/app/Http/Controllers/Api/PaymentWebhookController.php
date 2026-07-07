<?php

namespace App\Http\Controllers\Api;

use App\Contracts\PaymentGateway;
use App\Http\Controllers\Controller;
use App\Models\MembershipPayment;
use App\Models\PaymentWebhookEvent;
use App\Services\MembershipBillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    public function __construct(private readonly PaymentGateway $gateway, private readonly MembershipBillingService $billing)
    {
    }

    public function razorpay(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = (string) $request->header('X-Razorpay-Signature', '');
        abort_unless($this->gateway->verifyWebhook($payload, $signature), 403, 'Invalid webhook signature.');
        $data = $request->json()->all();
        $eventId = (string) ($data['id'] ?? hash('sha256', $payload));

        // Only block if the event was fully processed. 'failed' or 'received' events may be retried.
        if (PaymentWebhookEvent::query()->where('external_event_id', $eventId)->where('status', 'processed')->exists()) {
            return response()->json(['message' => 'Webhook already processed.']);
        }

        $event = PaymentWebhookEvent::query()->create([
            'external_event_id' => $eventId,
            'event_type' => (string) ($data['event'] ?? 'unknown'),
            'payload_hash' => hash('sha256', $payload),
            'payload_json' => $data,
            'status' => 'received',
        ]);

        try {
            if (($data['event'] ?? null) === 'payment.captured') {
                $providerOrderId = data_get($data, 'payload.payment.entity.order_id');
                $providerPaymentId = data_get($data, 'payload.payment.entity.id');
                $payment = MembershipPayment::query()->where('provider_order_id', $providerOrderId)->first();
                if ($payment && $providerPaymentId) {
                    $this->billing->activateCapturedPayment($payment, (string) $providerPaymentId);
                }
            }
            $event->update(['status' => 'processed', 'processed_at' => now()]);
        } catch (\Throwable $e) {
            // Mark as failed so Razorpay retries can attempt re-processing.
            $event->update(['status' => 'failed']);
            throw $e;
        }

        return response()->json(['message' => 'Webhook processed.']);
    }
}
