<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ config('app.name', 'Tem de Tudo') }}</title>
    <meta name="description" content="Tem de Tudo — Sistema de gestão para loja de material de construção, hidráulica e elétrica. PDV, estoque, vendas e clientes em um só lugar.">
    <meta name="author" content="Tem de Tudo">
    <meta name="theme-color" content="#fbbf00">
    <link rel="apple-touch-icon" href="/fundopdv.png">
    <link rel="icon" type="image/png" href="/fundopdv.png">

    <meta name="csrf-token" content="{{ csrf_token() }}">

    {{-- Limpa Service Worker antigo (PWA) que estava servindo bundle ultrapassado --}}
    <script src="/kill-sw.js?v=1"></script>

    @viteReactRefresh
    @vite(['resources/js/main.tsx'])
</head>
<body>
    <div id="root"></div>
</body>
</html>
