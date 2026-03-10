# Secured Guard - Aplicativo Mobile (Flutter)

Aplicativo mobile do sistema Secured Guard / Promover Vigilância, desenvolvido em Flutter.

## Pré-requisitos

- [Flutter SDK](https://flutter.dev/docs/get-started/install) 3.2.0 ou superior
- Android Studio / Xcode (para emuladores)
- Dispositivo físico ou emulador configurado

## Instalação

```bash
# Na raiz do projeto
cd mobile

# Gerar pastas android/ios (se não existirem)
flutter create . --project-name secured_guard_app

# Instalar dependências
flutter pub get

# Verificar ambiente
flutter doctor
```

## Executar

```bash
# Modo debug (hot reload)
flutter run

# Android
flutter run -d android

# iOS (apenas macOS)
flutter run -d ios

# Web (preview)
flutter run -d chrome
```

## Estrutura do Projeto

```
mobile/
├── lib/
│   └── main.dart       # Entry point
├── pubspec.yaml        # Dependências
├── README.md
└── analysis_options.yaml
```

## Configuração da API

Edite `lib/config/api_config.dart` (a criar) para apontar para a URL do backend:

- Local: `http://10.0.2.2:8083` (Android emulador)
- Produção: `https://app.z7botsolutions.com.br`

## Build para Produção

```bash
# Android APK
flutter build apk --release

# Android App Bundle (Google Play)
flutter build appbundle --release

# iOS (apenas macOS)
flutter build ios --release
```

## Integração com o Backend

O app consumirá as mesmas APIs REST do frontend web em `/api/*`. Configure autenticação JWT e endpoints conforme a documentação do backend.
