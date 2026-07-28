# Secured Guard - Aplicativo Mobile (Flutter)

Aplicativo mobile do sistema Secured Guard / Promover Vigilância.

## Pré-requisitos

- [Flutter SDK](https://flutter.dev/docs/get-started/install) 3.2.0+
- Android Studio (SDK 24+)
- Keystore de release (ver seção Assinatura)

## Instalação

```bash
cd mobile
flutter pub get
flutter doctor
```

## Configuração da API

Default de produção em `lib/config/api_config.dart`:

- Produção: `https://app.z7botsolutions.com.br`
- Emulador local: `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8083`

Política de privacidade (Play Console):  
`https://app.z7botsolutions.com.br/politicas-privacidade`

## Assinatura (release)

Arquivos locais (não versionados):

- `android/key.properties`
- `android/app/upload-keystore.jks`

O `build.gradle.kts` usa a config `release` quando `key.properties` existe; caso contrário cai no debug (só para dev).

**Backup:** guarde o `.jks` e as senhas fora do repositório. Perder o keystore impede atualizações no Play com o mesmo `applicationId`.

## Ícones

```bash
dart run flutter_launcher_icons
```

Fonte: `assets/icon/app_icon.png`

## Executar

```bash
# Debug (API local no emulador)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8083

# Release apontando para produção
flutter run --release
```

## Build Google Play (AAB)

```bash
flutter build appbundle --release
```

Artefato: `build/app/outputs/bundle/release/app-release.aab`

### Checklist Play Console

1. Conta Google Play Developer ativa
2. App criado com `applicationId` = `com.z7design.secured_guard_app`
3. Upload do AAB assinado (não usar debug)
4. Store listing: nome **Secured Guard**, ícone 512×512, screenshots
5. Política de privacidade: URL acima
6. **Data safety** — declarar coleta de:
   - Localização (aproximada/precisa) — check-in / ponto
   - Fotos/imagens da câmera — scanner QR
   - Identificadores de conta (login)
7. Conteúdo do app / público-alvo (18+)
8. Target API / políticas de permissões (câmera e localização justificadas)

## Versão

Definida em `pubspec.yaml` (`version: X.Y.Z+build`). Incrementar o `+build` a cada upload no Play.
