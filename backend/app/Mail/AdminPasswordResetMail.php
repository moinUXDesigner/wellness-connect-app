<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class AdminPasswordResetMail extends Mailable
{
    public function __construct(
        public readonly string $temporaryPassword,
        public readonly string $recipientName,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your WellnessConnect password has been reset');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.admin-password-reset');
    }
}
