import 'package:flutter_test/flutter_test.dart';
import 'package:secured_guard_app/main.dart';

void main() {
  testWidgets('App starts and shows splash screen', (WidgetTester tester) async {
    await tester.pumpWidget(const SecuredGuardApp());
    expect(find.text('Secured Guard'), findsOneWidget);
    expect(find.text('Promover Vigilância'), findsOneWidget);
  });
}
