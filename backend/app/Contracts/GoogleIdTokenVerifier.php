<?php

namespace App\Contracts;

interface GoogleIdTokenVerifier
{
    /**
     * Verify a Google Identity Services ID token and return its claims.
     *
     * @return array{sub: string, email: string, email_verified: bool, name: string}
     *
     * @throws \RuntimeException if the token is invalid, expired, or not issued for this app.
     */
    public function verify(string $idToken): array;
}
