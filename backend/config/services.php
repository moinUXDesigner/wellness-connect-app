<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'razorpay' => [
        'key_id' => env('RAZORPAY_KEY_ID'),
        'key_secret' => env('RAZORPAY_KEY_SECRET'),
        'webhook_secret' => env('RAZORPAY_WEBHOOK_SECRET'),
        'receipt_prefix' => env('MEMBERSHIP_RECEIPT_PREFIX', 'AWC-R'),
        'refund_approval_threshold_minor' => (int) env('REFUND_APPROVAL_THRESHOLD_MINOR', 1000000),
        'free_cancellation_before_hours' => (int) env('FREE_CANCELLATION_BEFORE_HOURS', 24),
    ],

    'trainer_otp' => [
        'code' => env('TRAINER_OTP_DUMMY_CODE', '123456'),
        'expiry_minutes' => (int) env('TRAINER_OTP_EXPIRY_MINUTES', 10),
        'resend_seconds' => (int) env('TRAINER_OTP_RESEND_SECONDS', 60),
        'max_attempts' => (int) env('TRAINER_OTP_MAX_ATTEMPTS', 5),
    ],

    'trainer_email_otp' => [
        'code' => env('TRAINER_EMAIL_OTP_DUMMY_CODE', '123456'),
        'expiry_minutes' => (int) env('TRAINER_EMAIL_OTP_EXPIRY_MINUTES', 10),
        'resend_seconds' => (int) env('TRAINER_EMAIL_OTP_RESEND_SECONDS', 60),
        'max_attempts' => (int) env('TRAINER_EMAIL_OTP_MAX_ATTEMPTS', 5),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
    ],

];
