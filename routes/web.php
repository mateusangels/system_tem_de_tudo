<?php

use Illuminate\Support\Facades\Route;

// SPA catch-all: qualquer rota que não seja /api/* serve o React
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api).*$');
