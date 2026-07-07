@component('mail::message')
# Verify your email

Hi {{ $recipientName }},

Use the code below to verify your email address and continue your WellnessConnect trainer application.

@component('mail::panel')
<div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; text-align: center;">
{{ $otp }}
</div>
@endcomponent

This code expires in {{ $expiryMinutes }} minutes. If you didn't request this, you can safely ignore this email.

Thanks,<br>
{{ config('app.name') }}
@endcomponent
