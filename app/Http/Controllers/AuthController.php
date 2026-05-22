<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciais inválidas.'],
            ]);
        }

        $token = $user->createToken('web', ['*'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['ok' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nome' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'telefone' => ['nullable', 'string', 'max:50'],
            'pin' => ['nullable', 'string', 'min:4', 'max:6'],
        ]);

        $user = $request->user();

        DB::transaction(function () use ($user, $data) {
            if (isset($data['nome']) || isset($data['email'])) {
                $user->fill([
                    'name' => $data['nome'] ?? $user->name,
                    'email' => $data['email'] ?? $user->email,
                ])->save();
            }

            $profile = $user->profile;
            if (! $profile) {
                $profile = Profile::create([
                    'user_id' => $user->id,
                    'nome' => $data['nome'] ?? $user->name,
                    'email' => $user->email,
                    'telefone' => $data['telefone'] ?? '',
                    'cargo' => '',
                    'pin' => $data['pin'] ?? '',
                ]);
            } else {
                $profile->fill(array_filter([
                    'nome' => $data['nome'] ?? null,
                    'email' => $data['email'] ?? null,
                    'telefone' => $data['telefone'] ?? null,
                    'pin' => $data['pin'] ?? null,
                ], fn ($v) => $v !== null))->save();
            }
        });

        return response()->json(['user' => $this->userPayload($user->fresh())]);
    }

    public function listUsers(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Apenas admin.'], 403);
        }

        $users = User::with(['profile', 'roles'])->orderBy('name')->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'nome' => $u->profile->nome ?? $u->name,
                'telefone' => $u->profile->telefone ?? null,
                'cargo' => $u->profile->cargo ?? 'funcionario',
                'role' => $u->roles->first()->role ?? 'funcionario',
            ]);

        return response()->json(['users' => $users]);
    }

    public function createUser(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Apenas admin pode cadastrar usuários.'], 403);
        }

        $data = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'senha' => ['required', 'string', 'min:6'],
            'cargo' => ['nullable', 'string', 'max:50'],
            'role' => ['nullable', 'string', 'in:admin,funcionario'],
        ]);

        $user = DB::transaction(function () use ($data) {
            $u = User::create([
                'name' => $data['nome'],
                'email' => $data['email'],
                'password' => Hash::make($data['senha']),
            ]);

            Profile::create([
                'user_id' => $u->id,
                'nome' => $data['nome'],
                'email' => $data['email'],
                'cargo' => $data['cargo'] ?? 'funcionario',
                'telefone' => '',
                'pin' => '',
            ]);

            UserRole::create([
                'user_id' => $u->id,
                'role' => $data['role'] ?? 'funcionario',
            ]);

            return $u;
        });

        return response()->json(['user' => $this->userPayload($user->fresh())], 201);
    }

    public function deleteUser(Request $request, string $id): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Apenas admin.'], 403);
        }
        if ($request->user()->id === $id) {
            return response()->json(['message' => 'Você não pode deletar sua própria conta.'], 422);
        }

        DB::transaction(function () use ($id) {
            UserRole::where('user_id', $id)->delete();
            Profile::where('user_id', $id)->delete();
            User::where('id', $id)->delete();
        });

        return response()->json(['ok' => true]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:6'],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Senha atual incorreta.'],
            ]);
        }

        $user->update(['password' => Hash::make($data['new_password'])]);

        return response()->json(['ok' => true]);
    }

    protected function userPayload(User $user): array
    {
        $user->load(['profile', 'roles']);

        $isAdmin = $user->roles->contains('role', 'admin');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'profile' => $user->profile ? [
                'id' => $user->profile->id,
                'nome' => $user->profile->nome,
                'telefone' => $user->profile->telefone,
                'cargo' => $user->profile->cargo,
                'pin' => $user->profile->pin,
                'avatar_url' => $user->profile->avatar_url,
            ] : null,
            'roles' => $user->roles->pluck('role')->all(),
            'is_admin' => $isAdmin,
            'licenca' => [
                'em_trial' => $user->emTrial(),
                'trial_expirado' => $user->trialExpirado(),
                'dias_restantes' => $user->diasRestantesTrial(),
                'trial_fim' => $user->trial_fim?->toIso8601String(),
                'licenca_ativa' => $user->licenca_ativa,
                'licenca_ate' => $user->licenca_ate?->toIso8601String(),
                'pode_acessar' => $user->podeAcessar(),
            ],
        ];
    }
}
