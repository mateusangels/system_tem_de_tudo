<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Loga 422 (ValidationException) pra ajudar a debugar campos faltando
        $exceptions->report(function (\Illuminate\Validation\ValidationException $e) {
            \Log::warning('[Validation 422] ' . $e->getMessage(), [
                'errors' => $e->errors(),
                'url' => request()?->fullUrl(),
            ]);
        });
    })->create();
