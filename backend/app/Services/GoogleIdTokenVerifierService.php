<?php

namespace App\Services;

use App\Contracts\GoogleIdTokenVerifier;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoogleIdTokenVerifierService implements GoogleIdTokenVerifier
{
    private const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
    private const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

    public function verify(string $idToken): array
    {
        $clientId = (string) config('services.google.client_id');
        if ($clientId === '') {
            throw new RuntimeException('Google sign-in is not configured.');
        }

        $keys = JWK::parseKeySet($this->fetchJwks());

        try {
            $payload = JWT::decode($idToken, $keys);
        } catch (\Throwable $exception) {
            throw new RuntimeException('Invalid Google sign-in token.', previous: $exception);
        }

        if (!in_array((string) ($payload->iss ?? ''), self::ISSUERS, true)) {
            throw new RuntimeException('Invalid Google sign-in token issuer.');
        }

        if ((string) ($payload->aud ?? '') !== $clientId) {
            throw new RuntimeException('Google sign-in token was not issued for this application.');
        }

        return [
            'sub' => (string) ($payload->sub ?? ''),
            'email' => strtolower((string) ($payload->email ?? '')),
            'email_verified' => (bool) ($payload->email_verified ?? false),
            'name' => (string) ($payload->name ?? ''),
        ];
    }

    private function fetchJwks(): array
    {
        return Cache::remember('google_oauth_jwks', now()->addHour(), function (): array {
            $response = Http::timeout(5)->get(self::JWKS_URL);
            $response->throw();

            return $response->json();
        });
    }
}
