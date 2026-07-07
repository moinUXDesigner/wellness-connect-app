<?php

namespace App\Providers;

use App\Contracts\GoogleIdTokenVerifier;
use App\Contracts\PaymentGateway;
use App\Contracts\SmsVerificationSender;
use App\Models\User;
use App\Services\DummySmsVerificationSender;
use App\Services\GoogleIdTokenVerifierService;
use App\Services\RazorpayPaymentGateway;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(PaymentGateway::class, RazorpayPaymentGateway::class);
        $this->app->bind(GoogleIdTokenVerifier::class, GoogleIdTokenVerifierService::class);

        if ($this->app->isLocal() || $this->app->environment('testing')) {
            $this->app->bind(SmsVerificationSender::class, DummySmsVerificationSender::class);
        } else {
            // No real SMS provider is wired yet. Fail loudly at boot rather than silently
            // accepting dummy OTPs in production.
            $this->app->bind(SmsVerificationSender::class, function (): never {
                throw new \RuntimeException(
                    'No real SmsVerificationSender is configured for this environment. ' .
                    'Wire a real SMS provider (e.g. Twilio, MSG91) before going live.'
                );
            });
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (User $user, string $token): string {
            $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/');
            $email = urlencode($user->email);

            return "{$frontendUrl}/reset-password?token={$token}&email={$email}";
        });
    }
}
