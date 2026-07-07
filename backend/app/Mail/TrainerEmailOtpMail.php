<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class TrainerEmailOtpMail extends Mailable
{
    public function __construct(
        public readonly string $otp,
        public readonly string $recipientName,
        public readonly int $expiryMinutes,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your WellnessConnect verification code');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.trainer-email-otp');
    }
}
