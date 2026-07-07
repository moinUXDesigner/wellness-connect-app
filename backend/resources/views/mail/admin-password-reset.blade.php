@component('mail::message')
# Your password has been reset

Hi {{ $recipientName }},

An administrator has reset your WellnessConnect account password. Use the temporary password below to sign in.

@component('mail::panel')
<div style="font-size: 22px; font-weight: 700; letter-spacing: 4px; text-align: center; font-family: monospace;">
{{ $temporaryPassword }}
</div>
@endcomponent

**Please sign in immediately and change your password** from your account settings. This temporary password should not be shared with anyone.

If you did not expect this change, contact your administrator right away.

Thanks,<br>
{{ config('app.name') }}
@endcomponent
